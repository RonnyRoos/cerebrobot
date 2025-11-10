/**
 * Thread Service
 *
 * Manages conversation thread operations: listing threads and retrieving message history.
 * Uses Prisma for thread discovery and LangGraph checkpointer for state access.
 */

import type {
  BaseCheckpointSaver,
  CheckpointTuple,
  Checkpoint,
} from '@langchain/langgraph-checkpoint';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { BaseMessage } from '@langchain/core/messages';
import { isHumanMessage } from '@langchain/core/messages';
import {
  type ThreadMetadata,
  type MessageHistoryResponse,
  type Message,
  type MessageMetadata,
} from '@cerebrobot/chat-shared';
import type { ConversationState } from '../agent/graph/types.js';

/**
 * LangGraph checkpoint structure
 * The checkpoint contains channel_values which holds the actual graph state
 */
interface LangGraphCheckpoint {
  channel_values: ConversationState;
  channel_versions: Record<string, unknown>;
  v: number;
  id: string;
  ts: string;
}

export interface ThreadService {
  /**
   * List all conversation threads for a user
   * @param userId - User ID to filter threads
   * @param agentId - Optional agent ID to filter threads by specific agent
   * @returns Array of thread metadata sorted by most recent first
   */
  listThreads(userId: string, agentId?: string): Promise<ThreadMetadata[]>;

  /**
   * Get complete message history for a specific thread
   * @param threadId - Thread ID to retrieve
   * @param userId - Optional user ID for authorization check. When omitted, the owner is inferred.
   * @returns Message history response with all messages
   * @throws Error if thread not found or user not authorized
   */
  getThreadHistory(threadId: string, userId?: string): Promise<MessageHistoryResponse>;
}

interface ThreadServiceOptions {
  readonly checkpointer: BaseCheckpointSaver;
  readonly prisma: PrismaClient;
  readonly logger?: Logger;
}

class DefaultThreadService implements ThreadService {
  private static readonly TITLE_MAX_LENGTH = 50;
  private static readonly PREVIEW_MAX_LENGTH = 100;

  constructor(private readonly options: ThreadServiceOptions) {}

  public async listThreads(userId: string, agentId?: string): Promise<ThreadMetadata[]> {
    const { checkpointer, prisma, logger } = this.options;

    logger?.debug({ userId, agentId }, 'Listing threads for user');

    // Step 1: Discover all unique thread IDs from checkpoint table and join with Thread table for agentId
    const threadRecords = await prisma.langGraphCheckpoint.findMany({
      select: {
        threadId: true,
        updatedAt: true,
      },
      distinct: ['threadId'],
      orderBy: {
        updatedAt: 'desc',
      },
    });

    logger?.debug(
      { userId, totalThreads: threadRecords.length },
      'Discovered threads from checkpoint table',
    );

    // Step 2: Fetch Thread metadata (agentId) for all discovered threadIds
    const threadIds = threadRecords.map((r) => r.threadId);
    const threadMetadataRecords = await prisma.thread.findMany({
      where: {
        id: { in: threadIds },
      },
      select: {
        id: true,
        agentId: true,
      },
    });

    // Create a map for quick lookup: threadId -> agentId
    const agentIdMap = new Map<string, string>(
      threadMetadataRecords.map((t: { id: string; agentId: string }) => [t.id, t.agentId]),
    );

    // Step 3: For each thread, get state and filter by userId
    const threads: ThreadMetadata[] = [];
    const errors: Array<{ threadId: string; error: unknown }> = [];

    for (const record of threadRecords) {
      try {
        // Step 2a: Get checkpoint tuple with proper thread_id config
        const config = {
          configurable: {
            thread_id: record.threadId,
            checkpoint_ns: '',
          },
        };

        const tuple = await checkpointer.getTuple(config);

        if (!tuple) {
          logger?.warn({ threadId: record.threadId }, 'No checkpoint tuple found for thread');
          continue;
        }

        // Step 2b: Extract state from checkpoint (already deserialized by getTuple)
        // LangGraph checkpoints have structure: { channel_values, channel_versions, ... }
        // The actual graph state (ConversationState) is stored in channel_values
        const checkpoint = tuple.checkpoint as unknown as LangGraphCheckpoint;
        const channelValues = checkpoint.channel_values;

        // Step 2c: Filter by userId from channel_values (NOT from config.configurable)
        // The userId is stored in the graph state's channel_values
        const checkpointUserId = channelValues.userId;
        if (checkpointUserId !== userId) {
          logger?.trace(
            { threadId: record.threadId, checkpointUserId, requestedUserId: userId },
            'Skipping thread - userId mismatch',
          );
          continue;
        }

        // Step 2d: Get agentId from Thread table
        const threadAgentId = agentIdMap.get(record.threadId);
        if (!threadAgentId) {
          logger?.warn(
            { threadId: record.threadId },
            'No agentId found in Thread table - skipping',
          );
          continue;
        }

        // Step 2e: Validate agentId consistency between checkpoint and thread metadata
        const checkpointAgentId = channelValues.agentId as string | undefined;
        if (checkpointAgentId && checkpointAgentId !== threadAgentId) {
          logger?.warn(
            {
              threadId: record.threadId,
              checkpointAgentId,
              metadataAgentId: threadAgentId,
            },
            'Skipping thread - agentId mismatch between state and metadata',
          );
          continue;
        }

        // Step 2f: Filter by agentId if specified
        if (agentId && threadAgentId !== agentId) {
          logger?.trace(
            { threadId: record.threadId, threadAgentId, requestedAgentId: agentId },
            'Skipping thread - agentId mismatch',
          );
          continue;
        }

        // Step 2g: Derive thread metadata from state
        const metadata = this.deriveThreadMetadata(
          record.threadId,
          userId,
          threadAgentId,
          tuple.checkpoint,
          tuple,
        );
        threads.push(metadata);
      } catch (error) {
        logger?.error(
          {
            threadId: record.threadId,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
          },
          'Error processing thread - skipping',
        );
        errors.push({ threadId: record.threadId, error });
        // Continue processing other threads
      }
    }

    // Log summary if there were errors
    if (errors.length > 0) {
      logger?.warn(
        {
          userId,
          errorCount: errors.length,
          totalAttempted: threadRecords.length,
          successCount: threads.length,
        },
        'Some threads failed to load',
      );
    }

    logger?.info({ userId, threadCount: threads.length }, 'Retrieved threads for user');

    return threads;
  }

  public async getThreadHistory(
    threadId: string,
    userId?: string,
  ): Promise<MessageHistoryResponse> {
    const { checkpointer, logger } = this.options;

    logger?.debug({ threadId, userId }, 'Retrieving thread history');

    // Step 1: Get checkpoint tuple for thread
    const config = {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: '',
      },
    };

    const tuple = await checkpointer.getTuple(config);

    if (!tuple) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    // Step 2: Extract state from checkpoint (already deserialized by getTuple)
    // LangGraph checkpoints have structure: { channel_values, channel_versions, ... }
    // The actual graph state (ConversationState) is stored in channel_values
    const checkpoint = tuple.checkpoint as unknown as LangGraphCheckpoint;
    const channelValues = checkpoint.channel_values;

    // Step 3: Validate userId matches state userId (NOT config.configurable.userId)
    // The userId is stored in the graph state's channel_values
    const checkpointUserId = channelValues.userId;
    if (userId && checkpointUserId !== userId) {
      throw new Error(`Unauthorized: User ${userId} cannot access thread ${threadId}`);
    }

    const checkpointAgentId = channelValues.agentId as string | undefined;
    const threadRecord = await this.options.prisma.thread.findUnique({
      where: { id: threadId },
      select: { agentId: true },
    });

    if (threadRecord && checkpointAgentId && checkpointAgentId !== threadRecord.agentId) {
      throw new Error(
        `Agent mismatch: thread ${threadId} expected agent ${threadRecord.agentId} but checkpoint recorded ${checkpointAgentId}`,
      );
    }

    // Step 4: Extract messages from state
    const messages = this.extractMessages(tuple.checkpoint);

    logger?.info(
      { threadId, resolvedUserId: checkpointUserId, messageCount: messages.length },
      'Retrieved thread history',
    );

    return {
      threadId,
      messages,
    };
  }

  /**
   * Derive thread metadata from checkpoint state
   * @private
   */
  private deriveThreadMetadata(
    threadId: string,
    userId: string,
    agentId: string,
    state: Checkpoint,
    tuple: CheckpointTuple,
  ): ThreadMetadata {
    const messages = this.extractMessages(state);

    // Derive title from first user message
    const firstUserMessage = messages.find((m) => m.role === 'user');
    const title = firstUserMessage
      ? this.truncateText(firstUserMessage.content, DefaultThreadService.TITLE_MAX_LENGTH)
      : 'New Conversation';

    // Get last message details
    const lastMessage = messages[messages.length - 1];
    const lastMessageText = lastMessage
      ? this.truncateText(lastMessage.content, DefaultThreadService.PREVIEW_MAX_LENGTH)
      : '';
    const lastMessageRole = lastMessage?.role ?? 'user';

    // Get timestamps from checkpoint
    const checkpointTs = tuple.checkpoint.ts;
    const createdAt = checkpointTs ? new Date(checkpointTs) : new Date();
    const updatedAt = createdAt; // Use checkpoint timestamp for both

    return {
      threadId,
      userId,
      agentId,
      title,
      lastMessage: lastMessageText,
      lastMessageRole: lastMessageRole as 'user' | 'assistant',
      messageCount: messages.length,
      createdAt,
      updatedAt,
      isEmpty: messages.length === 0,
    };
  }

  /**
   * Extract user-visible messages from checkpoint state
   * Filters out internal system messages and autonomous follow-ups
   * @private
   */
  private extractMessages(state: Checkpoint): Message[] {
    // LangGraph state contains messages array in channel_values
    const channelValues = state.channel_values as Record<string, unknown> | undefined;
    const rawMessages: BaseMessage[] = (channelValues?.messages as BaseMessage[]) ?? [];

    const totalMessages = rawMessages.length;
    let filteredCount = 0;

    const filtered = rawMessages.filter((msg: BaseMessage) => {
      // Filter out system messages (memory injection, etc.) - these are internal only
      const messageType = msg._getType();
      if (messageType !== 'human' && messageType !== 'ai') {
        filteredCount++;
        return false;
      }

      // Filter synthetic messages (autonomous follow-ups) from thread history
      // Why metadata-based: Type-safe detection, no content pattern matching needed
      // Strict check: metadata?.synthetic === true (not just truthy)
      // - Handles undefined/null metadata gracefully
      // - Only filters explicitly marked synthetic messages
      // - Backward compatible: Legacy messages without metadata pass through
      if (isHumanMessage(msg)) {
        const metadata = msg.additional_kwargs as MessageMetadata | undefined;
        if (metadata?.synthetic === true) {
          // DEBUG: Log each filtered message for observability
          // Useful for debugging if autonomous messages unexpectedly appear in UI
          this.options.logger?.debug(
            {
              messageId: msg.id,
              triggerType: metadata.trigger_type,
              triggerReason: metadata.trigger_reason,
            },
            'Filtered synthetic message from thread history',
          );
          filteredCount++;
          return false;
        }
      }

      return true;
    });

    // INFO: Log statistics for monitoring synthetic message prevalence
    // Helps identify if autonomous follow-ups are too frequent/infrequent
    this.options.logger?.info(
      {
        totalMessages,
        filteredCount,
        visibleMessages: filtered.length,
      },
      'Extracted messages from thread checkpoint',
    );

    return filtered.map((msg: BaseMessage, index: number) => ({
      id: msg.id ?? `msg-${index}`,
      role: this.mapMessageRole(msg._getType()),
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: new Date(),
    }));
  }

  /**
   * Map LangChain message types to our Message role
   * @private
   */
  private mapMessageRole(type: string): 'user' | 'assistant' {
    if (type === 'human' || type === 'user') return 'user';
    if (type === 'ai' || type === 'assistant') return 'assistant';
    // Default to assistant for system/tool messages
    return 'assistant';
  }

  /**
   * Truncate text to max length with ellipsis
   * @private
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
}

export function createThreadService(options: ThreadServiceOptions): ThreadService {
  return new DefaultThreadService(options);
}
