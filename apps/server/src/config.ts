import { z } from 'zod';

interface PostgresPersistenceConfig {
  readonly url: string;
  readonly schema?: string;
}

/**
 * Memory capacity and quality configuration
 */
export interface MemoryConfig {
  readonly maxPerUser: number;
  readonly duplicateThreshold: number;
  readonly capacityWarnPercent: number;
}

/**
 * Infrastructure configuration loaded from environment variables.
 * This does NOT include agent-specific settings (prompts, models, etc.)
 * which are loaded lazily from JSON config files.
 */
export interface InfrastructureConfig {
  readonly port: number;
  readonly persistence: {
    readonly provider: 'memory' | 'postgres';
    readonly postgres?: PostgresPersistenceConfig;
  };
  readonly memory: MemoryConfig;
}

const InfrastructureConfigSchema = z.object({
  FASTIFY_PORT: z.coerce.number().int().min(1).default(3000),
  LANGGRAPH_PG_URL: z.string().optional(),
  LANGGRAPH_PG_SCHEMA: z.string().optional(),
  MEMORY_MAX_PER_USER: z.coerce.number().int().min(1).default(1000),
  MEMORY_DUPLICATE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.95),
  MEMORY_CAPACITY_WARN_PCT: z.coerce.number().min(0).max(1).default(0.8),
});

export function loadInfrastructureConfig(
  env: NodeJS.ProcessEnv = process.env,
): InfrastructureConfig {
  const parsed = InfrastructureConfigSchema.parse(env);

  const pgUrl = parsed.LANGGRAPH_PG_URL?.trim();
  const persistence = pgUrl
    ? {
        provider: 'postgres' as const,
        postgres: {
          url: pgUrl,
          schema: parsed.LANGGRAPH_PG_SCHEMA?.trim() || undefined,
        },
      }
    : ({ provider: 'memory' as const } satisfies InfrastructureConfig['persistence']);

  return {
    port: parsed.FASTIFY_PORT,
    persistence,
    memory: {
      maxPerUser: parsed.MEMORY_MAX_PER_USER,
      duplicateThreshold: parsed.MEMORY_DUPLICATE_THRESHOLD,
      capacityWarnPercent: parsed.MEMORY_CAPACITY_WARN_PCT,
    },
  };
}
