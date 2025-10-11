import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage, BaseMessageLike } from '@langchain/core/messages';
import type { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { RunnableLambda } from '@langchain/core/runnables';
import type { Logger } from 'pino';
import type { BaseStore } from '@cerebrobot/chat-shared';
import { loadMemoryConfig } from '../memory/index.js';
import { createRetrieveMemoriesNode } from '../memory/nodes.js';
import type { createUpsertMemoryTool } from '../memory/tools.js';
import { toStringContent } from '../utils/message-utils.js';
import { splitMessagesByBudget } from '../utils/token-counting.js';
import {
  ConversationAnnotation,
  type ConversationState,
  type ConversationMessages,
} from './types.js';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';

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
    const systemMessages: SystemMessage[] = [new SystemMessage(systemPrompt)];
    if (personaTag.trim().length > 0) {
      systemMessages.push(new SystemMessage(`Persona: ${personaTag}`));
    }

    if (state.summary && state.summary.trim().length > 0) {
      systemMessages.push(new SystemMessage(`Conversation summary:\n${state.summary}`));
    }

    const recentMessages = state.messages as ConversationMessages;
    const promptMessages: BaseMessage[] = [...systemMessages, ...recentMessages];

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
