/**
 * Autonomy Configuration
 *
 * Environment-based configuration for server-side autonomy features.
 * All parameters configurable via .env with sensible defaults.
 */

import { z } from 'zod';

export const AutonomyConfigSchema = z.object({
  enabled: z.boolean(),
  maxConsecutive: z.number().int().positive(),
  cooldownMs: z.number().int().positive(),
  timerPollIntervalMs: z.number().int().positive(),
  effectPollIntervalMs: z.number().int().positive(),
});

export type AutonomyConfig = z.infer<typeof AutonomyConfigSchema>;

/**
 * Load and validate autonomy configuration from environment
 */
export function loadAutonomyConfig(): AutonomyConfig {
  const config = {
    enabled: process.env.AUTONOMY_ENABLED === 'true',
    maxConsecutive: parseInt(process.env.AUTONOMY_MAX_CONSECUTIVE || '3', 10),
    cooldownMs: parseInt(process.env.AUTONOMY_COOLDOWN_MS || '15000', 10),
    timerPollIntervalMs: parseInt(process.env.TIMER_POLL_INTERVAL_MS || '250', 10),
    effectPollIntervalMs: parseInt(process.env.EFFECT_POLL_INTERVAL_MS || '250', 10),
  };

  const result = AutonomyConfigSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Invalid autonomy configuration: ${result.error.issues.map((i) => i.message).join(', ')}`,
    );
  }

  return result.data;
}

/**
 * Default configuration for testing
 */
export const DEFAULT_AUTONOMY_CONFIG: AutonomyConfig = {
  enabled: false,
  maxConsecutive: 3,
  cooldownMs: 15000,
  timerPollIntervalMs: 250,
  effectPollIntervalMs: 250,
};
