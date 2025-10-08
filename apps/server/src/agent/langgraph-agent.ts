import {
  AIMessageChunk,
  HumanMessage,
  RemoveMessage,
  isAIMessage,
  isAIMessageChunk,
} from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Logger } from 'pino';
import type { BaseStore } from '@cerebrobot/chat-shared';
import type { ChatAgent, ChatInvocationContext } from '../chat/chat-agent.js';
import type { ServerConfig } from '../config.js';
import { createMemoryStore, loadMemoryConfig } from './memory/index.js';
import { createUpsertMemoryTool } from './memory/tools.js';
import { toStringContent, extractLatestAssistantMessage } from './utils/message-utils.js';
import { formatTokenUsageSnapshot, type TokenUsageSnapshot } from './utils/token-counting.js';
import { type ConversationState, type MessageStream } from './graph/types.js';
import {
  buildConversationGraph,
  type LangGraphChatAgentOptions,
} from './graph/conversation-graph.js';

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

export function createLangGraphChatAgent(
  config: ServerConfig,
  logger?: Logger,
): LangGraphChatAgent {
  return new LangGraphChatAgent({ config, logger });
}
