import { describe, expect, it, vi } from 'vitest';
import { MemorySaver } from '@langchain/langgraph-checkpoint';

vi.mock('@prisma/client', () => {
  class PrismaClientMock {
    public readonly langGraphCheckpoint = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    };

    public readonly langGraphCheckpointWrite = {
      upsert: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    };
  }

  return {
    PrismaClient: PrismaClientMock,
  };
});

import { createCheckpointSaver } from '../checkpointer.js';
import type { ServerConfig } from '../../config.js';
import { PostgresCheckpointSaver } from '../postgres-checkpoint.js';

describe('createCheckpointSaver', () => {
  const baseConfig = {
    systemPrompt: 'prompt',
    personaTag: 'persona',
    model: 'model',
    temperature: 0.2,
    hotpathLimit: 4,
    recentMessageFloor: 2,
    hotpathTokenBudget: 1024,
    hotpathMarginPct: 0.1,
    port: 0,
  } as const;

  it('returns a MemorySaver when persistence is memory', () => {
    const saver = createCheckpointSaver({
      ...baseConfig,
      persistence: { provider: 'memory' },
    } satisfies ServerConfig);

    expect(saver).toBeInstanceOf(MemorySaver);
  });

  it('returns a PostgresCheckpointSaver when persistence is postgres', () => {
    const saver = createCheckpointSaver({
      ...baseConfig,
      persistence: {
        provider: 'postgres',
        postgres: {
          url: 'postgresql://example',
          schema: 'langgraph',
        },
      },
    } satisfies ServerConfig);

    expect(saver).toBeInstanceOf(PostgresCheckpointSaver);
  });

  it('reuses saver instances for identical configuration', () => {
    const first = createCheckpointSaver({
      ...baseConfig,
      persistence: {
        provider: 'postgres',
        postgres: {
          url: 'postgresql://example',
        },
      },
    } satisfies ServerConfig);

    const second = createCheckpointSaver({
      ...baseConfig,
      persistence: {
        provider: 'postgres',
        postgres: {
          url: 'postgresql://example',
        },
      },
    } satisfies ServerConfig);

    expect(first).toBe(second);
  });
});
