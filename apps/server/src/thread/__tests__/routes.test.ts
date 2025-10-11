/**
 * Thread Routes Integration Tests
 *
 * Tests for thread listing and history endpoints with mocked ThreadService.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { registerThreadRoutes } from '../routes.js';
import type { ThreadService } from '../service.js';
import type { ThreadMetadata, MessageHistoryResponse } from '@cerebrobot/chat-shared';

describe('Thread Routes', () => {
  let app: FastifyInstance;
  let mockThreadService: ThreadService;

  beforeEach(async () => {
    // Mock ThreadService
    mockThreadService = {
      listThreads: vi.fn(),
      getThreadHistory: vi.fn(),
    } as unknown as ThreadService;

    app = Fastify({ logger: false });
    registerThreadRoutes(app, mockThreadService);
    await app.ready();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  describe('GET /api/threads', () => {
    it('returns thread list when userId is provided', async () => {
      const mockThreads: ThreadMetadata[] = [
        {
          threadId: '11111111-1111-4111-8111-111111111111',
          userId: '22222222-2222-4222-8222-222222222222',
          agentId: 'agent-123',
          title: 'Test Thread',
          lastMessage: 'This is a test',
          lastMessageRole: 'user',
          createdAt: new Date('2025-10-08T10:00:00Z'),
          updatedAt: new Date('2025-10-08T11:00:00Z'),
          messageCount: 5,
          isEmpty: false,
        },
      ];

      vi.mocked(mockThreadService.listThreads).mockResolvedValue(mockThreads);

      const response = await app.inject({
        method: 'GET',
        url: '/api/threads?userId=22222222-2222-4222-8222-222222222222',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);

      // Date objects are serialized to ISO strings in JSON response
      expect(payload.threads).toHaveLength(1);
      expect(payload.threads[0].threadId).toBe(mockThreads[0].threadId);
      expect(payload.threads[0].userId).toBe(mockThreads[0].userId);
      expect(payload.threads[0].title).toBe(mockThreads[0].title);
      expect(payload.threads[0].createdAt).toBe(mockThreads[0].createdAt.toISOString());
      expect(payload.threads[0].updatedAt).toBe(mockThreads[0].updatedAt.toISOString());
      expect(payload.total).toBe(1);
      expect(mockThreadService.listThreads).toHaveBeenCalledWith(
        '22222222-2222-4222-8222-222222222222',
        undefined,
      );
    });

    it('returns 400 when userId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/threads',
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('Invalid query parameters');
      expect(payload.details).toBeDefined();
      expect(mockThreadService.listThreads).not.toHaveBeenCalled();
    });

    it('returns 400 when userId is not a valid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/threads?userId=invalid-uuid',
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toContain('Invalid');
      expect(mockThreadService.listThreads).not.toHaveBeenCalled();
    });

    it('returns filtered threads when agentId is provided', async () => {
      const mockThreads: ThreadMetadata[] = [
        {
          threadId: '33333333-3333-4333-8333-333333333333',
          userId: '22222222-2222-4222-8222-222222222222',
          agentId: 'agent-456',
          title: 'Filtered Thread',
          lastMessage: 'Agent specific message',
          lastMessageRole: 'assistant',
          createdAt: new Date('2025-10-08T12:00:00Z'),
          updatedAt: new Date('2025-10-08T12:30:00Z'),
          messageCount: 3,
          isEmpty: false,
        },
      ];

      vi.mocked(mockThreadService.listThreads).mockResolvedValue(mockThreads);

      const response = await app.inject({
        method: 'GET',
        url: '/api/threads?userId=22222222-2222-4222-8222-222222222222&agentId=agent-456',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.threads).toHaveLength(1);
      expect(payload.threads[0].agentId).toBe('agent-456');
      expect(payload.total).toBe(1);
      expect(mockThreadService.listThreads).toHaveBeenCalledWith(
        '22222222-2222-4222-8222-222222222222',
        'agent-456',
      );
    });

    it('returns 400 when agentId is empty string', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/threads?userId=22222222-2222-4222-8222-222222222222&agentId=',
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('Invalid query parameters');
      expect(payload.details).toBeDefined();
      expect(mockThreadService.listThreads).not.toHaveBeenCalled();
    });

    it('returns empty list when no threads exist', async () => {
      vi.mocked(mockThreadService.listThreads).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/threads?userId=066f8562-b1d8-4a85-8595-930a8bdd0a24',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.threads).toEqual([]);
      expect(payload.total).toBe(0);
    });

    it('returns 500 when service throws error', async () => {
      vi.mocked(mockThreadService.listThreads).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/threads?userId=066f8562-b1d8-4a85-8595-930a8bdd0a24',
      });

      expect(response.statusCode).toBe(500);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('Failed to retrieve threads');
    });
  });

  describe('GET /api/threads/:threadId/messages', () => {
    it('returns message history when authorized', async () => {
      const mockHistory: MessageHistoryResponse = {
        threadId: '11111111-1111-4111-8111-111111111111',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            id: 'msg-1',
            timestamp: new Date('2025-10-08T10:00:00Z'),
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            id: 'msg-2',
            timestamp: new Date('2025-10-08T10:00:05Z'),
          },
        ],
      };

      vi.mocked(mockThreadService.getThreadHistory).mockResolvedValue(mockHistory);

      const response = await app.inject({
        method: 'GET',
        url: '/api/threads/11111111-1111-4111-8111-111111111111/messages?userId=22222222-2222-4222-8222-222222222222',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);

      // Date objects are serialized to ISO strings in JSON response
      expect(payload.threadId).toBe(mockHistory.threadId);
      expect(payload.messages).toHaveLength(2);
      expect(payload.messages[0].content).toBe('Hello');
      expect(payload.messages[0].timestamp).toBe(mockHistory.messages[0].timestamp.toISOString());
      expect(payload.messages[1].content).toBe('Hi there!');
      expect(payload.messages[1].timestamp).toBe(mockHistory.messages[1].timestamp.toISOString());

      expect(mockThreadService.getThreadHistory).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      );
    });

    it('returns 400 when userId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/threads/11111111-1111-4111-8111-111111111111/messages',
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('Invalid query parameters');
      expect(payload.details).toBeDefined();
      expect(mockThreadService.getThreadHistory).not.toHaveBeenCalled();
    });

    it('returns 400 when userId is not a valid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/threads/11111111-1111-4111-8111-111111111111/messages?userId=not-a-uuid',
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toContain('Invalid');
      expect(mockThreadService.getThreadHistory).not.toHaveBeenCalled();
    });

    it('returns 400 when threadId is not a valid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/threads/not-a-uuid/messages?userId=066f8562-b1d8-4a85-8595-930a8bdd0a24',
      });

      expect(response.statusCode).toBe(400);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('Invalid thread ID');
    });

    it('returns 403 when user not authorized for thread', async () => {
      vi.mocked(mockThreadService.getThreadHistory).mockRejectedValue(
        new Error('Unauthorized: thread does not belong to user'),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/threads/11111111-1111-4111-8111-111111111111/messages?userId=22222222-2222-4222-8222-222222222222',
      });

      expect(response.statusCode).toBe(403);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('You do not have access to this thread');
    });

    it('returns 500 for unexpected service errors', async () => {
      vi.mocked(mockThreadService.getThreadHistory).mockRejectedValue(
        new Error('Unexpected database error'),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/threads/11111111-1111-4111-8111-111111111111/messages?userId=066f8562-b1d8-4a85-8595-930a8bdd0a24',
      });

      expect(response.statusCode).toBe(500);
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('Failed to retrieve thread history');
    });
  });

  describe('GET /api/thread/:threadId/history', () => {
    it('returns message history when userId is omitted (legacy path)', async () => {
      const mockHistory: MessageHistoryResponse = {
        threadId: '55555555-5555-4555-8555-555555555555',
        messages: [],
      };

      vi.mocked(mockThreadService.getThreadHistory).mockResolvedValue(mockHistory);

      const response = await app.inject({
        method: 'GET',
        url: '/api/thread/55555555-5555-4555-8555-555555555555/history',
      });

      expect(response.statusCode).toBe(200);
      expect(mockThreadService.getThreadHistory).toHaveBeenCalledWith(
        '55555555-5555-4555-8555-555555555555',
        undefined,
      );
    });

    it('returns 400 when legacy route receives invalid userId query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/thread/55555555-5555-4555-8555-555555555555/history?userId=not-a-uuid',
      });

      expect(response.statusCode).toBe(400);
      expect(mockThreadService.getThreadHistory).not.toHaveBeenCalled();
    });
  });
});
