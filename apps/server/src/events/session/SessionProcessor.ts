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
import type { TimerStore } from '../../autonomy/timers/TimerStore.js';
import { HumanMessage } from '@langchain/core/messages';
import type { AutonomousTriggerType, MessageMetadata } from '@cerebrobot/chat-shared';
import { TRIGGER_PROMPTS } from '@cerebrobot/chat-shared';
import { logMetadataCreation, logTriggerPromptSelection } from '../../lib/logger.js';

export class SessionProcessor {
  private readonly getAgent: (agentId: string) => Promise<ChatAgent>;
  private readonly outboxStore: OutboxStore;
  private readonly connectionManager: ConnectionManager;
  private readonly timerStore?: TimerStore;
  private readonly config: SessionProcessorConfig;
  private readonly logger?: Logger;

  constructor(
    getAgent: (agentId: string) => Promise<ChatAgent>,
    outboxStore: OutboxStore,
    connectionManager: ConnectionManager,
    config: SessionProcessorConfig = {},
    logger?: Logger,
    timerStore?: TimerStore,
  ) {
    this.getAgent = getAgent;
    this.outboxStore = outboxStore;
    this.connectionManager = connectionManager;
    this.timerStore = timerStore;
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

    // Extract message and requestId based on event type
    let message: string | HumanMessage;
    let requestId: string;

    if (event.type === 'user_message') {
      const payload = event.payload as { text: string; requestId: string };
      message = payload.text;
      requestId = payload.requestId;

      // USER STORY 2: Clear all pending timers and effects when user sends message
      // This prevents stale autonomous follow-ups from firing after user has moved on
      if (this.timerStore) {
        const cancelledTimers = await this.timerStore.cancelBySession(event.session_key);
        if (cancelledTimers > 0) {
          this.logger?.debug(
            { sessionKey: event.session_key, count: cancelledTimers },
            'Cancelled pending timers on user message',
          );
        }
      }

      const clearedEffects = await this.outboxStore.clearPendingBySession(event.session_key);
      if (clearedEffects > 0) {
        this.logger?.debug(
          { sessionKey: event.session_key, count: clearedEffects },
          'Cleared pending effects on user message',
        );
      }
    } else if (event.type === 'timer') {
      const payload = event.payload as { timer_id: string; payload?: unknown };
      // US1 + US4: Create HumanMessage with metadata for autonomous triggers
      const timerContext = payload.payload as
        | { followUpType?: string; reason?: string; suggestedMessage?: string }
        | undefined;

      // Map timer event to autonomous trigger type (default: check_in if not specified)
      const triggerType = (timerContext?.followUpType ?? 'check_in') as AutonomousTriggerType;

      // Select natural language prompt based on trigger type
      // Priority: suggestedMessage (evaluator-generated) > reason (context) > TRIGGER_PROMPTS (generic fallback)
      const naturalPrompt =
        (timerContext?.suggestedMessage as string | undefined) ??
        (timerContext?.reason as string | undefined) ??
        TRIGGER_PROMPTS[triggerType];

      // DEBUG: Log trigger type and selected prompt for observability
      if (this.logger) {
        logTriggerPromptSelection(this.logger, {
          operation: 'create',
          threadId,
          context: {
            trigger_type: triggerType,
            selected_prompt: naturalPrompt,
          },
        });
      }

      // Create metadata-tagged autonomous message
      // Why metadata: Type-safe detection (no content pattern matching needed)
      // - synthetic: true → Marks message as agent-initiated (not from user)
      // - trigger_type → Context for why follow-up was triggered
      // - trigger_reason → Optional human-readable explanation
      // This metadata persists through LangGraph checkpoint storage
      const metadata: MessageMetadata = {
        synthetic: true,
        trigger_type: triggerType,
        trigger_reason: timerContext?.reason,
      };

      // HumanMessage (not AIMessage) allows autonomous message to flow through
      // existing conversation logic without requiring special handling
      // additional_kwargs stores metadata for later detection/filtering
      message = new HumanMessage({
        content: naturalPrompt,
        additional_kwargs: metadata,
      });

      requestId = payload.timer_id; // Use timer_id as requestId for correlation

      // DEBUG: Log metadata creation for troubleshooting
      if (this.logger) {
        logMetadataCreation(this.logger, {
          operation: 'create',
          threadId,
          metadata,
        });
      }

      this.logger?.info(
        {
          sessionKey: event.session_key,
          timerId: payload.timer_id,
          triggerType,
          reason: timerContext?.reason,
          naturalPrompt,
        },
        'Processing timer event for autonomous follow-up',
      );
    } else {
      throw new Error(`Unsupported event type: ${event.type}`);
    }

    const startTime = Date.now();

    this.logger?.info(
      {
        sessionKey: event.session_key,
        eventId: event.id,
        eventSeq: event.seq,
        eventType: event.type,
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

      // Get the correct agent for this session
      const agent = await this.getAgent(agentId);

      // Stream the agent's response
      const stream = agent.streamChat({
        threadId,
        userId,
        message,
        correlationId: event.id,
        signal: abortController.signal,
        isUserMessage: event.type === 'user_message', // Reset followUpCount on user messages
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
                requestId,
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
                requestId,
                message: finalMessage,
                latencyMs,
                tokenUsage: chunk.tokenUsage,
              }),
            );
          }

          // Create ONE effect with the complete message
          // If WebSocket was active, mark as 'completed' (already delivered)
          // If no WebSocket, mark as 'pending' (needs async delivery on reconnection)
          const effect = createSendMessageEffect(
            event.session_key,
            checkpointId,
            finalMessage,
            requestId,
            0, // Single effect, no sequence needed
            true, // Mark as final
          );

          await this.outboxStore.create({
            sessionKey: effect.session_key,
            checkpointId: effect.checkpoint_id,
            type: effect.type,
            payload: effect.payload,
            dedupeKey: effect.dedupe_key,
            status: activeSocket ? 'completed' : 'pending', // Set status based on delivery
          });

          // Extract and create any additional effects from graph state (e.g., schedule_timer from autonomy evaluator)
          if (chunk.effects && Array.isArray(chunk.effects)) {
            for (const graphEffect of chunk.effects) {
              // Validate effect structure before creating in outbox
              try {
                // Validate type
                if (!['send_message', 'schedule_timer'].includes(graphEffect.type)) {
                  this.logger?.error(
                    {
                      sessionKey: event.session_key,
                      invalidType: graphEffect.type,
                    },
                    'Invalid effect type from graph, skipping',
                  );
                  continue;
                }

                // Validate payload structure based on type
                if (graphEffect.type === 'schedule_timer') {
                  const payload = graphEffect.payload as Record<string, unknown>;
                  if (!payload?.timer_id || typeof payload.delay_seconds !== 'number') {
                    this.logger?.error(
                      {
                        sessionKey: event.session_key,
                        payload: graphEffect.payload,
                      },
                      'Invalid schedule_timer payload from graph, skipping',
                    );
                    continue;
                  }
                }

                this.logger?.info(
                  {
                    sessionKey: event.session_key,
                    effectType: graphEffect.type,
                    payload: graphEffect.payload,
                  },
                  'Creating effect from graph state',
                );

                await this.outboxStore.create({
                  sessionKey: event.session_key,
                  checkpointId,
                  type: graphEffect.type as 'send_message' | 'schedule_timer',
                  payload: graphEffect.payload as
                    | { content: string; requestId: string; isFinal?: boolean }
                    | { timer_id: string; delay_seconds: number; payload?: unknown },
                  dedupeKey: `${checkpointId}:${graphEffect.type}:${Date.now()}`,
                  status: 'pending',
                });
              } catch (err) {
                this.logger?.error(
                  {
                    err,
                    sessionKey: event.session_key,
                    effectType: graphEffect.type,
                  },
                  'Failed to create effect from graph state',
                );
              }
            }
          }

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

      // Check if error was due to abort (LangGraph throws Error with message "Abort")
      const isAbortError =
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message === 'Abort' ||
          abortController.signal.aborted);

      if (isAbortError) {
        // Calculate how long the request ran before timeout
        const processingTime = Date.now() - startTime;

        // Timer events are best-effort - warn but don't throw
        if (event.type === 'timer') {
          this.logger?.warn(
            {
              sessionKey: event.session_key,
              eventId: event.id,
              eventType: event.type,
              timeoutMs,
              processingTimeMs: processingTime,
              agentId,
              threadId,
            },
            '⏱️ Timer event processing timed out (best-effort delivery, continuing)',
          );
          return; // Exit gracefully - timer delivery is not critical
        }

        // User messages should error on timeout with VERY VISIBLE logging
        this.logger?.error(
          {
            sessionKey: event.session_key,
            eventId: event.id,
            eventType: event.type,
            timeoutMs,
            processingTimeMs: processingTime,
            agentId,
            threadId,
            userId,
          },
          '🚨 Event processing TIMED OUT - likely LLM API hang (DeepInfra)',
        );
        throw new Error(`Event processing timed out after ${timeoutMs}ms`);
      }

      // Non-timeout errors: likely network issues, API errors, or internal failures
      const processingTime = Date.now() - startTime;
      this.logger?.error(
        {
          err: error,
          sessionKey: event.session_key,
          eventId: event.id,
          eventType: event.type,
          processingTimeMs: processingTime,
          agentId,
          threadId,
          userId,
          errorName: error instanceof Error ? error.name : 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        '🚨 Event processing FAILED - LLM API or internal error',
      );
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
