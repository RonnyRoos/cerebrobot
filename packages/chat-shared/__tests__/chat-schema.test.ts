import { describe, expect, it } from 'vitest';
import { ChatRequestSchema, ChatResponseSchema } from '../src/schemas/chat.js';

describe('ChatRequestSchema', () => {
  it('accepts a minimal valid request payload', () => {
    const payload = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      threadId: 'thread-123',
      message: 'Hello there!',
      clientRequestId: 'req-abc',
    };

    expect(() => ChatRequestSchema.parse(payload)).not.toThrow();
  });

  it('rejects empty message bodies', () => {
    const payload = {
      threadId: 'thread-123',
      message: '',
    };

    const result = ChatRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('ChatResponseSchema', () => {
  it('accepts a response with correlation metadata and latency', () => {
    const payload = {
      threadId: 'thread-123',
      correlationId: 'corr-456',
      message: 'All systems operational.',
      latencyMs: 1234,
      streamed: false,
    };

    expect(() => ChatResponseSchema.parse(payload)).not.toThrow();
  });

  it('rejects responses without correlation identifiers', () => {
    const payload = {
      threadId: 'thread-123',
      message: 'Missing correlation.',
      latencyMs: 1200,
      streamed: true,
    };

    const result = ChatResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects negative latency measurements', () => {
    const payload = {
      threadId: 'thread-123',
      correlationId: 'corr-456',
      message: 'Latencies should be non-negative.',
      latencyMs: -10,
      streamed: true,
    };

    const result = ChatResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
