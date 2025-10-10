import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { ChatAgent } from '../chat/chat-agent.js';

export interface ThreadManager {
  issueThread(): Promise<string>;
  resetThread(threadId: string, userId: string): Promise<void>;
}

interface ThreadManagerOptions {
  readonly getAgent: (agentId?: string) => Promise<ChatAgent>;
  readonly logger?: Logger;
}

/**
 * ThreadManager - Thin wrapper for thread lifecycle operations
 *
 * This is intentionally simple:
 * - Thread creation = UUID generation (no persistence here)
 * - Thread persistence = Handled by LangGraph checkpointer (Postgres)
 * - Thread reset = Delegates to agent to clear checkpoint state
 *
 * Why no in-memory tracking?
 * - Postgres is the source of truth (LangGraph checkpoints)
 * - In-memory state is lost on restart (unreliable)
 * - Adds complexity without value
 */
class DefaultThreadManager implements ThreadManager {
  constructor(private readonly options: ThreadManagerOptions) {}

  public async issueThread(): Promise<string> {
    const threadId = randomUUID();
    this.options.logger?.info({ threadId }, 'issued new thread identifier');
    return threadId;
  }

  public async resetThread(threadId: string, userId: string): Promise<void> {
    const agent = await this.options.getAgent();

    if (agent.reset) {
      await agent.reset(threadId, userId);
      this.options.logger?.info({ threadId, userId }, 'reset thread state');
    } else {
      this.options.logger?.warn({ threadId, userId }, 'agent does not support reset operation');
    }
  }
}

export function createThreadManager(options: ThreadManagerOptions): ThreadManager {
  return new DefaultThreadManager(options);
}
