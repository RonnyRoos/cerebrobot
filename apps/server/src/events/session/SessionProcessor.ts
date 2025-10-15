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

export class SessionProcessor {
  private readonly agent: ChatAgent;
  private readonly outboxStore: OutboxStore;
  private readonly config: SessionProcessorConfig;
  private readonly logger?: Logger;

  constructor(
    agent: ChatAgent,
    outboxStore: OutboxStore,
    config: SessionProcessorConfig = {},
    logger?: Logger,
  ) {
    this.agent = agent;
    this.outboxStore = outboxStore;
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
      // Stream the agent's response
      const stream = this.agent.streamChat({
        threadId,
        userId,
        message: text,
        correlationId: event.id,
        signal: abortController.signal,
      });

      const effects: Array<ReturnType<typeof createSendMessageEffect>> = [];

      let checkpointId: string | null = null;
      let accumulated = '';

      // Process stream and collect effects
      for await (const chunk of stream) {
        if (chunk.type === 'token') {
          accumulated += chunk.value;

          // Generate effect for this token
          // Note: We'll get checkpointId after streaming completes
          // For now, we use a temporary placeholder
          const effect = createSendMessageEffect(
            event.session_key,
            'PENDING', // Will be updated with actual checkpointId
            chunk.value,
          );

          effects.push(effect);
        } else if (chunk.type === 'final') {
          // Final message may contain the full response if no tokens were streamed
          if (effects.length === 0 && chunk.message) {
            const effect = createSendMessageEffect(event.session_key, 'PENDING', chunk.message);
            effects.push(effect);
          }

          this.logger?.debug(
            {
              sessionKey: event.session_key,
              effectCount: effects.length,
              messageLength: accumulated.length || chunk.message.length,
              latencyMs: chunk.latencyMs,
            },
            'Stream completed',
          );
        } else if (chunk.type === 'error') {
          throw new Error(`Agent error: ${chunk.message}`);
        }
      }

      // Get the checkpoint ID from the graph state
      // Note: In the current architecture, we don't have direct access to the checkpoint ID
      // from the stream. We'll need to modify this once we integrate with the actual graph.
      // For now, we'll use a deterministic checkpoint ID based on the event.
      checkpointId = `${threadId}:${event.seq}`;

      // Update all effects with the actual checkpoint ID and convert to CreateEffect format
      const finalEffects = effects.map((effect) => ({
        sessionKey: effect.session_key,
        checkpointId: checkpointId!,
        type: effect.type as 'send_message',
        payload: effect.payload,
        dedupeKey: effect.dedupe_key,
      }));

      // Atomically save all effects to the outbox
      await Promise.all(finalEffects.map((effect) => this.outboxStore.create(effect)));

      const processingTime = Date.now() - startTime;

      this.logger?.info(
        {
          sessionKey: event.session_key,
          eventId: event.id,
          effectCount: finalEffects.length,
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
