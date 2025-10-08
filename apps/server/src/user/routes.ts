/**
 * User Management Routes
 *
 * Handles user creation for memory namespace scoping.
 */

import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CreateUserRequestSchema, CreateUserResponseSchema } from '@cerebrobot/chat-shared';
import type { Logger } from 'pino';

interface UserRoutesOptions {
  logger: Logger;
  prisma?: PrismaClient;
}

export function registerUserRoutes(app: FastifyInstance, options: UserRoutesOptions): void {
  const { logger } = options;
  const prisma = options.prisma ?? new PrismaClient();

  /**
   * POST /api/users
   *
   * Create a new user with a name-based identifier.
   * Returns userId for localStorage persistence.
   */
  app.post<{
    Body: unknown;
  }>('/api/users', async (request, reply) => {
    try {
      // Validate request body
      const parseResult = CreateUserRequestSchema.safeParse(request.body);

      if (!parseResult.success) {
        logger.warn({ errors: parseResult.error }, 'Invalid user creation request');
        return reply.status(400).send({
          error: 'Invalid request',
          details: parseResult.error.issues,
        });
      }

      const { name } = parseResult.data;

      // Create user in database
      const user = await prisma.user.create({
        data: {
          name,
        },
      });

      logger.info({ userId: user.id, name: user.name }, 'User created successfully');

      // Format response
      const response = CreateUserResponseSchema.parse({
        userId: user.id,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      });

      return reply.status(201).send(response);
    } catch (error) {
      logger.error({ error }, 'Failed to create user');
      return reply.status(500).send({
        error: 'Failed to create user',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
