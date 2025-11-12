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
import type { Agent } from '@cerebrobot/chat-shared';
import type { ConnectionManager } from '../chat/connection-manager.js';
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
  private readonly agentId: string;

  constructor(
    agent: Agent, // Agent config WITH id/timestamps from database
    logger?: Logger,
    checkpointer?: BaseCheckpointSaver,
    connectionManager?: ConnectionManager,
  ) {
    this.logger = logger;
    this.checkpointer = checkpointer;
    this.agentId = agent.id;

    // Use agent config directly - no environment variable fallbacks
    const apiKey = agent.llm.apiKey;
    const apiBase = agent.llm.apiBase;
    const model = agent.llm.model;
    const temperature = agent.llm.temperature;

    if (!apiKey) {
      throw new Error(`Agent config "${agent.id}" is missing llm.apiKey. API key is required.`);
    }

    const chatModel = new ChatOpenAI({
      model,
      temperature,
      apiKey,
      configuration: {
        baseURL: apiBase,
      },
    });

    // Use agent.summarizer config with fallback to main LLM (T017)
    const summarizerModel = new ChatOpenAI({
      model: agent.summarizer?.model ?? model,
      temperature: agent.summarizer?.temperature ?? 0,
      apiKey: agent.summarizer?.apiKey ?? apiKey,
      configuration: {
        baseURL: agent.summarizer?.apiBase ?? apiBase,
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
        apiKey: agent.llm.apiKey,
        embeddingEndpoint: agent.memory.embeddingEndpoint,
        embeddingModel: agent.memory.embeddingModel,
        similarityThreshold: agent.memory.similarityThreshold,
        contentMaxTokens: agent.memory.maxTokens,
        injectionBudget: agent.memory.injectionBudget,
        retrievalTimeoutMs: agent.memory.retrievalTimeoutMs,
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
            connectionManager,
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
        systemPrompt: agent.systemPrompt,
        personaTag: agent.personaTag,
        model: agent.llm.model,
        hotpathLimit: agent.memory.hotPathLimit,
        hotpathTokenBudget: agent.memory.hotPathTokenBudget,
        recentMessageFloor: agent.memory.recentMessageFloor,
        hotpathMarginPct: agent.memory.hotPathMarginPct,
        logger: this.logger,
        checkpointer: this.checkpointer,
        memoryStore,
        memoryTools,
        memoryConfig,
        autonomyConfig: agent.autonomy,
        llmApiKey: agent.llm.apiKey,
        llmApiBase: agent.llm.apiBase,
        summarizerModel: agent.summarizer?.model,
        summarizerTokenBudget: agent.summarizer?.tokenBudget,
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
        { threadId: context.threadId, correlationId: context.correlationId, agentId: this.agentId },
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
        agentId: this.agentId,
      },
      'invoking langgraph chat agent (stream)',
    );

    // T009-T010: Handle both string and HumanMessage inputs
    const messageInput = this.convertToHumanMessage(context.message);

    // CRITICAL: Check if message already exists in state (retry scenario)
    // On retry, EventQueue re-processes same event, but checkpoint already has the message
    // Adding it again creates duplicates in conversation history
    let shouldAddMessage = true;
    try {
      const currentState = await this.graphContext.graph.getState(
        this.createConfig(context.threadId, 'stream', context.userId, context.signal),
      );

      if (currentState?.values?.messages) {
        const messages = currentState.values.messages as BaseMessage[];
        const messageContent =
          typeof context.message === 'string' ? context.message : context.message.content;

        // Check if this exact message content already exists in recent messages
        // Compare last 3 messages to detect retry duplicates
        const recentMessages = messages.slice(-3);
        const isDuplicate = recentMessages.some(
          (msg) => msg.content === messageContent && msg._getType() === 'human',
        );

        if (isDuplicate) {
          shouldAddMessage = false;
          this.logger?.info(
            {
              threadId: context.threadId,
              messagePreview:
                typeof messageContent === 'string'
                  ? messageContent.substring(0, 50)
                  : '[non-string content]',
            },
            '🔄 Message already in state (retry detected) - resuming from checkpoint',
          );
        }
      }
    } catch (error) {
      // If getState fails, proceed with adding message (safer than skipping)
      this.logger?.warn(
        { threadId: context.threadId, error },
        'Failed to check state for duplicate message, proceeding with add',
      );
    }

    let stream: MessageStream;
    try {
      stream = (await this.graphContext.graph.stream(
        shouldAddMessage
          ? {
              threadId: context.threadId,
              userId: context.userId,
              agentId: this.agentId,
              messages: [messageInput],
              // CRITICAL: Clear effects at the start of each new event processing
              // Effects should be ephemeral per invocation, not accumulate across turns
              effects: [],
              // CRITICAL: Reset followUpCount on user messages to allow new autonomous follow-ups
              // Autonomous messages (timer-triggered) should NOT reset the counter
              ...(context.isUserMessage ? { followUpCount: 0 } : {}),
            }
          : {
              // Retry: Don't add message again, just resume from checkpoint
              threadId: context.threadId,
              userId: context.userId,
              agentId: this.agentId,
              messages: [], // Empty - don't add duplicate
              effects: [],
              ...(context.isUserMessage ? { followUpCount: 0 } : {}),
            },
        this.createConfig(context.threadId, 'stream', context.userId, context.signal),
      )) as MessageStream;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.logger?.error(
        {
          error,
          threadId: context.threadId,
          correlationId: context.correlationId,
          agentId: this.agentId,
          durationMs,
          model: this.graphContext.graph.name ?? 'unknown',
        },
        '🚨 LLM API call failed to initialize stream',
      );
      throw error;
    }

    try {
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
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const isAbortError =
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message === 'Abort' ||
          context.signal?.aborted === true);

      if (isAbortError) {
        this.logger?.error(
          {
            threadId: context.threadId,
            correlationId: context.correlationId,
            agentId: this.agentId,
            durationMs,
            accumulatedTokens: accumulated.length,
          },
          '🚨 LLM API stream timed out or was aborted (likely API hang)',
        );
      } else {
        this.logger?.error(
          {
            error,
            threadId: context.threadId,
            correlationId: context.correlationId,
            agentId: this.agentId,
            durationMs,
            accumulatedTokens: accumulated.length,
          },
          '🚨 LLM API stream failed with error',
        );
      }
      throw error;
    }

    const latencyMs = Date.now() - startedAt;

    const finalState = await this.graphContext.graph.getState(
      this.createConfig(context.threadId, 'invoke', context.userId, context.signal),
    );
    const usageSnapshot = (finalState.values.tokenUsage as TokenUsageSnapshot | null) ?? null;
    const tokenUsage = formatTokenUsageSnapshot(usageSnapshot);

    // Extract effects from final graph state
    const effects = finalState.values.effects as
      | Array<{ type: string; payload: unknown }>
      | undefined;

    this.logger?.info(
      {
        threadId: context.threadId,
        correlationId: context.correlationId,
        latencyMs,
        messageLength: accumulated.length,
        tokenUsage,
        effectsCount: effects?.length ?? 0,
        agentId: this.agentId,
      },
      'langgraph chat agent completed response (stream)',
    );

    yield { type: 'final' as const, message: accumulated, latencyMs, tokenUsage, effects };
  }

  /**
   * Convert message input to HumanMessage, preserving metadata
   *
   * Accepts both string and HumanMessage inputs to support:
   * - User messages: Passed as strings from API endpoints
   * - Autonomous messages: Created as HumanMessage with metadata by SessionProcessor
   *
   * Why preserve metadata: Autonomous messages carry additional_kwargs.synthetic flag
   * which is needed for downstream detection (memory retrieval, thread filtering).
   * Simply returning existing HumanMessage preserves this metadata through LangGraph.
   */
  private convertToHumanMessage(message: string | HumanMessage): HumanMessage {
    if (typeof message === 'string') {
      // User message: Create new HumanMessage from string content
      return new HumanMessage(message);
    }
    // Already a HumanMessage with potential metadata - pass through
    return message;
  }

  public async completeChat(context: ChatInvocationContext) {
    // CRITICAL: Validate userId is present
    if (!context.userId) {
      const error = new Error('userId is required for all chat operations but was not provided');
      this.logger?.error(
        { threadId: context.threadId, correlationId: context.correlationId, agentId: this.agentId },
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
        agentId: this.agentId,
      },
      'invoking langgraph chat agent (complete)',
    );

    const state = (await this.graphContext.graph.invoke(
      {
        threadId: context.threadId,
        userId: context.userId,
        agentId: this.agentId,
        messages: [new HumanMessage(context.message)],
        // CRITICAL: Clear effects at the start of each new event processing
        // Effects should be ephemeral per invocation, not accumulate across turns
        effects: [],
        // CRITICAL: Reset followUpCount on user messages to allow new autonomous follow-ups
        // Autonomous messages (timer-triggered) should NOT reset the counter
        ...(context.isUserMessage ? { followUpCount: 0 } : {}),
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
        agentId: this.agentId,
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

    this.logger?.info({ threadId, agentId: this.agentId }, 'langgraph state reset for thread');
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
        agentId: this.agentId,
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
  agent: Agent, // Agent with id/timestamps from database
  logger?: Logger,
  checkpointer?: BaseCheckpointSaver,
  connectionManager?: ConnectionManager,
): LangGraphChatAgent {
  return new LangGraphChatAgent(agent, logger, checkpointer, connectionManager);
}
