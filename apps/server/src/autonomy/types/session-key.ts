/**
 * SessionKey Type and Utilities
 *
 * SESSION_KEY format: userId:agentId:threadId
 * Ensures type safety with branded string type.
 */

import { SessionKey, SessionKeySchema } from './events.schema';

export interface ParsedSessionKey {
  userId: string;
  agentId: string;
  threadId: string;
}

/**
 * Parse SESSION_KEY into components
 * @throws {Error} if format is invalid
 */
export function parseSessionKey(sessionKey: SessionKey): ParsedSessionKey {
  const parts = sessionKey.split(':');

  if (parts.length !== 3) {
    throw new Error(`Invalid SESSION_KEY format: ${sessionKey}. Expected userId:agentId:threadId`);
  }

  const [userId, agentId, threadId] = parts;

  if (!userId || !agentId || !threadId) {
    throw new Error(
      `Invalid SESSION_KEY components in: ${sessionKey}. All parts must be non-empty`,
    );
  }

  return { userId, agentId, threadId };
}

/**
 * Validate and brand a string as SessionKey
 * @throws {Error} if format is invalid
 */
export function validateSessionKey(value: string): SessionKey {
  const result = SessionKeySchema.safeParse(value);

  if (!result.success) {
    throw new Error(
      `Invalid SESSION_KEY: ${result.error.issues[0]?.message || 'Unknown validation error'}`,
    );
  }

  return result.data;
}

/**
 * Build SESSION_KEY from components
 */
export function buildSessionKey(userId: string, agentId: string, threadId: string): SessionKey {
  const key = `${userId}:${agentId}:${threadId}`;
  return validateSessionKey(key);
}
