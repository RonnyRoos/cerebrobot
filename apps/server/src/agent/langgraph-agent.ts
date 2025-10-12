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
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { Logger } from 'pino';
import type { BaseStore } from '@cerebrobot/chat-shared';
import type { ChatAgent, ChatInvocationContext } from '../chat/chat-agent.js';
import type { AgentConfig } from '../config/agent-config.js';
import { createMemoryStore } from './memory/index.js';
import { createUpsertMemoryTool } from './memory/tools.js';
import { toStringContent, extractLatestAssistantMessage } from './utils/message-utils.js';
import { formatTokenUsageSnapshot, type TokenUsageSnapshot } from './utils/token-counting.js';
import { type ConversationState, type MessageStream } from './graph/types.js';
import { buildConversationGraph } from './graph/conversation-graph.js';

type GraphContext = ReturnType<typeof buildConversationGraph>;

export class LangGraphChatAgent implements ChatAgent {
  private readonly graphContext: GraphContext;
  private readonly logger?: Logger;
  private readonly checkpointer?: BaseCheckpointSaver;

  constructor(
    agentConfig: AgentConfig, // Agent config from JSON
    logger?: Logger,
    checkpointer?: BaseCheckpointSaver,
  ) {
    this.logger = logger;
    this.checkpointer = checkpointer;

    // Use agent config directly - no environment variable fallbacks
    const apiKey = agentConfig.llm.apiKey;
    const apiBase = agentConfig.llm.apiBase;
    const model = agentConfig.llm.model;
    const temperature = agentConfig.llm.temperature;

    if (!apiKey) {
      throw new Error(
        `Agent config "${agentConfig.id}" is missing llm.apiKey. API key is required.`,
      );
    }

    const chatModel = new ChatOpenAI({
      model,
      temperature,
      apiKey,
      configuration: {
        baseURL: apiBase,
      },
    });

    const summarizerModel = new ChatOpenAI({
      model,
      temperature: 0,
      apiKey,
      configuration: {
        baseURL: apiBase,
      },
    });

    // Initialize memory system if enabled
    let memoryStore: BaseStore | undefined;
    let memoryTools: ReturnType<typeof createUpsertMemoryTool>[] | undefined;
    let memoryConfig:
      | {
          enabled: boolean;
          apiKey: string;
          embeddingEndpoint: string;
          embeddingModel: string;
          similarityThreshold: number;
          contentMaxTokens: number;
          injectionBudget: number;
          retrievalTimeoutMs: number;
        }
      | undefined;

    try {
      // Use agent config for memory (no .env fallback)
      memoryConfig = {
        enabled: true,
        apiKey: agentConfig.llm.apiKey,
        embeddingEndpoint: agentConfig.memory.embeddingEndpoint,
        embeddingModel: agentConfig.memory.embeddingModel,
        similarityThreshold: agentConfig.memory.similarityThreshold,
        contentMaxTokens: agentConfig.memory.maxTokens,
        injectionBudget: agentConfig.memory.injectionBudget,
        retrievalTimeoutMs: agentConfig.memory.retrievalTimeoutMs,
      };

      if (memoryConfig.enabled) {
        // Pass agent-specific memory config as override
        memoryStore = createMemoryStore(
          this.logger ?? (console as unknown as Logger),
          memoryConfig,
        );

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
      {
        // Pass agent config values directly (no ServerConfig object)
        systemPrompt: agentConfig.systemPrompt,
        personaTag: agentConfig.personaTag,
        model: agentConfig.llm.model,
        hotpathLimit: agentConfig.memory.hotPathLimit,
        hotpathTokenBudget: agentConfig.memory.hotPathTokenBudget,
        recentMessageFloor: agentConfig.memory.recentMessageFloor,
        hotpathMarginPct: agentConfig.memory.hotPathMarginPct,
        logger: this.logger,
        checkpointer: this.checkpointer,
        memoryStore,
        memoryTools,
        memoryConfig,
      },
      chatModel,
      summarizerModel,
    );
  }

  public async *streamChat(context: ChatInvocationContext) {
    // CRITICAL: Validate userId is present
    if (!context.userId) {
      const error = new Error('userId is required for all chat operations but was not provided');
      this.logger?.error(
        { threadId: context.threadId, correlationId: context.correlationId },
        error.message,
      );
      throw error;
    }

    const startedAt = Date.now();
    let accumulated = '';

    this.logger?.info(
      {
        threadId: context.threadId,
        userId: context.userId,
        correlationId: context.correlationId,
      },
      'invoking langgraph chat agent (stream)',
    );

    const stream = (await this.graphContext.graph.stream(
      {
        threadId: context.threadId,
        userId: context.userId,
        messages: [new HumanMessage(context.message)],
      },
      this.createConfig(context.threadId, 'stream', context.userId, context.signal),
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
      this.createConfig(context.threadId, 'invoke', context.userId, context.signal),
    );
    const usageSnapshot = (finalState.values.tokenUsage as TokenUsageSnapshot | null) ?? null;
    const tokenUsage = formatTokenUsageSnapshot(usageSnapshot);

    this.logger?.info(
      {
        threadId: context.threadId,
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
        { threadId: context.threadId, correlationId: context.correlationId },
        error.message,
      );
      throw error;
    }

    const startedAt = Date.now();
    this.logger?.info(
      {
        threadId: context.threadId,
        userId: context.userId,
        correlationId: context.correlationId,
      },
      'invoking langgraph chat agent (complete)',
    );

    const state = (await this.graphContext.graph.invoke(
      {
        threadId: context.threadId,
        userId: context.userId,
        messages: [new HumanMessage(context.message)],
      },
      this.createConfig(context.threadId, 'invoke', context.userId, context.signal),
    )) as ConversationState;

    const finalMessage = extractLatestAssistantMessage(state.messages);
    const latencyMs = Date.now() - startedAt;
    const tokenUsage = formatTokenUsageSnapshot(state.tokenUsage as TokenUsageSnapshot | null);

    this.logger?.info(
      {
        threadId: context.threadId,
        correlationId: context.correlationId,
        latencyMs,
        messageLength: finalMessage.length,
        tokenUsage,
      },
      'langgraph chat agent completed response (complete)',
    );

    return { message: finalMessage, summary: undefined, latencyMs, tokenUsage };
  }

  public async reset(threadId: string, userId: string): Promise<void> {
    const config = this.createConfig(threadId, 'invoke', userId);
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

    this.logger?.info({ threadId }, 'langgraph state reset for thread');
  }

  private createConfig(
    threadId: string,
    mode: 'stream' | 'invoke',
    userId: string, // REQUIRED: userId must be provided for all chat operations
    signal?: AbortSignal,
  ): RunnableConfig {
    const base: RunnableConfig = {
      configurable: {
        thread_id: threadId,
        userId, // Pass userId to tools via config.configurable
      },
    };

    if (signal) {
      base.signal = signal;
    }

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
  agentConfig: AgentConfig, // Agent config from JSON file
  logger?: Logger,
  checkpointer?: BaseCheckpointSaver,
): LangGraphChatAgent {
  return new LangGraphChatAgent(agentConfig, logger, checkpointer);
}
