export interface ChatInvocationContext {
  readonly threadId: string;
  readonly userId: string; // REQUIRED: All chats must be tied to a user
  readonly message: string;
  readonly correlationId: string;
  readonly requestId?: string; // WebSocket request correlation ID for multiplexing
  readonly signal?: AbortSignal; // Cancellation signal for aborting streaming
}

export interface TokenUsageEvent {
  readonly recentTokens: number;
  readonly overflowTokens: number;
  readonly budget: number;
  readonly utilisationPct: number;
}

export type AgentStreamEvent =
  | { readonly type: 'token'; readonly value: string }
  | {
      readonly type: 'final';
      readonly message: string;
      readonly summary?: string;
      readonly latencyMs?: number;
      readonly tokenUsage?: TokenUsageEvent;
    }
  | { readonly type: 'error'; readonly message: string; readonly retryable: boolean };

export interface ChatAgent {
  streamChat(context: ChatInvocationContext): AsyncIterable<AgentStreamEvent>;
  completeChat(context: ChatInvocationContext): Promise<{
    message: string;
    summary?: string;
    latencyMs: number;
    tokenUsage?: TokenUsageEvent;
  }>;
  reset?(threadId: string, userId: string): void | Promise<void>;
}
