import { z } from 'zod';

interface PostgresPersistenceConfig {
  readonly url: string;
  readonly schema?: string;
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
}

const InfrastructureConfigSchema = z.object({
  FASTIFY_PORT: z.coerce.number().int().min(1).default(3000),
  LANGGRAPH_PG_URL: z.string().optional(),
  LANGGRAPH_PG_SCHEMA: z.string().optional(),
});

/**
 * Load infrastructure configuration from environment variables.
 * Agent configurations are NOT loaded here - they are lazily loaded
 * from JSON files via AgentLoader.
 */
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
  };
}
