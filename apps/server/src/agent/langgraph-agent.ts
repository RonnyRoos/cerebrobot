import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  RemoveMessage,
  SystemMessage,
  isAIMessage,
  isAIMessageChunk,
} from '@langchain/core/messages';
import type { BaseMessage, BaseMessageLike } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { Annotation, MessagesAnnotation, StateGraph, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { RunnableLambda, type RunnableConfig } from '@langchain/core/runnables';
import type { Logger } from 'pino';
import type { MemorySearchResult, UpsertMemoryInput, BaseStore } from '@cerebrobot/chat-shared';
import type { ChatAgent, ChatInvocationContext } from '../chat/chat-agent.js';
import type { ServerConfig } from '../config.js';
import { createCheckpointSaver } from './checkpointer.js';
import { createMemoryStore, loadMemoryConfig } from './memory/index.js';
import { createRetrieveMemoriesNode } from './memory/nodes.js';
import { createUpsertMemoryTool } from './memory/tools.js';
import { getTokenizer, type TiktokenEncoder } from './utils/tiktoken-loader.js';

function toStringContent(content: unknown): string {
  if (content == null) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          return item.text;
        }

        return '';
      })
      .join('');
  }

  if (
    typeof content === 'object' &&
    'text' in content &&
    typeof (content as { text: unknown }).text === 'string'
  ) {
    return (content as { text: string }).text;
  }

  return String(content);
}

const TOKENS_PER_MESSAGE_OVERHEAD = 4;

function countMessageTokens(tokenizer: TiktokenEncoder | null, message: BaseMessage): number {
  const content = toStringContent(message.content);
  const contentTokens = tokenizer
    ? tokenizer.encode(content).length
    : Math.ceil(content.length / 4);
  return contentTokens + TOKENS_PER_MESSAGE_OVERHEAD;
}

async function splitMessagesByBudget(
  messages: BaseMessage[],
  model: string,
  tokenBudget: number,
  maxMessageCount: number,
  minimumRecentMessages: number,
  marginPct: number,
): Promise<{
  recent: BaseMessage[];
  overflow: BaseMessage[];
  overflowTokenCount: number;
  recentTokenCount: number;
}> {
  if (messages.length === 0) {
    return { recent: [], overflow: [], overflowTokenCount: 0, recentTokenCount: 0 };
  }

  const tokenizer = await getTokenizer(model);
  const effectiveMinRecent = Math.max(
    1,
    Math.min(minimumRecentMessages, maxMessageCount, messages.length),
  );

  const adjustedBudget = Math.max(
    0,
    Math.floor(tokenBudget * (1 - Math.min(Math.max(marginPct, 0), 0.9))),
  );
  const effectiveBudget = Math.max(0, Math.min(tokenBudget, adjustedBudget));

  const tokenized = messages.map((message) => ({
    message,
    tokens: countMessageTokens(tokenizer, message),
  }));

  const recent: BaseMessage[] = [];
  let recentTokenCount = 0;

  for (let index = tokenized.length - 1; index >= 0; index -= 1) {
    const entry = tokenized[index];
    const mustKeep = recent.length < effectiveMinRecent;
    const budgetLimit = effectiveBudget > 0 ? effectiveBudget : tokenBudget;
    const wouldExceedBudget = recentTokenCount + entry.tokens > budgetLimit;
    const wouldExceedCount = recent.length >= maxMessageCount;

    if (!mustKeep && (wouldExceedBudget || wouldExceedCount)) {
      const overflowEntries = tokenized.slice(0, index + 1);
      return {
        recent,
        overflow: overflowEntries.map((item) => item.message),
        overflowTokenCount: overflowEntries.reduce((acc, item) => acc + item.tokens, 0),
        recentTokenCount,
      };
    }

    recent.unshift(entry.message);
    recentTokenCount += entry.tokens;
  }

  return {
    recent,
    overflow: [],
    overflowTokenCount: 0,
    recentTokenCount,
  };
}

const ConversationAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  summary: Annotation<string | null>(),
  summaryUpdatedAt: Annotation<string | null>(),
  sessionId: Annotation<string>(),
  tokenUsage: Annotation<{
    recentTokens: number;
    overflowTokens: number;
    budget: number;
  } | null>(),
  // Long-term memory fields
  userId: Annotation<string | undefined>(),
  retrievedMemories: Annotation<MemorySearchResult[] | undefined>(),
  memoryOperations: Annotation<UpsertMemoryInput[] | undefined>(),
});

type ConversationState = typeof ConversationAnnotation.State;

type ConversationMessages = BaseMessage[];

type MessageStream = AsyncGenerator<[BaseMessageLike, unknown]>;

interface TokenUsageSnapshot {
  recentTokens: number;
  overflowTokens: number;
  budget: number;
}

function formatTokenUsageSnapshot(snapshot: TokenUsageSnapshot | null | undefined) {
  if (!snapshot) {
    return undefined;
  }

  const utilisationPct =
    snapshot.budget > 0
      ? Math.min(100, Math.round((snapshot.recentTokens / snapshot.budget) * 100))
      : 0;

  return {
    ...snapshot,
    utilisationPct,
  } as const;
}

interface LangGraphChatAgentOptions {
  readonly config: ServerConfig;
  readonly logger?: Logger;
  readonly checkpointer?: BaseCheckpointSaver;
  readonly memoryStore?: BaseStore;
  readonly memoryTools?: ReturnType<typeof createUpsertMemoryTool>[]; // LangChain tools
}

function buildConversationGraph(
  options: LangGraphChatAgentOptions,
  chatModel: ChatOpenAI,
  summarizerModel: ChatOpenAI,
) {
  const { config, logger, memoryTools } = options;
  const hotpathLimit = config.hotpathLimit;
  const hotpathTokenBudget = config.hotpathTokenBudget;

  // Bind memory tools to chat model if provided
  const modelWithTools =
    memoryTools && memoryTools.length > 0
      ? chatModel.bindTools(memoryTools as Parameters<typeof chatModel.bindTools>[0])
      : chatModel;

  // Log tool binding status
  if (memoryTools && memoryTools.length > 0) {
    logger?.info({ toolCount: memoryTools.length }, 'Tools bound to chat model');
  } else {
    logger?.warn('No tools bound to chat model');
  }

  async function summarize(state: ConversationState) {
    const messages = state.messages as ConversationMessages;
    const { recent, overflow, overflowTokenCount, recentTokenCount } = await splitMessagesByBudget(
      messages,
      config.model,
      hotpathTokenBudget,
      hotpathLimit,
      config.recentMessageFloor,
      config.hotpathMarginPct,
    );

    if (overflow.length === 0) {
      if (recent.length === messages.length) {
        return {
          tokenUsage: {
            recentTokens: recentTokenCount,
            overflowTokens: 0,
            budget: hotpathTokenBudget,
          },
        } satisfies Partial<ConversationState>;
      }

      return {
        messages: recent,
        tokenUsage: {
          recentTokens: recentTokenCount,
          overflowTokens: 0,
          budget: hotpathTokenBudget,
        },
      } satisfies Partial<ConversationState>;
    }

    const messagesToSummarize = overflow;

    const summaryPrompt = state.summary
      ? `This is a summary of the conversation to date: ${state.summary}\n\nExtend the summary by taking into account the new messages above:`
      : 'Create a summary of the conversation above:';

    const summaryMessages: BaseMessageLike[] = [
      ...messagesToSummarize,
      new HumanMessage({ content: summaryPrompt }),
    ];

    const response = await summarizerModel.invoke(summaryMessages, {
      configurable: { thread_id: state.sessionId },
    });
    const summaryText = toStringContent(response.content).trim();
    if (summaryText.length === 0) {
      logger?.info(
        {
          sessionId: state.sessionId,
          trimmedMessages: messagesToSummarize.length,
          trimmedTokens: overflowTokenCount,
          recentTokens: recentTokenCount,
          tokenBudget: hotpathTokenBudget,
          hotpathLimit,
          trimmedContent: messagesToSummarize.map((message) => toStringContent(message.content)),
          summaryPreview: summaryText,
          marginPct: config.hotpathMarginPct,
        },
        'langmem hotpath summarized (empty summary)',
      );
      return {
        messages: recent,
        tokenUsage: {
          recentTokens: recentTokenCount,
          overflowTokens: overflowTokenCount,
          budget: hotpathTokenBudget,
        },
      } satisfies Partial<ConversationState>;
    }

    logger?.info(
      {
        sessionId: state.sessionId,
        trimmedMessages: messagesToSummarize.length,
        trimmedTokens: overflowTokenCount,
        recentTokens: recentTokenCount,
        tokenBudget: hotpathTokenBudget,
        hotpathLimit,
        trimmedContent: messagesToSummarize.map((message) => toStringContent(message.content)),
        summaryText,
        marginPct: config.hotpathMarginPct,
      },
      'langmem hotpath summarized',
    );

    return {
      summary: summaryText,
      summaryUpdatedAt: new Date().toISOString(),
      messages: recent,
      tokenUsage: {
        recentTokens: recentTokenCount,
        overflowTokens: overflowTokenCount,
        budget: hotpathTokenBudget,
      },
    } satisfies Partial<ConversationState>;
  }

  async function callModel(state: ConversationState) {
    const systemMessages: SystemMessage[] = [new SystemMessage(config.systemPrompt)];
    if (config.personaTag.trim().length > 0) {
      systemMessages.push(new SystemMessage(`Persona: ${config.personaTag}`));
    }

    if (state.summary && state.summary.trim().length > 0) {
      systemMessages.push(new SystemMessage(`Conversation summary:\n${state.summary}`));
    }

    const recentMessages = state.messages as ConversationMessages;
    const promptMessages: BaseMessage[] = [...systemMessages, ...recentMessages];

    const response = await modelWithTools.invoke(promptMessages, {
      configurable: { thread_id: state.sessionId },
    });

    // Log if response has tool calls
    const hasToolCalls = (response as { tool_calls?: unknown[] }).tool_calls?.length ?? 0;
    logger?.info(
      { hasToolCalls: hasToolCalls > 0, toolCallCount: hasToolCalls },
      'Model response received',
    );

    return {
      messages: [response],
    } satisfies Partial<ConversationState>;
  }

  // Conditional edge: check if agent made tool calls (standard LangGraph pattern)
  function shouldContinue(state: ConversationState): 'tools' | typeof END {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    logger?.debug(
      {
        lastMessageType: lastMessage?._getType(),
        hasToolCalls: lastMessage && 'tool_calls' in lastMessage,
        messageCount: messages.length,
      },
      'shouldContinue: checking last message',
    );

    // If the LLM makes a tool call, route to the "tools" node
    if (lastMessage && 'tool_calls' in lastMessage) {
      const toolCalls = (lastMessage as { tool_calls?: unknown[] }).tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        logger?.debug({ toolCallCount: toolCalls.length }, 'shouldContinue: routing to tools');
        return 'tools';
      }
    }

    // Otherwise, we end (reply to the user)
    logger?.debug('shouldContinue: routing to END');
    return END;
  }

  const workflow = new StateGraph(ConversationAnnotation)
    .addNode('summarize', RunnableLambda.from(summarize).withConfig({ tags: ['nostream'] }))
    .addNode('callModel', callModel)
    .addEdge(START, 'summarize');

  // Add memory nodes if memory store is available
  if (options.memoryStore && logger && memoryTools && memoryTools.length > 0) {
    try {
      const memoryConfig = loadMemoryConfig();

      // Official LangGraph pattern: use ToolNode for tool execution
      const toolNode = new ToolNode(memoryTools);

      workflow
        .addNode(
          'retrieveMemories',
          createRetrieveMemoriesNode(options.memoryStore, memoryConfig, logger),
        )
        .addNode('tools', toolNode) // ToolNode executes tools and creates ToolMessages
        .addEdge('summarize', 'retrieveMemories')
        .addEdge('retrieveMemories', 'callModel')
        .addConditionalEdges('callModel', shouldContinue) // Route to tools or END
        .addEdge('tools', 'callModel'); // Loop back to agent after tool execution
    } catch (error) {
      logger?.warn({ error }, 'Failed to add memory nodes, using fallback flow');
      workflow.addEdge('summarize', 'callModel').addEdge('callModel', END);
    }
  } else {
    // No memory - use original flow
    workflow.addEdge('summarize', 'callModel').addEdge('callModel', END);
  }

  const checkpointer = options.checkpointer ?? createCheckpointSaver(config);
  const graph = workflow.compile({ checkpointer });

  return {
    graph,
    chatModel,
    summarizerModel,
    config,
    hotpathLimit,
    hotpathTokenBudget,
  };
}

type GraphContext = ReturnType<typeof buildConversationGraph>;

export class LangGraphChatAgent implements ChatAgent {
  private readonly graphContext: GraphContext;
  private readonly logger?: Logger;

  constructor(private readonly options: LangGraphChatAgentOptions) {
    if (!process.env.DEEPINFRA_API_KEY) {
      throw new Error('DEEPINFRA_API_KEY environment variable is required to run the chat agent.');
    }

    this.logger = options.logger;

    const chatModel = new ChatOpenAI({
      model: options.config.model,
      temperature: options.config.temperature,
      apiKey: process.env.DEEPINFRA_API_KEY,
      configuration: {
        baseURL: process.env.DEEPINFRA_API_BASE,
      },
    });

    const summarizerModel = new ChatOpenAI({
      model: options.config.model,
      temperature: 0,
      apiKey: process.env.DEEPINFRA_API_KEY,
      configuration: {
        baseURL: process.env.DEEPINFRA_API_BASE,
      },
    });

    // Initialize memory system if enabled
    let memoryStore: BaseStore | undefined;
    let memoryTools: ReturnType<typeof createUpsertMemoryTool>[] | undefined;

    try {
      const memoryConfig = loadMemoryConfig();
      if (memoryConfig.enabled) {
        memoryStore = createMemoryStore(this.logger ?? (console as unknown as Logger));

        memoryTools = [
          createUpsertMemoryTool(
            memoryStore,
            memoryConfig,
            this.logger ?? (console as unknown as Logger),
          ),
        ];

        this.logger?.info(
          { memoryEnabled: true, toolCount: memoryTools.length },
          'Memory system initialized with tools',
        );
      }
    } catch (error) {
      this.logger?.warn({ error }, 'Memory system disabled due to configuration error');
    }

    this.graphContext = buildConversationGraph(
      { ...options, memoryStore, memoryTools },
      chatModel,
      summarizerModel,
    );

    const persistenceProvider = options.config.persistence.provider;
    this.logger?.info(
      {
        persistenceProvider,
        persistenceConfigured: persistenceProvider === 'postgres',
      },
      'langgraph checkpointing configured',
    );
  }

  public async *streamChat(context: ChatInvocationContext) {
    // CRITICAL: Validate userId is present
    if (!context.userId) {
      const error = new Error('userId is required for all chat operations but was not provided');
      this.logger?.error(
        { sessionId: context.sessionId, correlationId: context.correlationId },
        error.message,
      );
      throw error;
    }

    const startedAt = Date.now();
    let accumulated = '';

    this.logger?.info(
      {
        sessionId: context.sessionId,
        userId: context.userId,
        correlationId: context.correlationId,
      },
      'invoking langgraph chat agent (stream)',
    );

    const stream = (await this.graphContext.graph.stream(
      {
        sessionId: context.sessionId,
        userId: context.userId,
        messages: [new HumanMessage(context.message)],
      },
      this.createConfig(context.sessionId, 'stream', context.userId),
    )) as MessageStream;

    for await (const [message] of stream) {
      const chunkCandidate = message as AIMessageChunk;
      if (isAIMessageChunk(chunkCandidate)) {
        const token = toStringContent(chunkCandidate.content);
        if (token.length === 0) {
          continue;
        }
        accumulated += token;
        yield { type: 'token' as const, value: token };
      } else {
        const messageCandidate = message as BaseMessage;
        if (isAIMessage(messageCandidate)) {
          accumulated = toStringContent(messageCandidate.content).trim();
        }
      }
    }

    const latencyMs = Date.now() - startedAt;

    const finalState = await this.graphContext.graph.getState(
      this.createConfig(context.sessionId, 'invoke', context.userId),
    );
    const usageSnapshot = (finalState.values.tokenUsage as TokenUsageSnapshot | null) ?? null;
    const tokenUsage = formatTokenUsageSnapshot(usageSnapshot);

    this.logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
        latencyMs,
        messageLength: accumulated.length,
        tokenUsage,
      },
      'langgraph chat agent completed response (stream)',
    );

    yield { type: 'final' as const, message: accumulated, latencyMs, tokenUsage };
  }

  public async completeChat(context: ChatInvocationContext) {
    // CRITICAL: Validate userId is present
    if (!context.userId) {
      const error = new Error('userId is required for all chat operations but was not provided');
      this.logger?.error(
        { sessionId: context.sessionId, correlationId: context.correlationId },
        error.message,
      );
      throw error;
    }

    const startedAt = Date.now();
    this.logger?.info(
      {
        sessionId: context.sessionId,
        userId: context.userId,
        correlationId: context.correlationId,
      },
      'invoking langgraph chat agent (complete)',
    );

    const state = (await this.graphContext.graph.invoke(
      {
        sessionId: context.sessionId,
        userId: context.userId,
        messages: [new HumanMessage(context.message)],
      },
      this.createConfig(context.sessionId, 'invoke', context.userId),
    )) as ConversationState;

    const finalMessage = extractLatestAssistantMessage(state.messages);
    const latencyMs = Date.now() - startedAt;
    const tokenUsage = formatTokenUsageSnapshot(state.tokenUsage as TokenUsageSnapshot | null);

    this.logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
        latencyMs,
        messageLength: finalMessage.length,
        tokenUsage,
      },
      'langgraph chat agent completed response (complete)',
    );

    return { message: finalMessage, summary: undefined, latencyMs, tokenUsage };
  }

  public async reset(sessionId: string, userId: string): Promise<void> {
    const config = this.createConfig(sessionId, 'invoke', userId);
    const state = await this.graphContext.graph.getState(config);
    const messages: BaseMessage[] = Array.isArray(state.values.messages)
      ? (state.values.messages as BaseMessage[])
      : [];

    const removeMessages = messages
      .map((message) => message.id)
      .filter((id): id is string => typeof id === 'string')
      .map((id) => new RemoveMessage({ id }));

    await this.graphContext.graph.updateState(config, {
      messages: removeMessages,
      summary: null,
      summaryUpdatedAt: null,
      tokenUsage: null,
    });

    this.logger?.info({ sessionId }, 'langgraph state reset for session');
  }

  private createConfig(
    sessionId: string,
    mode: 'stream' | 'invoke',
    userId: string, // REQUIRED: userId must be provided for all chat operations
  ): RunnableConfig {
    const base: RunnableConfig = {
      configurable: {
        thread_id: sessionId,
        userId, // Pass userId to tools via config.configurable
      },
    };

    if (mode === 'stream') {
      return {
        ...base,
        streamMode: 'messages',
      } as RunnableConfig;
    }

    return base;
  }
}

function extractLatestAssistantMessage(messages: ConversationMessages): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message instanceof AIMessage) {
      return toStringContent(message.content).trim();
    }
  }
  return '';
}

export function createLangGraphChatAgent(
  config: ServerConfig,
  logger?: Logger,
): LangGraphChatAgent {
  return new LangGraphChatAgent({ config, logger });
}
