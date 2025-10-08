import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import type { BaseMessage, BaseMessageLike } from '@langchain/core/messages';
import type { MemorySearchResult, UpsertMemoryInput } from '@cerebrobot/chat-shared';

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

export { ConversationAnnotation };
export type { ConversationState, ConversationMessages, MessageStream };
