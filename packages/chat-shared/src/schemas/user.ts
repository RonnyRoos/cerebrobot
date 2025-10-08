/**
 * User Schemas
 *
 * Provides type-safe validation for user creation and management.
 */

import { z } from 'zod';

/**
 * Create User Request Schema
 *
 * Used for name-based user creation on first visit.
 */
export const CreateUserRequestSchema = z.object({
  /** Human-readable name (e.g., "operator", "demo", "test") */
  name: z.string().min(1).max(100),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

/**
 * Create User Response Schema
 */
export const CreateUserResponseSchema = z.object({
  /** Generated user UUID */
  userId: z.string().uuid(),

  /** User's name */
  name: z.string(),

  /** User creation timestamp */
  createdAt: z.string().datetime(),
});

export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
