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
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { RunnableLambda, type RunnableConfig } from '@langchain/core/runnables';
import type { Logger } from 'pino';
import type { ChatAgent, ChatInvocationContext } from '../chat/chat-agent.js';
import type { ServerConfig } from '../config.js';
import { createCheckpointSaver } from './checkpointer.js';

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

type TiktokenEncoder = {
  encode: (text: string) => number[];
};

type TiktokenModule = {
  encodingForModel: (model: string) => TiktokenEncoder;
  getEncoding: (name: string) => TiktokenEncoder;
};

const tokenizerModuleCache = {
  promise: null as Promise<TiktokenModule | null> | null,
};

const TOKENIZER_CACHE = new Map<string, TiktokenEncoder | null>();
const FALLBACK_ENCODING = 'cl100k_base';
const TOKENS_PER_MESSAGE_OVERHEAD = 4;

async function ensureTiktokenModule(): Promise<TiktokenModule | null> {
  if (tokenizerModuleCache.promise) {
    return tokenizerModuleCache.promise;
  }

  tokenizerModuleCache.promise = import(/* @vite-ignore */ 'js-tiktoken')
    .then(
      (mod) =>
        ({
          encodingForModel: (model: string) => mod.encodingForModel(model as never),
          getEncoding: (name: string) => mod.getEncoding(name as never),
        }) as TiktokenModule,
    )
    .catch((error) => {
      console.warn('js-tiktoken not available; falling back to heuristic token estimation.', error);
      return null;
    });

  return tokenizerModuleCache.promise;
}

async function getTokenizer(model: string): Promise<TiktokenEncoder | null> {
  if (TOKENIZER_CACHE.has(model)) {
    return TOKENIZER_CACHE.get(model) ?? null;
  }

  const module = await ensureTiktokenModule();
  if (!module) {
    TOKENIZER_CACHE.set(model, null);
    return null;
  }

  let tokenizer: TiktokenEncoder;
  try {
    tokenizer = module.encodingForModel(model);
  } catch (error) {
    tokenizer = module.getEncoding(FALLBACK_ENCODING);
  }

  TOKENIZER_CACHE.set(model, tokenizer);
  return tokenizer;
}

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
}

function buildConversationGraph(
  options: LangGraphChatAgentOptions,
  chatModel: ChatOpenAI,
  summarizerModel: ChatOpenAI,
) {
  const { config, logger } = options;
  const hotpathLimit = config.hotpathLimit;
  const hotpathTokenBudget = config.hotpathTokenBudget;

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

    const response = await chatModel.invoke(promptMessages, {
      configurable: { thread_id: state.sessionId },
    });

    return {
      messages: [response],
    } satisfies Partial<ConversationState>;
  }

  const workflow = new StateGraph(ConversationAnnotation)
    .addNode('summarize', RunnableLambda.from(summarize).withConfig({ tags: ['nostream'] }))
    .addNode('callModel', callModel)
    .addEdge(START, 'summarize')
    .addEdge('summarize', 'callModel')
    .addEdge('callModel', END);

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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required to run the chat agent.');
    }

    this.logger = options.logger;

    const chatModel = new ChatOpenAI({
      model: options.config.model,
      temperature: options.config.temperature,
      configuration: {
        baseURL: process.env.OPENAI_API_BASE,
      },
    });

    const summarizerModel = new ChatOpenAI({
      model: options.config.model,
      temperature: 0,
      configuration: {
        baseURL: process.env.OPENAI_API_BASE,
      },
    });

    this.graphContext = buildConversationGraph(options, chatModel, summarizerModel);

    this.logger?.info(
      {
        persistence: options.config.persistence.provider,
        postgresUrl: options.config.persistence.postgres?.url,
      },
      'langgraph checkpointing configured',
    );
  }

  public async *streamChat(context: ChatInvocationContext) {
    const startedAt = Date.now();
    let accumulated = '';

    this.logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
      },
      'invoking langgraph chat agent (stream)',
    );

    const stream = (await this.graphContext.graph.stream(
      {
        sessionId: context.sessionId,
        messages: [new HumanMessage(context.message)],
      },
      this.createConfig(context.sessionId, 'stream'),
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
      this.createConfig(context.sessionId, 'invoke'),
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
    const startedAt = Date.now();
    this.logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
      },
      'invoking langgraph chat agent (complete)',
    );

    const state = (await this.graphContext.graph.invoke(
      {
        sessionId: context.sessionId,
        messages: [new HumanMessage(context.message)],
      },
      this.createConfig(context.sessionId, 'invoke'),
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

  public async reset(sessionId: string): Promise<void> {
    const config = this.createConfig(sessionId, 'invoke');
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

  private createConfig(sessionId: string, mode: 'stream' | 'invoke'): RunnableConfig {
    const base: RunnableConfig = {
      configurable: { thread_id: sessionId },
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
