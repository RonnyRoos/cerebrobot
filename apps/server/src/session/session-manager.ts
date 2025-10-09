import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { ChatAgent } from '../chat/chat-agent.js';

export interface ThreadManager {
  issueThread(): Promise<string>;
  resetThread(threadId: string, userId: string): Promise<void>;
}

interface ThreadManagerOptions {
  readonly chatAgent: ChatAgent;
  readonly logger?: Logger;
}

class DefaultThreadManager implements ThreadManager {
  private readonly activeThreads = new Set<string>();

  constructor(private readonly options: ThreadManagerOptions) {}

  public async issueThread(): Promise<string> {
    const threadId = randomUUID();
    this.activeThreads.add(threadId);

    this.options.logger?.info({ threadId }, 'issued new thread identifier');

    return threadId;
  }

  public async resetThread(threadId: string, userId: string): Promise<void> {
    if (!this.activeThreads.has(threadId)) {
      return;
    }

    if (this.options.chatAgent.reset) {
      await this.options.chatAgent.reset(threadId, userId);
    }

    this.activeThreads.delete(threadId);
    this.options.logger?.info({ threadId, userId }, 'reset thread identifier');
  }
}

export function createThreadManager(options: ThreadManagerOptions): ThreadManager {
  return new DefaultThreadManager(options);
}
