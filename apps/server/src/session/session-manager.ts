import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { ChatAgent } from '../chat/chat-agent.js';

export interface SessionManager {
  issueSession(): Promise<string>;
  resetSession(sessionId: string): Promise<void>;
}

interface SessionManagerOptions {
  readonly chatAgent: ChatAgent;
  readonly logger?: Logger;
}

class DefaultSessionManager implements SessionManager {
  private readonly activeSessions = new Set<string>();

  constructor(private readonly options: SessionManagerOptions) {}

  public async issueSession(): Promise<string> {
    const sessionId = randomUUID();
    this.activeSessions.add(sessionId);

    if (this.options.chatAgent.reset) {
      await this.options.chatAgent.reset(sessionId);
    }

    this.options.logger?.info({ sessionId }, 'issued new session identifier');

    return sessionId;
  }

  public async resetSession(sessionId: string): Promise<void> {
    if (!this.activeSessions.has(sessionId)) {
      return;
    }

    if (this.options.chatAgent.reset) {
      await this.options.chatAgent.reset(sessionId);
    }

    this.activeSessions.delete(sessionId);
    this.options.logger?.info({ sessionId }, 'reset session identifier');
  }
}

export function createSessionManager(options: SessionManagerOptions): SessionManager {
  return new DefaultSessionManager(options);
}
