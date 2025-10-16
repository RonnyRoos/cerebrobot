/**
 * SessionProcessor Unit Tests
 * Tests event processing orchestration: event → agent → effects
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { SessionProcessor } from '../../events/session/SessionProcessor.js';
import type { OutboxStore } from '../../events/effects/OutboxStore.js';
import type { Event } from '../../events/events/types.js';
import type { ChatAgent, AgentStreamEvent } from '../../chat/chat-agent.js';
import type { ConnectionManager } from '../../chat/connection-manager.js';
import { SessionKeySchema } from '../../events/types/events.schema.js';
import type { SendMessagePayload } from '../../events/types/effects.schema.js';

describe('SessionProcessor', () => {
  let sessionProcessor: SessionProcessor;
  let mockAgent: ChatAgent;
  let mockOutboxStore: OutboxStore;
  let createdEffects: Array<{
    sessionKey: string;
    checkpointId: string;
    type: string;
    payload: SendMessagePayload;
    dedupeKey: string;
  }>;

  const SESSION_KEY = SessionKeySchema.parse('user1:agent1:thread1');

  beforeEach(() => {
    createdEffects = [];

    // Mock OutboxStore
    mockOutboxStore = {
      create: vi.fn(async (effect) => {
        createdEffects.push(effect);
        return {
          id: `effect-${createdEffects.length}`,
          session_key: effect.sessionKey,
          checkpoint_id: effect.checkpointId,
          type: effect.type,
          payload: effect.payload,
          dedupe_key: effect.dedupeKey,
          status: 'pending' as const,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }),
    } as unknown as OutboxStore;

    // Mock ChatAgent with streamChat generator
    mockAgent = {
      streamChat: vi.fn(),
    } as unknown as ChatAgent;

    // Mock ConnectionManager
    const mockConnectionManager = {
      getConnectionsByThread: vi.fn(() => []),
      get: vi.fn(() => null),
    } as unknown as ConnectionManager;

    sessionProcessor = new SessionProcessor(mockAgent, mockOutboxStore, mockConnectionManager);
  });

  const createEvent = (text: string, seq = 1): Event => ({
    id: `event-${seq}`,
    session_key: SESSION_KEY,
    seq,
    type: 'user_message',
    payload: { text, requestId: crypto.randomUUID() },
    created_at: new Date(),
  });

  async function* mockStreamResponse(tokens: string[]): AsyncGenerator<AgentStreamEvent> {
    for (const token of tokens) {
      yield { type: 'token', value: token };
    }
    yield {
      type: 'final',
      message: tokens.join(''),
      latencyMs: 100,
      tokenUsage: { recentTokens: 10, overflowTokens: 0, budget: 1000, utilisationPct: 1 },
    };
  }

  describe('processEvent', () => {
    it('should parse SESSION_KEY and invoke agent with correct context', async () => {
      vi.mocked(mockAgent.streamChat).mockReturnValue(mockStreamResponse(['Hello']));

      const event = createEvent('Test message');
      await sessionProcessor.processEvent(event);

      expect(mockAgent.streamChat).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread1',
          userId: 'user1',
          message: 'Test message',
          correlationId: event.id,
        }),
      );
    });

    it('should create single effect with complete message', async () => {
      vi.mocked(mockAgent.streamChat).mockReturnValue(
        mockStreamResponse(['Hello', ' ', 'world', '!']),
      );

      const event = createEvent('Say hello');
      await sessionProcessor.processEvent(event);

      // Should create 1 effect with complete message
      expect(createdEffects.length).toBe(1);
      expect(createdEffects[0].payload.content).toBe('Hello world!');
      expect(createdEffects[0].payload.isFinal).toBe(true);
    });

    it('should set checkpointId on effect', async () => {
      vi.mocked(mockAgent.streamChat).mockReturnValue(mockStreamResponse(['token1', 'token2']));

      const event = createEvent('Test', 42);
      await sessionProcessor.processEvent(event);

      expect(createdEffects.length).toBe(1);
      expect(createdEffects[0].checkpointId).toBe('thread1:42');
      expect(createdEffects[0].payload.content).toBe('token1token2');
    });

    it('should handle empty token stream with final message', async () => {
      async function* emptyTokenStream(): AsyncGenerator<AgentStreamEvent> {
        yield {
          type: 'final',
          message: 'Complete response',
          latencyMs: 100,
          tokenUsage: { recentTokens: 5, overflowTokens: 0, budget: 1000, utilisationPct: 1 },
        };
      }

      vi.mocked(mockAgent.streamChat).mockReturnValue(emptyTokenStream());

      const event = createEvent('Quick response');
      await sessionProcessor.processEvent(event);

      // Should create one effect with the complete message
      expect(createdEffects.length).toBe(1);
      expect(createdEffects[0].payload.content).toBe('Complete response');
    });

    it('should throw error for unsupported event type', async () => {
      const invalidEvent = {
        ...createEvent('test'),
        type: 'unknown_type' as unknown as 'user_message',
      };

      await expect(sessionProcessor.processEvent(invalidEvent)).rejects.toThrow(
        /Unsupported event type/,
      );
    });

    it('should handle agent errors', async () => {
      async function* errorStream(): AsyncGenerator<AgentStreamEvent> {
        yield { type: 'error', message: 'Agent failed', retryable: false };
      }

      vi.mocked(mockAgent.streamChat).mockReturnValue(errorStream());

      const event = createEvent('Cause error');

      await expect(sessionProcessor.processEvent(event)).rejects.toThrow('Agent error');
    });

    it('should save effect after streaming completes', async () => {
      vi.mocked(mockAgent.streamChat).mockReturnValue(mockStreamResponse(['a', 'b', 'c']));

      const event = createEvent('Test');
      await sessionProcessor.processEvent(event);

      // Should create one effect with complete message
      expect(mockOutboxStore.create).toHaveBeenCalledTimes(1);
      expect(createdEffects[0].payload.content).toBe('abc');
    });

    it('should use event ID as correlationId', async () => {
      vi.mocked(mockAgent.streamChat).mockReturnValue(mockStreamResponse(['test']));

      const event = createEvent('Message');
      await sessionProcessor.processEvent(event);

      expect(mockAgent.streamChat).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: event.id,
        }),
      );
    });
  });

  describe('timeout handling', () => {
    it('should abort stream after timeout', async () => {
      async function* slowStream(options: {
        signal?: AbortSignal;
      }): AsyncGenerator<AgentStreamEvent> {
        yield { type: 'token', value: 'start' };
        // Simulate slow response
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 200);
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('Aborted'));
            });
          }
        });
        yield { type: 'token', value: 'end' };
      }

      vi.mocked(mockAgent.streamChat).mockImplementation(
        slowStream as unknown as () => AsyncGenerator<AgentStreamEvent>,
      );

      const mockConnectionManager = {
        getConnectionsByThread: vi.fn(() => []),
        get: vi.fn(() => null),
      } as unknown as ConnectionManager;

      const fastProcessor = new SessionProcessor(
        mockAgent,
        mockOutboxStore,
        mockConnectionManager,
        {
          graphTimeoutMs: 50, // Very short timeout
        },
      );

      const event = createEvent('Slow message');

      await expect(fastProcessor.processEvent(event)).rejects.toThrow();
    }, 10000);
  });
});
