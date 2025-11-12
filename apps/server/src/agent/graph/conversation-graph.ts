import { HumanMessage, SystemMessage, RemoveMessage } from '@langchain/core/messages';
import type { BaseMessage, BaseMessageLike } from '@langchain/core/messages';
import type { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { RunnableLambda } from '@langchain/core/runnables';
import type { Logger } from 'pino';
import type { BaseStore } from '@cerebrobot/chat-shared';
import type { MemoryConfig } from '../memory/index.js';
import { createRetrieveMemoriesNode } from '../memory/nodes.js';
import type { createUpsertMemoryTool } from '../memory/tools.js';
import { toStringContent } from '../utils/message-utils.js';
import { splitMessagesByBudget, countTokens } from '../utils/token-counting.js';
import {
  ConversationAnnotation,
  type ConversationState,
  type ConversationMessages,
} from './types.js';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import {
  AutonomyEvaluatorNode,
  type AutonomyEvaluatorConfig,
} from '../../graph/nodes/autonomy-evaluator.js';
import type { AgentAutonomyConfig } from '@cerebrobot/chat-shared';

interface LangGraphChatAgentOptions {
  readonly systemPrompt: string;
  readonly personaTag: string;
  readonly model: string;
  readonly hotpathLimit: number;
  readonly hotpathTokenBudget: number;
  readonly recentMessageFloor: number;
  readonly hotpathMarginPct: number;
  readonly logger?: Logger;
  readonly checkpointer?: BaseCheckpointSaver;
  readonly memoryStore?: BaseStore;
  readonly memoryTools?: ReturnType<typeof createUpsertMemoryTool>[]; // LangChain tools
  readonly memoryConfig?: MemoryConfig;
  readonly autonomyConfig?: AgentAutonomyConfig;
  readonly llmApiKey: string;
  readonly llmApiBase: string;
  readonly summarizerModel?: string;
  readonly summarizerTokenBudget?: number;
}

function buildConversationGraph(
  options: LangGraphChatAgentOptions,
  chatModel: ChatOpenAI,
  summarizerModel: ChatOpenAI,
) {
  const {
    systemPrompt,
    personaTag,
    model,
    hotpathLimit,
    hotpathTokenBudget,
    recentMessageFloor,
    hotpathMarginPct,
    logger,
    memoryTools,
  } = options;

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
      model,
      hotpathTokenBudget,
      hotpathLimit,
      recentMessageFloor,
      hotpathMarginPct,
    );

    if (overflow.length === 0) {
      logger?.info(
        {
          recentMessages: recent.length,
          recentTokens: recentTokenCount,
          budget: hotpathTokenBudget,
        },
        '✅ All messages fit in budget - no summarization needed',
      );

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

    // Overflow detected - log before summarization
    logger?.info(
      {
        trimmedMessages: overflow.length,
        trimmedTokens: overflowTokenCount,
        recentMessages: recent.length,
        recentTokens: recentTokenCount,
        budget: hotpathTokenBudget,
      },
      '🔄 Overflow detected - summarization required',
    );

    // Cap overflow sent to summarizer to prevent timeout
    // Even though budget is 10K, we limit summarizer input to 8K for safety margin
    const SUMMARIZER_TOKEN_LIMIT = 8000;
    const { recent: cappedOverflow } = await splitMessagesByBudget(
      overflow,
      summarizerModel.modelName,
      SUMMARIZER_TOKEN_LIMIT,
      0, // No floor, just cap at token limit
      0, // No margin
    );

    const messagesToSummarize = cappedOverflow;

    const summaryPrompt = state.summary
      ? `This is a summary of the conversation to date: ${state.summary}\n\nExtend the summary by taking into account the new messages above:`
      : 'Create a summary of the conversation above:';

    if (!state.summary) {
      logger?.info(
        {
          totalOverflowMessages: overflow.length,
          totalOverflowTokens: overflowTokenCount,
          cappedOverflowMessages: cappedOverflow.length,
          summarizerTokenLimit: SUMMARIZER_TOKEN_LIMIT,
        },
        '📝 Creating NEW summary from overflow (capped for summarizer)',
      );
    } else {
      logger?.info(
        {
          existingSummaryLength: state.summary.length,
          totalOverflowMessages: overflow.length,
          totalOverflowTokens: overflowTokenCount,
          cappedOverflowMessages: cappedOverflow.length,
          summarizerTokenLimit: SUMMARIZER_TOKEN_LIMIT,
          summaryUpdatedAt: state.summaryUpdatedAt,
        },
        '📝 EXTENDING existing summary with overflow (capped for summarizer)',
      );
    }

    const summaryMessages: BaseMessageLike[] = [
      ...messagesToSummarize,
      new HumanMessage({ content: summaryPrompt }),
    ];

    // Log before calling summarizer model
    const summaryMessageTokens = await countTokens(summaryMessages, summarizerModel.modelName);
    logger?.info(
      {
        model: summarizerModel.modelName ?? model,
        summaryMessagesCount: summaryMessages.length,
        summaryMessagesTokens: summaryMessageTokens,
      },
      '🤖 Calling SUMMARIZER model (separate from main LLM)',
    );

    const response = await summarizerModel.invoke(summaryMessages, {
      configurable: { thread_id: state.threadId },
    });
    const summaryText = toStringContent(response.content).trim();
    if (summaryText.length === 0) {
      logger?.info(
        {
          sessionId: state.threadId,
          trimmedMessages: messagesToSummarize.length,
          trimmedTokens: overflowTokenCount,
          recentTokens: recentTokenCount,
          tokenBudget: hotpathTokenBudget,
          hotpathLimit,
          trimmedContent: messagesToSummarize.map((message) => toStringContent(message.content)),
          summaryPreview: summaryText,
          marginPct: hotpathMarginPct,
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
        sessionId: state.threadId,
        trimmedMessages: messagesToSummarize.length,
        trimmedTokens: overflowTokenCount,
        recentTokens: recentTokenCount,
        tokenBudget: hotpathTokenBudget,
        hotpathLimit,
        trimmedContent: messagesToSummarize.map((message) => toStringContent(message.content)),
        summaryText,
        marginPct: hotpathMarginPct,
      },
      'langmem hotpath summarized',
    );

    // CRITICAL: Use RemoveMessage to explicitly delete overflow from state
    // MessagesAnnotation uses addMessages reducer which APPENDS by default
    // Without RemoveMessage, overflow stays in state and gets re-summarized every turn
    const deleteMessages = overflow.map((m) => new RemoveMessage({ id: m.id }));

    // Log overflow removal confirmation
    logger?.info(
      {
        messagesDeleted: overflow.length,
        messagesKept: recent.length,
        summaryLength: summaryText.length,
        summaryTokensApprox: Math.floor(summaryText.length / 4), // rough estimate
      },
      '✂️ Overflow DELETED from state using RemoveMessage - replaced with summary',
    );

    return {
      summary: summaryText,
      summaryUpdatedAt: new Date().toISOString(),
      messages: deleteMessages, // Delete overflow, keep recent
      tokenUsage: {
        recentTokens: recentTokenCount,
        overflowTokens: 0, // After deletion, no overflow remains
        budget: hotpathTokenBudget,
      },
    } satisfies Partial<ConversationState>;
  }

  async function callModel(state: ConversationState) {
    const systemMessages: SystemMessage[] = [new SystemMessage(systemPrompt)];
    if (personaTag.trim().length > 0) {
      systemMessages.push(new SystemMessage(`Persona: ${personaTag}`));
    }

    if (state.summary && state.summary.trim().length > 0) {
      systemMessages.push(new SystemMessage(`Conversation summary:\n${state.summary}`));
    }

    const recentMessages = state.messages as ConversationMessages;
    const promptMessages: BaseMessage[] = [...systemMessages, ...recentMessages];

    // Log token counts before calling main LLM
    const systemTokens = await countTokens(systemMessages, model);
    const recentTokens = await countTokens(recentMessages, model);
    logger?.info(
      {
        systemMessagesCount: systemMessages.length,
        systemTokens, // includes summary if exists
        recentMessagesCount: recentMessages.length,
        recentTokens,
        totalTokens: systemTokens + recentTokens,
        model: 'deepseek-chat',
        hasSummary: !!state.summary,
      },
      '🤖 Calling MAIN LLM (receives summary + recent, NOT overflow)',
    );

    const response = await modelWithTools.invoke(promptMessages, {
      configurable: { thread_id: state.threadId },
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
  function shouldContinue(state: ConversationState): 'tools' | 'evaluateAutonomy' | typeof END {
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

    // If autonomy is enabled, route to evaluator before ending
    if (options.autonomyConfig?.enabled) {
      logger?.debug('shouldContinue: routing to autonomy evaluator');
      return 'evaluateAutonomy';
    }

    // Otherwise, we end (reply to the user)
    logger?.debug('shouldContinue: routing to END');
    return END;
  }

  const workflow = new StateGraph(ConversationAnnotation)
    .addNode('summarize', RunnableLambda.from(summarize).withConfig({ tags: ['nostream'] }))
    .addNode('callModel', callModel)
    .addEdge(START, 'summarize');

  // Add autonomy evaluator node if enabled (add node first, edges later)
  if (options.autonomyConfig?.enabled) {
    const evaluatorConfig: AutonomyEvaluatorConfig = {
      model: options.autonomyConfig.evaluator.model,
      temperature: options.autonomyConfig.evaluator.temperature,
      systemPrompt: options.autonomyConfig.evaluator.systemPrompt,
      apiKey: options.llmApiKey,
      apiBase: options.llmApiBase,
      maxFollowUpsPerSession: options.autonomyConfig.limits.maxFollowUpsPerSession,
    };
    const autonomyEvaluator = new AutonomyEvaluatorNode(evaluatorConfig, logger);
    workflow.addNode('evaluateAutonomy', async (state: ConversationState) => {
      return await autonomyEvaluator.evaluate(state);
    });
  }

  // Add memory nodes if memory store is available
  if (options.memoryStore && logger && memoryTools && memoryTools.length > 0) {
    try {
      if (!options.memoryConfig) {
        throw new Error('Memory config is required when memory store is enabled');
      }

      // Official LangGraph pattern: use ToolNode for tool execution
      const toolNode = new ToolNode(memoryTools);

      workflow
        .addNode(
          'retrieveMemories',
          createRetrieveMemoriesNode(options.memoryStore, options.memoryConfig, logger),
        )
        .addNode('tools', toolNode) // ToolNode executes tools and creates ToolMessages
        .addEdge('summarize', 'retrieveMemories')
        .addEdge('retrieveMemories', 'callModel')
        .addConditionalEdges('callModel', shouldContinue) // Route to tools, evaluateAutonomy, or END
        .addEdge('tools', 'callModel'); // Loop back to agent after tool execution
    } catch (error) {
      logger?.warn({ error }, 'Failed to add memory nodes, using fallback flow');
      workflow.addEdge('summarize', 'callModel').addConditionalEdges('callModel', shouldContinue);
    }
  } else {
    // No memory - use original flow
    workflow.addEdge('summarize', 'callModel').addConditionalEdges('callModel', shouldContinue);
  }

  // Add edge from autonomy evaluator to END (after nodes are set up)
  if (options.autonomyConfig?.enabled) {
    // Type cast needed because TypeScript can't infer conditional node additions
    (workflow as typeof workflow).addEdge('evaluateAutonomy' as never, END);
  }

  // Checkpointer must be provided by caller
  if (!options.checkpointer) {
    throw new Error('Checkpointer is required for conversation graph');
  }

  const graph = workflow.compile({ checkpointer: options.checkpointer });

  return {
    graph,
    chatModel,
    summarizerModel,
    hotpathLimit,
    hotpathTokenBudget,
  };
}

export { buildConversationGraph };
export type { LangGraphChatAgentOptions };
