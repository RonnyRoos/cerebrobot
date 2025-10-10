import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { PrismaClient } from '@prisma/client';
import type { ChatAgent } from '../chat/chat-agent.js';

export interface ThreadManager {
  issueThread(agentId: string, userId?: string): Promise<string>;
  getThread(
    threadId: string,
  ): Promise<{ id: string; agentId: string; userId: string | null } | null>;
  resetThread(threadId: string, userId: string): Promise<void>;
}

interface ThreadManagerOptions {
  readonly prisma: PrismaClient;
  readonly getAgent: (agentId?: string) => Promise<ChatAgent>;
  readonly logger?: Logger;
}

/**
 * ThreadManager - Thread lifecycle operations with DB persistence
 *
 * Responsibilities:
 * - Thread creation: Generate UUID + store thread metadata (agentId, userId) in DB
 * - Thread retrieval: Load thread metadata from DB
 * - Thread reset: Delegate to agent to clear LangGraph checkpoint state
 *
 * Thread metadata stored in threads table:
 * - id: UUID primary key
 * - agentId: Which agent config this thread uses
 * - userId: Optional user association
 * - createdAt: Timestamp
 *
 * LangGraph conversation state stored separately in LangGraphCheckpoint tables
 */
class DefaultThreadManager implements ThreadManager {
  constructor(private readonly options: ThreadManagerOptions) {}

  public async issueThread(agentId: string, userId?: string): Promise<string> {
    const threadId = randomUUID();

    await this.options.prisma.thread.create({
      data: {
        id: threadId,
        agentId,
        userId: userId ?? null,
      },
    });

    this.options.logger?.info({ threadId, agentId, userId }, 'created thread with metadata');
    return threadId;
  }

  public async getThread(
    threadId: string,
  ): Promise<{ id: string; agentId: string; userId: string | null } | null> {
    const thread = await this.options.prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, agentId: true, userId: true },
    });

    return thread;
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
