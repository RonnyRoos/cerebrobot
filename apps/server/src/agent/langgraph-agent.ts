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
import {
  Annotation,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
  START,
  END,
} from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Logger } from 'pino';
import type { ChatAgent, ChatInvocationContext } from '../chat/chat-agent.js';
import type { ServerConfig } from '../config.js';

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

const ConversationAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  summary: Annotation<string | null>(),
  summaryUpdatedAt: Annotation<string | null>(),
  sessionId: Annotation<string>(),
});

type ConversationState = typeof ConversationAnnotation.State;

type ConversationMessages = BaseMessage[];

type StreamMessage = AIMessageChunk | BaseMessage;

type MessageStream = AsyncGenerator<[StreamMessage, unknown]>;

interface LangGraphChatAgentOptions {
  readonly config: ServerConfig;
  readonly logger?: Logger;
  readonly checkpointer?: MemorySaver;
}

function buildConversationGraph(
  options: LangGraphChatAgentOptions,
  chatModel: ChatOpenAI,
  summarizerModel: ChatOpenAI,
) {
  const { config, logger } = options;
  const hotpathLimit = config.hotpathLimit;

  async function summarize(state: ConversationState) {
    const messages = state.messages as ConversationMessages;
    const overflow = messages.length - hotpathLimit;
    if (overflow <= 0) {
      return {};
    }

    const messagesToSummarize = messages.slice(0, overflow);

    if (messagesToSummarize.length === 0) {
      return {};
    }

    const summaryPrompt = state.summary
      ? `This is a summary of the conversation to date: ${state.summary}\n\nExtend the summary by taking into account the new messages above:`
      : 'Create a summary of the conversation above:';

    const summaryMessages: BaseMessageLike[] = [
      ...messagesToSummarize,
      new HumanMessage({ content: summaryPrompt }),
    ];

    const response = await summarizerModel.invoke(summaryMessages);
    const summaryText = toStringContent(response.content).trim();
    const trimmedMessageIds = messagesToSummarize
      .map((message) => message.id)
      .filter((id): id is string => typeof id === 'string');

    const removeMessages = trimmedMessageIds.map((id) => new RemoveMessage({ id }));

    if (summaryText.length === 0) {
      return {
        messages: removeMessages,
      } satisfies Partial<ConversationState>;
    }

    logger?.info(
      {
        sessionId: state.sessionId,
        trimmedMessages: messagesToSummarize.length,
        hotpathLimit,
      },
      'langmem hotpath summarized',
    );

    return {
      summary: summaryText,
      summaryUpdatedAt: new Date().toISOString(),
      messages: removeMessages,
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
    .addNode('summarize', summarize)
    .addNode('callModel', callModel)
    .addEdge(START, 'summarize')
    .addEdge('summarize', 'callModel')
    .addEdge('callModel', END);

  const checkpointer = options.checkpointer ?? new MemorySaver();
  const graph = workflow.compile({ checkpointer });

  return {
    graph,
    chatModel,
    summarizerModel,
    config,
    hotpathLimit,
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
      if (isAIMessageChunk(message as AIMessageChunk)) {
        const token = toStringContent((message as AIMessageChunk).content);
        if (token.length === 0) {
          continue;
        }
        accumulated += token;
        yield { type: 'token' as const, value: token };
      } else if (isAIMessage(message as BaseMessage)) {
        accumulated = toStringContent((message as BaseMessage).content).trim();
      }
    }

    const latencyMs = Date.now() - startedAt;

    this.logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
        latencyMs,
        messageLength: accumulated.length,
      },
      'langgraph chat agent completed response (stream)',
    );

    yield { type: 'final' as const, message: accumulated, latencyMs };
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

    this.logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
        latencyMs,
        messageLength: finalMessage.length,
      },
      'langgraph chat agent completed response (complete)',
    );

    return { message: finalMessage, summary: undefined, latencyMs };
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
