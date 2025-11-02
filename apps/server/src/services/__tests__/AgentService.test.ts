/**
 * AgentService Unit Tests
 * Tests agent CRUD operations with mocked Prisma client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { AgentService } from '../AgentService.js';
import type { AgentConfig } from '@cerebrobot/chat-shared';

describe('AgentService', () => {
  let mockPrisma: PrismaClient;
  let service: AgentService;

  const validAgentConfig: AgentConfig = {
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
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;

    service = new AgentService(mockPrisma);
  });

  describe('listAgents', () => {
    it('should return list of agent items', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent One',
          config: validAgentConfig,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        {
          id: 'agent-2',
          name: 'Agent Two',
          config: validAgentConfig,
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
        },
      ];

      vi.mocked(mockPrisma.agent.findMany).mockResolvedValue(mockAgents);

      const result = await service.listAgents();

      expect(result).toEqual([
        {
          id: 'agent-1',
          name: 'Agent One',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          autonomyEnabled: false,
        },
        {
          id: 'agent-2',
          name: 'Agent Two',
          createdAt: '2025-01-02T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          autonomyEnabled: false,
        },
      ]);

      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          config: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no agents exist', async () => {
      vi.mocked(mockPrisma.agent.findMany).mockResolvedValue([]);

      const result = await service.listAgents();

      expect(result).toEqual([]);
    });
  });

  describe('getAgentById', () => {
    it('should return agent with full config', async () => {
      const mockAgent = {
        id: 'agent-123',
        name: 'Test Agent',
        config: validAgentConfig,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      };

      vi.mocked(mockPrisma.agent.findUnique).mockResolvedValue(mockAgent);

      const result = await service.getAgentById('agent-123');

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

    it('should return null when agent not found', async () => {
      vi.mocked(mockPrisma.agent.findUnique).mockResolvedValue(null);

      const result = await service.getAgentById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createAgent', () => {
    it('should create agent with validated config', async () => {
      const mockCreatedAgent = {
        id: 'new-agent',
        name: 'Test Agent',
        config: validAgentConfig,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      vi.mocked(mockPrisma.agent.create).mockResolvedValue(mockCreatedAgent);

      const result = await service.createAgent(validAgentConfig);

      expect(result).toEqual({
        id: 'new-agent',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        ...validAgentConfig,
      });

      expect(mockPrisma.agent.create).toHaveBeenCalledWith({
        data: {
          name: validAgentConfig.name,
          config: validAgentConfig,
        },
      });
    });

    it('should throw validation error for invalid config', async () => {
      const invalidConfig = {
        name: 'X', // Too short
        systemPrompt: 'Test',
      } as unknown as AgentConfig;

      await expect(service.createAgent(invalidConfig)).rejects.toThrow();
    });

    it('should propagate database errors', async () => {
      vi.mocked(mockPrisma.agent.create).mockRejectedValue(new Error('Database error'));

      await expect(service.createAgent(validAgentConfig)).rejects.toThrow('Database error');
    });
  });

  describe('updateAgent', () => {
    it('should update agent config', async () => {
      const updatedConfig: AgentConfig = {
        ...validAgentConfig,
        systemPrompt: 'Updated prompt',
      };

      const mockUpdatedAgent = {
        id: 'agent-123',
        name: 'Test Agent',
        config: updatedConfig,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      };

      vi.mocked(mockPrisma.agent.update).mockResolvedValue(mockUpdatedAgent);

      const result = await service.updateAgent('agent-123', updatedConfig);

      expect(result).toEqual({
        id: 'agent-123',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        ...updatedConfig,
      });

      expect(mockPrisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: {
          name: updatedConfig.name,
          config: updatedConfig,
        },
      });
    });

    it('should throw validation error for invalid update', async () => {
      const invalidConfig = {
        name: '',
        systemPrompt: 'Test',
      } as unknown as AgentConfig;

      await expect(service.updateAgent('agent-123', invalidConfig)).rejects.toThrow();
    });

    it('should propagate not found error', async () => {
      vi.mocked(mockPrisma.agent.update).mockRejectedValue(new Error('Record to update not found'));

      await expect(service.updateAgent('nonexistent', validAgentConfig)).rejects.toThrow(
        'Record to update not found',
      );
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent by id', async () => {
      // Mock the transaction to execute the callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockPrisma.$transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          thread: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          agent: {
            delete: vi.fn().mockResolvedValue({
              id: 'agent-123',
              name: 'Deleted Agent',
              config: validAgentConfig,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        };
        return callback(mockTx);
      });

      await service.deleteAgent('agent-123');

      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });

    it('should propagate not found error', async () => {
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(
        new Error('Record to delete does not exist'),
      );

      await expect(service.deleteAgent('nonexistent')).rejects.toThrow(
        'Record to delete does not exist',
      );
    });
  });
});
