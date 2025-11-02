/**
 * Agent Routes Unit Tests
 * Tests HTTP endpoints with mocked Prisma client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { registerAgentRoutes } from '../routes.js';
import type { Agent, AgentConfig, AgentListItem } from '@cerebrobot/chat-shared';

describe('Agent Routes', () => {
  let app: FastifyInstance;
  let mockPrisma: PrismaClient;

  const mockAgentConfig: AgentConfig = {
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

  const mockAgent: Agent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    ...mockAgentConfig,
  };

  beforeEach(async () => {
    app = Fastify();

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

    // Register routes with mocked Prisma
    registerAgentRoutes(app, mockPrisma);
  });

  describe('GET /api/agents', () => {
    it('should return list of agents', async () => {
      const mockAgents = [
        {
          id: mockAgent.id,
          name: mockAgent.name,
          config: mockAgentConfig,
          createdAt: new Date(mockAgent.createdAt),
          updatedAt: new Date(mockAgent.updatedAt),
        },
      ];

      vi.mocked(mockPrisma.agent.findMany).mockResolvedValue(mockAgents);

      const response = await app.inject({
        method: 'GET',
        url: '/api/agents',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ agents: AgentListItem[] }>();
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0].id).toBe(mockAgent.id);
      expect(body.agents[0].name).toBe(mockAgent.name);
      expect(body.agents[0].autonomyEnabled).toBe(false);
    });

    it('should return empty array when no agents exist', async () => {
      vi.mocked(mockPrisma.agent.findMany).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/agents',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ agents: [] });
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should return agent by id', async () => {
      const dbAgent = {
        id: mockAgent.id,
        name: mockAgent.name,
        config: mockAgentConfig,
        createdAt: new Date(mockAgent.createdAt),
        updatedAt: new Date(mockAgent.updatedAt),
      };

      vi.mocked(mockPrisma.agent.findUnique).mockResolvedValue(dbAgent);

      const response = await app.inject({
        method: 'GET',
        url: `/api/agents/${mockAgent.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<Agent>();
      expect(body.id).toBe(mockAgent.id);
      expect(body.name).toBe(mockAgent.name);
    });

    it('should return 404 when agent not found', async () => {
      vi.mocked(mockPrisma.agent.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/550e8400-e29b-41d4-a716-446655440001',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: 'Agent not found',
      });
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agents/invalid-uuid',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });
  });

  describe('POST /api/agents', () => {
    it('should create agent with valid config', async () => {
      const newAgentConfig: AgentConfig = {
        ...mockAgentConfig,
        name: 'New Agent',
      };

      const createdAgent = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: newAgentConfig.name,
        config: newAgentConfig,
        createdAt: new Date('2025-01-03'),
        updatedAt: new Date('2025-01-03'),
      };

      vi.mocked(mockPrisma.agent.create).mockResolvedValue(createdAgent);

      const response = await app.inject({
        method: 'POST',
        url: '/api/agents',
        payload: newAgentConfig,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json<Agent>();
      expect(body.id).toBe(createdAgent.id);
      expect(body.name).toBe(newAgentConfig.name);
    });

    it('should return 400 for invalid config', async () => {
      const invalidConfig = {
        name: 'X', // Too short
        systemPrompt: 'Test',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/agents',
        payload: invalidConfig,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agents',
        payload: { name: 'Test Agent' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('should update agent with valid config', async () => {
      const updatedConfig: AgentConfig = {
        ...mockAgentConfig,
        systemPrompt: 'Updated prompt',
      };

      const updatedAgent = {
        id: mockAgent.id,
        name: updatedConfig.name,
        config: updatedConfig,
        createdAt: new Date(mockAgent.createdAt),
        updatedAt: new Date('2025-01-03'),
      };

      vi.mocked(mockPrisma.agent.update).mockResolvedValue(updatedAgent);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/agents/${mockAgent.id}`,
        payload: updatedConfig,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<Agent>();
      expect(body.systemPrompt).toBe('Updated prompt');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/agents/invalid-uuid',
        payload: mockAgentConfig,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });

    it('should return 400 for invalid config', async () => {
      const invalidConfig = {
        name: '',
        systemPrompt: 'Test',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/agents/${mockAgent.id}`,
        payload: invalidConfig,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });
  });

  describe('DELETE /api/agents/:id', () => {
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
              id: mockAgent.id,
              name: mockAgent.name,
              config: mockAgentConfig,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        };
        return callback(mockTx);
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/agents/${mockAgent.id}`,
      });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
    });

    it('should return 404 when agent not found', async () => {
      const prismaError = new Error('Record to delete does not exist');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prismaError as any).code = 'P2025';

      vi.mocked(mockPrisma.$transaction).mockRejectedValue(prismaError);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/agents/550e8400-e29b-41d4-a716-446655440001',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: 'Agent not found',
      });
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/agents/invalid-uuid',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error');
    });
  });
});
