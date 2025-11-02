/**
 * AgentLoader Unit Tests
 * Tests agent loading from database with mocked Prisma client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { AgentLoader } from '../agent-loader.js';

describe('AgentLoader', () => {
  let mockPrisma: PrismaClient;
  let loader: AgentLoader;

  const validAgentConfig = {
    name: 'Test Agent',
    systemPrompt: 'You are a test agent.',
    personaTag: 'test',
    llm: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      apiKey: 'test-key',
      apiBase: 'https://api.test.com/v1',
    },
    memory: {
      hotPathLimit: 10,
      hotPathTokenBudget: 5000,
      recentMessageFloor: 3,
      hotPathMarginPct: 0.1,
      embeddingModel: 'test-embed',
      embeddingEndpoint: 'https://api.test.com/v1/embeddings',
      apiKey: 'test-key',
      similarityThreshold: 0.7,
      maxTokens: 2048,
      injectionBudget: 1000,
      retrievalTimeoutMs: 5000,
    },
    autonomy: {
      enabled: false,
      evaluator: {
        model: 'test-model',
        temperature: 0.3,
        maxTokens: 500,
        systemPrompt: 'Test evaluator',
      },
      limits: {
        maxFollowUpsPerSession: 3,
        minDelayMs: 10000,
        maxDelayMs: 60000,
      },
      memoryContext: {
        recentMemoryCount: 5,
        includeRecentMessages: 6,
      },
    },
  };

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      agent: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;

    loader = new AgentLoader({ prisma: mockPrisma });
  });

  describe('loadAgentConfig', () => {
    it('should load and return agent with metadata', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'Test Agent',
        config: validAgentConfig,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      };

      vi.mocked(mockPrisma.agent.findUnique).mockResolvedValue(mockAgent);

      const result = await loader.loadAgentConfig('agent-123');

      expect(result).toEqual({
        id: 'agent-123',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        ...validAgentConfig,
      });

      expect(mockPrisma.agent.findUnique).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
      });
    });

    it('should throw error when agent not found', async () => {
      vi.mocked(mockPrisma.agent.findUnique).mockResolvedValue(null);

      await expect(loader.loadAgentConfig('nonexistent')).rejects.toThrow(
        'Agent configuration not found: nonexistent',
      );
    });

    it('should throw validation error for invalid config', async () => {
      const invalidAgent = {
        id: 'agent-123',
        name: 'Invalid',
        config: { name: 'Missing fields' }, // Invalid config
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.agent.findUnique).mockResolvedValue(invalidAgent);

      await expect(loader.loadAgentConfig('agent-123')).rejects.toThrow(
        /Agent config validation failed/,
      );
    });

    it('should validate all required config fields', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'Test',
        config: {
          ...validAgentConfig,
          systemPrompt: '', // Invalid - too short
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.agent.findUnique).mockResolvedValue(mockAgent);

      await expect(loader.loadAgentConfig('agent-123')).rejects.toThrow(/systemPrompt/);
    });
  });

  describe('discoverAgentConfigs', () => {
    it('should return array of agent metadata', async () => {
      const mockAgents = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Agent One',
          config: validAgentConfig,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Agent Two',
          config: validAgentConfig,
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
        },
      ];

      vi.mocked(mockPrisma.agent.findMany).mockResolvedValue(mockAgents);

      const result = await loader.discoverAgentConfigs();

      expect(result).toEqual([
        { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Agent One' },
        { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Agent Two' },
      ]);

      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no agents exist', async () => {
      vi.mocked(mockPrisma.agent.findMany).mockResolvedValue([]);

      const result = await loader.discoverAgentConfigs();

      expect(result).toEqual([]);
    });

    it('should throw error for invalid agent metadata', async () => {
      const mockAgents = [
        {
          id: 'not-a-uuid', // Invalid UUID
          name: 'Agent One',
          config: validAgentConfig,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockPrisma.agent.findMany).mockResolvedValue(mockAgents);

      await expect(loader.discoverAgentConfigs()).rejects.toThrow(
        /Agent metadata validation failed/,
      );
    });
  });
});
