/**
 * Session Types for 008-migrate-to-events-effects
 * SESSION_KEY format and processor configuration
 */

import { z } from 'zod';
import { SessionKeySchema, parseSessionKey as schemaParseSessionKey } from '../types/events.schema.js';

// Re-export SESSION_KEY from schema
export type SessionKey = z.infer<typeof SessionKeySchema>;

// Re-export parsing helper
export const parseSessionKey = schemaParseSessionKey;

// Session processor configuration
export interface SessionProcessorConfig {
  /**
   * Maximum time to wait for graph execution (milliseconds)
   * Default: 30000 (30 seconds)
   */
  graphTimeoutMs?: number;

  /**
   * Whether to enable debug logging
   * Default: false
   */
  debug?: boolean;
}
