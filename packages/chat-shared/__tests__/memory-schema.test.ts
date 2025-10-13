import { describe, expect, it } from 'vitest';
import {
  MemoryEntrySchema,
  buildAgentMemoryNamespace,
  validateNamespace,
} from '../src/schemas/memory.js';

describe('buildAgentMemoryNamespace', () => {
  it('returns the canonical namespace tuple with agent and user identifiers', () => {
    const namespace = buildAgentMemoryNamespace('agent-123', 'user-456');

    expect(namespace).toEqual(['memories', 'agent-123', 'user-456']);
  });

  it('rejects empty agent identifiers', () => {
    expect(() => buildAgentMemoryNamespace('', 'user-456')).toThrowError(
      /Namespace elements cannot be empty/,
    );
  });

  it('rejects empty user identifiers', () => {
    expect(() => buildAgentMemoryNamespace('agent-123', '')).toThrowError(
      /Namespace elements cannot be empty/,
    );
  });
});

describe('MemoryEntrySchema', () => {
  it('requires namespaces to include memory type, agent id, and user id', () => {
    const parseResult = MemoryEntrySchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      namespace: ['memories', 'agent-123', 'user-456'],
      key: 'preference-theme',
      content: 'User prefers dark mode',
      metadata: { source: 'conversation' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!parseResult.success) {
      // eslint-disable-next-line no-console -- helpful diagnostics when schema expectations drift
      console.error(parseResult.error.issues);
    }

    expect(parseResult.success).toBe(true);
  });

  it('rejects namespaces missing the agent segment', () => {
    const parseResult = MemoryEntrySchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440001',
      namespace: ['memories', 'user-456'],
      key: 'preference-theme',
      content: 'User prefers dark mode',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(parseResult.success).toBe(false);
  });
});

describe('validateNamespace', () => {
  it('accepts namespaces with memory type, agent id, and user id', () => {
    expect(() => validateNamespace(['memories', 'agent-123', 'user-456'])).not.toThrow();
  });

  it('rejects namespaces with fewer than three segments', () => {
    expect(() => validateNamespace(['memories', 'user-456'])).toThrowError(
      /Namespace must have at least 3 elements/,
    );
  });
});
