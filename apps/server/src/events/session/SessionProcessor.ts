/**
 * SessionProcessor - Orchestrates event → graph → effects flow
 * Core responsibility: Process events by invoking LangGraph and generating effects
 */

import type { ChatAgent } from '../../chat/chat-agent.js';
import type { Event } from '../events/types.js';
import type { OutboxStore } from '../effects/OutboxStore.js';
import type { SessionProcessorConfig } from './types.js';
import { parseSessionKey } from './types.js';
import { createSendMessageEffect } from '../types/effects.schema.js';
import type { Logger } from 'pino';
import type { ConnectionManager } from '../../chat/connection-manager.js';

export class SessionProcessor {
  private readonly agent: ChatAgent;
  private readonly outboxStore: OutboxStore;
  private readonly connectionManager: ConnectionManager;
  private readonly config: SessionProcessorConfig;
  private readonly logger?: Logger;

  constructor(
    agent: ChatAgent,
    outboxStore: OutboxStore,
    connectionManager: ConnectionManager,
    config: SessionProcessorConfig = {},
    logger?: Logger,
  ) {
    this.agent = agent;
    this.outboxStore = outboxStore;
    this.connectionManager = connectionManager;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Process an event by:
   * 1. Extracting userId, agentId, threadId from SESSION_KEY
   * 2. Invoking the graph with streaming
   * 3. Creating send_message effects for each token
   * 4. Saving all effects to the outbox
   */
  async processEvent(event: Event): Promise<void> {
    const { userId, agentId, threadId } = parseSessionKey(event.session_key);

    // Validate event type
    if (event.type !== 'user_message') {
      throw new Error(`Unsupported event type: ${event.type}`);
    }

    const { text } = event.payload;
    const startTime = Date.now();

    this.logger?.info(
      {
        sessionKey: event.session_key,
        eventId: event.id,
        eventSeq: event.seq,
        userId,
        agentId,
        threadId,
      },
      'Processing event',
    );

    // Create AbortController for graph execution timeout
    const abortController = new AbortController();
    const timeoutMs = this.config.graphTimeoutMs ?? 30000;
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      // Declare checkpointId variable
      let checkpointId: string | null = null;

      // Stream the agent's response
      const stream = this.agent.streamChat({
        threadId,
        userId,
        message: text,
        correlationId: event.id,
        signal: abortController.signal,
      });

      // Get active WebSocket connection for direct streaming
      const connectionIds = this.connectionManager.getConnectionsByThread(threadId);
      const hasActiveConnection = connectionIds.length > 0;
      let activeSocket = null;

      if (hasActiveConnection) {
        const connectionId = connectionIds[connectionIds.length - 1];
        const connection = this.connectionManager.get(connectionId);
        activeSocket = connection?.socket;
      }

      let accumulated = '';
      let latencyMs = 0;

      // Process stream and send tokens directly to WebSocket
      for await (const chunk of stream) {
        if (chunk.type === 'token') {
          accumulated += chunk.value;

          // Stream token directly to WebSocket if connected
          if (activeSocket) {
            activeSocket.send(
              JSON.stringify({
                type: 'token',
                requestId: event.payload.requestId,
                value: chunk.value,
              }),
            );
          }
        } else if (chunk.type === 'final') {
          // Capture final metadata
          const finalMessage = accumulated || chunk.message;
          latencyMs = chunk.latencyMs ?? 0;

          // Assign checkpointId before using it
          checkpointId = `${threadId}:${event.seq}`;

          // Send final event to WebSocket if connected
          if (activeSocket) {
            activeSocket.send(
              JSON.stringify({
                type: 'final',
                requestId: event.payload.requestId,
                message: finalMessage,
                latencyMs,
                tokenUsage: chunk.tokenUsage,
              }),
            );
          }

          // Create ONE effect with the complete message
          // This is for reconnection scenarios where WebSocket wasn't active
          const effect = createSendMessageEffect(
            event.session_key,
            checkpointId,
            finalMessage,
            event.payload.requestId,
            0, // Single effect, no sequence needed
            true, // Mark as final
          );

          await this.outboxStore.create({
            sessionKey: effect.session_key,
            checkpointId: effect.checkpoint_id,
            type: effect.type,
            payload: effect.payload,
            dedupeKey: effect.dedupe_key,
          });

          this.logger?.debug(
            {
              sessionKey: event.session_key,
              messageLength: finalMessage.length,
              latencyMs,
            },
            'Stream completed, effect created',
          );
        } else if (chunk.type === 'error') {
          throw new Error(`Agent error: ${chunk.message}`);
        }
      }

      const processingTime = Date.now() - startTime;

      this.logger?.info(
        {
          sessionKey: event.session_key,
          eventId: event.id,
          checkpointId,
          processingTimeMs: processingTime,
        },
        'Event processed successfully',
      );
    } catch (error) {
      clearTimeout(timeoutId);

      // Check if error was due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger?.warn(
          {
            sessionKey: event.session_key,
            eventId: event.id,
            timeoutMs,
          },
          'Event processing timed out',
        );
        throw new Error(`Event processing timed out after ${timeoutMs}ms`);
      }

      this.logger?.error(
        {
          sessionKey: event.session_key,
          eventId: event.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Event processing failed',
      );
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
