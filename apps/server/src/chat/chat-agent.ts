import type { ServerConfig } from '../config.js';

export interface ChatInvocationContext {
  readonly sessionId: string;
  readonly message: string;
  readonly correlationId: string;
  readonly config: ServerConfig;
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
  completeChat(
    context: ChatInvocationContext,
  ): Promise<{
    message: string;
    summary?: string;
    latencyMs: number;
    tokenUsage?: TokenUsageEvent;
  }>;
  reset?(sessionId: string): void | Promise<void>;
}
