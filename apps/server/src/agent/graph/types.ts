import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import type { BaseMessage, BaseMessageLike } from '@langchain/core/messages';
import type { MemorySearchResult, UpsertMemoryInput } from '@cerebrobot/chat-shared';

const ConversationAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  summary: Annotation<string | null>(),
  summaryUpdatedAt: Annotation<string | null>(),
  threadId: Annotation<string>(),
  tokenUsage: Annotation<{
    recentTokens: number;
    overflowTokens: number;
    budget: number;
  } | null>(),
  // Long-term memory fields
  agentId: Annotation<string | undefined>(),
  userId: Annotation<string | undefined>(),
  retrievedMemories: Annotation<MemorySearchResult[] | undefined>(),
  memoryOperations: Annotation<UpsertMemoryInput[] | undefined>(),
  // Autonomy follow-up counter (per session/thread)
  followUpCount: Annotation<number | undefined>(),
  // Autonomy effects (spec 009)
  // Effects emitted by nodes (e.g., schedule_timer, send_message)
  // Reducer appends effects from nodes within a SINGLE graph invocation
  // Effects should be CLEARED at the start of each new event processing (in SessionProcessor)
  /**
   * Effects to be executed after graph completion (timers, notifications, etc.)
   * Nodes can append effects that will be processed by the effect runner
   */
  effects: Annotation<Array<{ type: string; payload: unknown }> | undefined>({
    reducer: (current, update) => {
      // Explicit empty array means CLEAR (start of new invocation)
      if (Array.isArray(update) && update.length === 0) return [];
      // APPEND strategy: allows multiple nodes (agent + evaluator) to contribute
      // effects within a single graph invocation
      if (!update) return current;
      if (!current) return update;
      return [...current, ...update];
    },
  }),
});

type ConversationState = typeof ConversationAnnotation.State;

type ConversationMessages = BaseMessage[];

type MessageStream = AsyncGenerator<[BaseMessageLike, unknown]>;

export { ConversationAnnotation };
export type { ConversationState, ConversationMessages, MessageStream };
