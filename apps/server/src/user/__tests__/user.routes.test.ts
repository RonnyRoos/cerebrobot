/**
 * User Routes Tests
 *
 * Unit tests for user creation endpoint.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { registerUserRoutes } from '../routes.js';
import pino from 'pino';

// Mock Prisma client
vi.mock('@prisma/client', () => {
  class PrismaClientMock {
    public readonly user = {
      create: vi.fn(),
    };
  }

  return {
    PrismaClient: PrismaClientMock,
  };
});

describe('User Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let logger: pino.Logger;

  beforeEach(async () => {
    prisma = new PrismaClient();
    logger = pino({ level: 'silent' });

    app = Fastify({ logger: false });
    registerUserRoutes(app, { logger, prisma });
    await app.ready();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  describe('POST /api/users', () => {
    it('creates user with valid name and returns userId', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Alice',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: 'Alice' },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        userId: mockUser.id,
        name: 'Alice',
        createdAt: '2025-01-01T00:00:00.000Z',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { name: 'Alice' },
      });
    });

    it('accepts names with minimum length (1 character)', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'A',
        createdAt: new Date(),
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: 'A' },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().name).toBe('A');
    });

    it('accepts names with maximum length (100 characters)', async () => {
      const longName = 'A'.repeat(100);
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: longName,
        createdAt: new Date(),
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: longName },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().name).toBe(longName);
    });

    it('rejects empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: '' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: 'Invalid request',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Too small'),
          }),
        ]),
      });

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects name exceeding maximum length', async () => {
      const tooLongName = 'A'.repeat(101);

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: tooLongName },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: 'Invalid request',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Too big'),
          }),
        ]),
      });

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects missing name field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: 'Invalid request',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Invalid input'),
          }),
        ]),
      });

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects non-string name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: 123 },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: 'Invalid request',
      });

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('handles Prisma database errors gracefully', async () => {
      vi.mocked(prisma.user.create).mockRejectedValue(new Error('Database connection failed'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: 'Bob' },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({
        error: 'Failed to create user',
        message: 'Database connection failed',
      });
    });

    it('handles unknown errors gracefully', async () => {
      vi.mocked(prisma.user.create).mockRejectedValue('Unexpected error');

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: 'Charlie' },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({
        error: 'Failed to create user',
        message: 'Unknown error',
      });
    });

    it('validates response matches CreateUserResponse schema', async () => {
      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Schema Test',
        createdAt: new Date('2025-10-07T12:00:00Z'),
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const response = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        payload: { name: 'Schema Test' },
      });

      expect(response.statusCode).toBe(201);

      const body = response.json();

      // Validate structure
      expect(body).toHaveProperty('userId');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('createdAt');

      // Validate types
      expect(typeof body.userId).toBe('string');
      expect(typeof body.name).toBe('string');
      expect(typeof body.createdAt).toBe('string');

      // Validate UUID format
      expect(body.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      // Validate ISO date format
      expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
