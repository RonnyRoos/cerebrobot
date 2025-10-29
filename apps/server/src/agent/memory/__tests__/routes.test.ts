/**
 * Memory Routes Unit Tests
 *
 * Tests GET /api/memory pagination logic with mocked dependencies.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import type { PrismaClient, Memory } from '@prisma/client';
import type { Logger } from 'pino';
import type { MemoryEntry, MemorySearchResult } from '@cerebrobot/chat-shared';
import { registerMemoryRoutes } from '../routes.js';
import type { MemoryService } from '../service.js';

describe('Memory Routes - GET /api/memory', () => {
  let app: FastifyInstance;
  let mockMemoryService: MemoryService;
  let mockPrisma: PrismaClient;
  let mockLogger: Logger;

  beforeEach(async () => {
    // Create fresh Fastify instance for each test
    app = fastify({ logger: false });

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    // Mock MemoryService
    mockMemoryService = {
      listMemories: vi.fn(),
      searchMemories: vi.fn(),
    } as unknown as MemoryService;

    // Mock PrismaClient
    mockPrisma = {
      thread: {
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440000',
          agentId: 'test-agent',
          userId: 'test-user',
          createdAt: new Date(),
        }),
      },
    } as unknown as PrismaClient;

    // Register routes with mocked dependencies
    registerMemoryRoutes(app, {
      logger: mockLogger,
      memoryService: mockMemoryService,
      prisma: mockPrisma,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 400 if threadId is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/memory',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
    expect(body.details).toBeDefined();
  });

  it('should return 400 if threadId is not a UUID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/memory?threadId=invalid-uuid',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
  });

  it('should return 404 if thread does not exist', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440001';
    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory?threadId=${threadId}`,
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Thread not found');
  });

  it('should return 400 if thread has no userId', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440002';
    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue({
      id: threadId,
      agentId: 'test-agent',
      userId: null,
      createdAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory?threadId=${threadId}`,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid thread');
    expect(body.message).toContain('userId');
  });

  it('should return memories with default pagination (offset=0, limit=20)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440003';
    const userId = '550e8400-e29b-41d4-a716-446655440004';
    const agentId = 'test-agent';

    // Mock thread lookup
    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue({
      id: threadId,
      agentId,
      userId,
      createdAt: new Date(),
    });

    // Mock memories
    const mockMemories: MemoryEntry[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        namespace: ['memories', agentId, userId],
        key: 'key1',
        content: 'Test memory 1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        namespace: ['memories', agentId, userId],
        key: 'key2',
        content: 'Test memory 2',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    vi.mocked(mockMemoryService.listMemories).mockResolvedValue({
      memories: mockMemories,
      total: 2,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory?threadId=${threadId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.memories).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.offset).toBe(0);
    expect(body.limit).toBe(20);

    // Verify service was called with correct namespace and defaults
    expect(mockMemoryService.listMemories).toHaveBeenCalledWith(
      ['memories', agentId, userId],
      0,
      20,
    );
  });

  it('should respect custom offset and limit parameters', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440005';
    const userId = '550e8400-e29b-41d4-a716-446655440006';
    const agentId = 'test-agent';

    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue({
      id: threadId,
      agentId,
      userId,
      createdAt: new Date(),
    });

    vi.mocked(mockMemoryService.listMemories).mockResolvedValue({
      memories: [],
      total: 100,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory?threadId=${threadId}&offset=10&limit=50`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.offset).toBe(10);
    expect(body.limit).toBe(50);

    expect(mockMemoryService.listMemories).toHaveBeenCalledWith(
      ['memories', agentId, userId],
      10,
      50,
    );
  });

  it('should reject limit greater than 100', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440007';

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory?threadId=${threadId}&limit=200`,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
    expect(body.details).toBeDefined();
  });

  it('should reject negative offset', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440009';

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory?threadId=${threadId}&offset=-1`,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
  });

  it('should reject limit less than 1', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440010';

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory?threadId=${threadId}&limit=0`,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
  });

  it('should return 500 if service throws error', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440011';
    const userId = '550e8400-e29b-41d4-a716-446655440012';
    const agentId = 'test-agent';

    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue({
      id: threadId,
      agentId,
      userId,
      createdAt: new Date(),
    });

    vi.mocked(mockMemoryService.listMemories).mockRejectedValue(new Error('Database error'));

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory?threadId=${threadId}`,
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Failed to fetch memories');
    expect(body.message).toContain('Database error');
  });
});

describe('Memory Routes - GET /api/memory/search', () => {
  let app: FastifyInstance;
  let mockMemoryService: MemoryService;
  let mockPrisma: PrismaClient;
  let mockLogger: Logger;

  beforeEach(async () => {
    app = fastify({ logger: false });

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    mockMemoryService = {
      listMemories: vi.fn(),
      searchMemories: vi.fn(),
    } as unknown as MemoryService;

    mockPrisma = {
      thread: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaClient;

    registerMemoryRoutes(app, {
      logger: mockLogger,
      memoryService: mockMemoryService,
      prisma: mockPrisma,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 400 if threadId is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/memory/search?query=test',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
  });

  it('should return 400 if query is missing', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440001';
    const response = await app.inject({
      method: 'GET',
      url: `/api/memory/search?threadId=${threadId}`,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
  });

  it('should return search results ranked by similarity (T030)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440001';
    const agentId = 'agent-123';
    const userId = 'user-456';

    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue({
      id: threadId,
      agentId,
      userId,
      createdAt: new Date(),
    });

    const mockResults: MemorySearchResult[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        namespace: ['memories', agentId, userId],
        key: 'memory-1',
        content: 'User loves chocolate',
        createdAt: new Date(),
        updatedAt: new Date(),
        similarity: 0.95, // Highest similarity
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        namespace: ['memories', agentId, userId],
        key: 'memory-2',
        content: 'User likes sweets',
        createdAt: new Date(),
        updatedAt: new Date(),
        similarity: 0.85,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        namespace: ['memories', agentId, userId],
        key: 'memory-3',
        content: 'User enjoys desserts',
        createdAt: new Date(),
        updatedAt: new Date(),
        similarity: 0.75, // Lowest similarity
      },
    ];

    vi.mocked(mockMemoryService.searchMemories).mockResolvedValue({
      results: mockResults,
      total: 3,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory/search?threadId=${threadId}&query=chocolate&threshold=0.7`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Verify response structure
    expect(body.results).toHaveLength(3);
    expect(body.query).toBe('chocolate');
    expect(body.total).toBe(3);

    // Verify results are ranked by similarity (highest first)
    expect(body.results[0].similarity).toBeGreaterThan(body.results[1].similarity);
    expect(body.results[1].similarity).toBeGreaterThan(body.results[2].similarity);

    // Verify searchMemories was called with correct parameters
    expect(mockMemoryService.searchMemories).toHaveBeenCalledWith(
      ['memories', agentId, userId],
      'chocolate',
      0, // offset
      20, // limit
      0.7, // threshold
    );
  });

  it('should support pagination with offset and limit', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440001';
    const agentId = 'agent-123';
    const userId = 'user-456';

    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue({
      id: threadId,
      agentId,
      userId,
      createdAt: new Date(),
    });

    const mockResults: MemorySearchResult[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        namespace: ['memories', agentId, userId],
        key: 'memory-11',
        content: 'Result 11',
        createdAt: new Date(),
        updatedAt: new Date(),
        similarity: 0.8,
      },
    ];

    vi.mocked(mockMemoryService.searchMemories).mockResolvedValue({
      results: mockResults,
      total: 25, // Total results above threshold
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory/search?threadId=${threadId}&query=test&offset=10&limit=5`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.total).toBe(25);
    expect(mockMemoryService.searchMemories).toHaveBeenCalledWith(
      ['memories', agentId, userId],
      'test',
      10, // offset
      5, // limit
      0.7, // default threshold
    );
  });

  it('should return empty results if no matches found', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440001';
    const agentId = 'agent-123';
    const userId = 'user-456';

    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue({
      id: threadId,
      agentId,
      userId,
      createdAt: new Date(),
    });

    vi.mocked(mockMemoryService.searchMemories).mockResolvedValue({
      results: [],
      total: 0,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/memory/search?threadId=${threadId}&query=nonexistent`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.results).toHaveLength(0);
    expect(body.total).toBe(0);
    expect(body.query).toBe('nonexistent');
  });
});

describe('Memory Routes - PUT /api/memory/:id', () => {
  let app: FastifyInstance;
  let mockMemoryService: MemoryService;
  let mockPrisma: PrismaClient;
  let mockLogger: Logger;

  beforeEach(async () => {
    app = fastify({ logger: false });

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    mockMemoryService = {
      updateMemory: vi.fn(),
    } as unknown as MemoryService;

    mockPrisma = {
      thread: {
        findFirst: vi.fn().mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440000',
          agentId: 'test-agent',
          userId: 'test-user',
          createdAt: new Date(),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            agentId: 'test-agent',
            userId: 'test-user',
            createdAt: new Date(),
          },
        ]),
      },
    } as unknown as PrismaClient;

    registerMemoryRoutes(app, {
      logger: mockLogger,
      memoryService: mockMemoryService,
      prisma: mockPrisma,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 400 if memory ID is not a UUID', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/memory/invalid-uuid',
      payload: { content: 'Updated content' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid memory ID');
  });

  it('should return 400 if content is missing', async () => {
    const memoryId = '550e8400-e29b-41d4-a716-446655440001';
    const response = await app.inject({
      method: 'PUT',
      url: `/api/memory/${memoryId}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid request body');
  });

  it('should return 400 if content is empty', async () => {
    const memoryId = '550e8400-e29b-41d4-a716-446655440001';
    const response = await app.inject({
      method: 'PUT',
      url: `/api/memory/${memoryId}`,
      payload: { content: '' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid request body');
  });

  it('should return 404 if memory does not exist (T043)', async () => {
    const memoryId = '550e8400-e29b-41d4-a716-446655440001';
    vi.mocked(mockMemoryService.updateMemory).mockRejectedValue(
      new Error(`Memory ${memoryId} not found`),
    );

    const response = await app.inject({
      method: 'PUT',
      url: `/api/memory/${memoryId}`,
      payload: { content: 'Updated content' },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Memory not found');
  });

  it('should update memory and return updated entry (T040)', async () => {
    const memoryId = '550e8400-e29b-41d4-a716-446655440001';
    const updatedMemory: MemoryEntry = {
      id: memoryId,
      namespace: ['user', 'test-user', 'agent', 'test-agent'],
      key: memoryId,
      content: 'Updated content',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    vi.mocked(mockMemoryService.updateMemory).mockResolvedValue(updatedMemory);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/memory/${memoryId}`,
      payload: { content: 'Updated content' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.memory.id).toBe(memoryId);
    expect(body.memory.content).toBe('Updated content');
    expect(mockMemoryService.updateMemory).toHaveBeenCalledWith(memoryId, 'Updated content');
  });
});

describe('Memory Routes - DELETE /api/memory/:id', () => {
  let app: FastifyInstance;
  let mockMemoryService: MemoryService;
  let mockPrisma: PrismaClient;
  let mockLogger: Logger;

  beforeEach(async () => {
    app = fastify({ logger: false });

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    mockMemoryService = {
      deleteMemory: vi.fn(),
    } as unknown as MemoryService;

    mockPrisma = {
      memory: {
        findUnique: vi.fn(),
      },
      thread: {
        findFirst: vi.fn().mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440000',
          agentId: 'test-agent',
          userId: 'test-user',
          createdAt: new Date(),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            agentId: 'test-agent',
            userId: 'test-user',
            createdAt: new Date(),
          },
        ]),
      },
    } as unknown as PrismaClient;

    registerMemoryRoutes(app, {
      logger: mockLogger,
      memoryService: mockMemoryService,
      prisma: mockPrisma,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 400 if memory ID is not a UUID', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/memory/invalid-uuid',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid memory ID');
  });

  it('should return 404 if memory does not exist (T044)', async () => {
    const memoryId = '550e8400-e29b-41d4-a716-446655440001';

    // Mock prisma.memory.findUnique to return null (memory not found)
    vi.mocked(mockPrisma.memory.findUnique).mockResolvedValue(null);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/memory/${memoryId}`,
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Memory not found');
  });

  it('should delete memory successfully (T041)', async () => {
    const memoryId = '550e8400-e29b-41d4-a716-446655440001';

    // Mock prisma.memory.findUnique to return memory with proper namespace
    const mockMemory: Memory = {
      id: memoryId,
      namespace: ['user', 'test-user', 'agent', 'test-agent'],
      key: memoryId,
      content: 'Test content',
      metadata: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };
    vi.mocked(mockPrisma.memory.findUnique).mockResolvedValue(mockMemory);

    vi.mocked(mockMemoryService.deleteMemory).mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/memory/${memoryId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Memory deleted successfully');
    expect(mockMemoryService.deleteMemory).toHaveBeenCalledWith(memoryId);
  });
});

describe('Memory Routes - POST /api/memory', () => {
  let app: FastifyInstance;
  let mockMemoryService: MemoryService;
  let mockPrisma: PrismaClient;
  let mockLogger: Logger;

  beforeEach(async () => {
    app = fastify({ logger: false });

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    mockMemoryService = {
      canAddMemory: vi.fn(),
      checkCapacity: vi.fn(),
      createMemory: vi.fn(),
    } as unknown as MemoryService;

    mockPrisma = {
      thread: {
        findUnique: vi.fn().mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440000',
          agentId: 'test-agent',
          userId: 'test-user',
          createdAt: new Date(),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            agentId: 'test-agent',
            userId: 'test-user',
            createdAt: new Date(),
          },
        ]),
      },
    } as unknown as PrismaClient;

    registerMemoryRoutes(app, {
      logger: mockLogger,
      memoryService: mockMemoryService,
      prisma: mockPrisma,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 400 if threadId is missing (T061)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/memory',
      payload: { content: 'New memory content' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
  });

  it('should return 400 if threadId is not a UUID (T061)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/memory?threadId=invalid-uuid',
      payload: { content: 'New memory content' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid query parameters');
  });

  it('should return 400 if content is missing (T061)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440000';
    const response = await app.inject({
      method: 'POST',
      url: `/api/memory?threadId=${threadId}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid request body');
  });

  it('should return 400 if content is too short (T061)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440000';
    const response = await app.inject({
      method: 'POST',
      url: `/api/memory?threadId=${threadId}`,
      payload: { content: '' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid request body');
  });

  it('should return 400 if content exceeds max length (T061)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440000';
    const longContent = 'a'.repeat(8193); // Max is 8192
    const response = await app.inject({
      method: 'POST',
      url: `/api/memory?threadId=${threadId}`,
      payload: { content: longContent },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid request body');
  });

  it('should return 404 if thread does not exist (T061)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440001';
    vi.mocked(mockPrisma.thread.findUnique).mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: `/api/memory?threadId=${threadId}`,
      payload: { content: 'New memory content' },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Thread not found');
  });

  it('should return 409 if memory capacity is reached (T061)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440000';
    vi.mocked(mockMemoryService.canAddMemory).mockResolvedValue(false);
    vi.mocked(mockMemoryService.checkCapacity).mockResolvedValue({
      count: 100,
      maxMemories: 100,
      capacityPercent: 1.0,
      warningThreshold: 0.8,
      showWarning: true,
      atCapacity: true,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/memory?threadId=${threadId}`,
      payload: { content: 'New memory content' },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Memory capacity reached');
  });

  it('should create memory with correct namespace and metadata (T059, T060)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440000';
    const content = 'New manually created memory';
    const userMetadata = { category: 'important' };

    vi.mocked(mockMemoryService.canAddMemory).mockResolvedValue(true);

    const createdMemory: MemoryEntry = {
      id: 'new-memory-id',
      namespace: ['memories', 'test-agent', 'test-user'],
      key: 'memory-key',
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ...userMetadata,
        source: 'manual',
        createdBy: 'operator',
      },
    };

    vi.mocked(mockMemoryService.createMemory).mockResolvedValue(createdMemory);

    const response = await app.inject({
      method: 'POST',
      url: `/api/memory?threadId=${threadId}`,
      payload: { content, metadata: userMetadata },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.memory).toBeDefined();
    expect(body.memory.content).toBe(content);
    expect(body.memory.metadata.source).toBe('manual');
    expect(body.memory.metadata.createdBy).toBe('operator');
    expect(body.memory.metadata.category).toBe('important');

    // Verify createMemory was called with correct parameters
    expect(mockMemoryService.createMemory).toHaveBeenCalledWith(
      ['memories', 'test-agent', 'test-user'],
      expect.any(String), // key (UUID)
      expect.objectContaining({
        id: expect.any(String), // id (UUID)
        namespace: ['memories', 'test-agent', 'test-user'],
        key: expect.any(String),
        content,
        metadata: expect.objectContaining({
          source: 'manual',
          createdBy: 'operator',
          category: 'important',
        }),
      }),
    );
  });

  it('should create memory without optional metadata (T059)', async () => {
    const threadId = '550e8400-e29b-41d4-a716-446655440000';
    const content = 'Simple memory';

    vi.mocked(mockMemoryService.canAddMemory).mockResolvedValue(true);

    const createdMemory: MemoryEntry = {
      id: 'new-memory-id',
      namespace: ['memories', 'test-agent', 'test-user'],
      key: 'memory-key',
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        source: 'manual',
        createdBy: 'operator',
      },
    };

    vi.mocked(mockMemoryService.createMemory).mockResolvedValue(createdMemory);

    const response = await app.inject({
      method: 'POST',
      url: `/api/memory?threadId=${threadId}`,
      payload: { content },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.memory.metadata.source).toBe('manual');
    expect(body.memory.metadata.createdBy).toBe('operator');
  });
});
