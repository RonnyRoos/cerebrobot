import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
/**
 * PrismaClient includes generated Thread model after `pnpm exec prisma generate`
 * Run generation after schema changes to ensure Thread type is available.
 */
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
    // Validate that agent configuration exists before creating thread (H2 fix)
    // This prevents orphaned threads with invalid agentIds
    try {
      await this.options.getAgent(agentId);
    } catch (error) {
      this.options.logger?.warn({ agentId, error }, 'Invalid agentId for thread creation');
      throw new Error(`Agent configuration not found: ${agentId}`);
    }

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
    // Load thread to verify it exists and check ownership (H3 fix)
    const thread = await this.getThread(threadId);

    if (!thread) {
      this.options.logger?.warn({ threadId, userId }, 'Thread not found for reset');
      throw new Error(`Thread not found: ${threadId}`);
    }

    // Verify ownership: if thread has a userId, it must match the requester
    // Threads with null userId are considered unowned and can be reset by anyone
    if (thread.userId && thread.userId !== userId) {
      this.options.logger?.warn(
        { threadId, requesterId: userId, ownerId: thread.userId },
        'Unauthorized thread reset attempt',
      );
      throw new Error(`Unauthorized: User ${userId} does not own thread ${threadId}`);
    }

    // Load the correct agent for this thread
    const agent = await this.options.getAgent(thread.agentId);

    if (agent.reset) {
      await agent.reset(threadId, userId);
      this.options.logger?.info(
        { threadId, userId, agentId: thread.agentId },
        'reset thread state',
      );
    } else {
      this.options.logger?.warn(
        { threadId, userId, agentId: thread.agentId },
        'agent does not support reset operation',
      );
    }
  }
}

export function createThreadManager(options: ThreadManagerOptions): ThreadManager {
  return new DefaultThreadManager(options);
}
