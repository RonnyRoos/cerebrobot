import { z } from 'zod';

interface PostgresPersistenceConfig {
  readonly url: string;
  readonly schema?: string;
}

export interface ServerConfig {
  readonly systemPrompt: string;
  readonly personaTag: string;
  readonly model: string;
  readonly temperature: number;
  readonly hotpathLimit: number;
  readonly recentMessageFloor: number;
  readonly hotpathTokenBudget: number;
  readonly hotpathMarginPct: number;
  readonly port: number;
  readonly persistence: {
    readonly provider: 'memory' | 'postgres';
    readonly postgres?: PostgresPersistenceConfig;
  };
}

const FALLBACK_SYSTEM_PROMPT = 'You are Cerebrobot, a helpful assistant.';
const FALLBACK_MODEL = 'gpt-4o-mini';

const ConfigSchema = z.object({
  LANGGRAPH_SYSTEM_PROMPT: z.string().min(1).default(FALLBACK_SYSTEM_PROMPT),
  LANGGRAPH_PERSONA_TAG: z.string().default(''),
  LANGCHAIN_MODEL: z.string().min(1).default(FALLBACK_MODEL),
  LANGCHAIN_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  LANGMEM_HOTPATH_LIMIT: z.coerce.number().int().min(1).default(16),
  LANGMEM_HOTPATH_TOKEN_BUDGET: z.coerce.number().int().min(128).default(3000),
  LANGMEM_RECENT_MESSAGE_FLOOR: z.coerce.number().int().min(1).default(4),
  LANGMEM_HOTPATH_MARGIN_PCT: z.coerce.number().min(0).max(0.9).default(0),
  FASTIFY_PORT: z.coerce.number().int().min(1).default(3000),
  LANGGRAPH_PG_URL: z.string().optional(),
  LANGGRAPH_PG_SCHEMA: z.string().optional(),
});

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = ConfigSchema.parse(env);

  if (!env.LANGGRAPH_SYSTEM_PROMPT) {
    console.warn(
      'LANGGRAPH_SYSTEM_PROMPT missing; using default prompt for development. Set this env var to customize the agent.',
    );
  }

  if (!env.LANGCHAIN_MODEL) {
    console.warn(
      'LANGCHAIN_MODEL missing; using default gpt-4o-mini. Set this env var to target a different model.',
    );
  }

  const pgUrl = parsed.LANGGRAPH_PG_URL?.trim();
  const persistence = pgUrl
    ? {
        provider: 'postgres' as const,
        postgres: {
          url: pgUrl,
          schema: parsed.LANGGRAPH_PG_SCHEMA?.trim() || undefined,
        },
      }
    : ({ provider: 'memory' as const } satisfies ServerConfig['persistence']);

  return {
    systemPrompt: parsed.LANGGRAPH_SYSTEM_PROMPT,
    personaTag: parsed.LANGGRAPH_PERSONA_TAG,
    model: parsed.LANGCHAIN_MODEL,
    temperature: parsed.LANGCHAIN_TEMPERATURE,
    hotpathLimit: parsed.LANGMEM_HOTPATH_LIMIT,
    recentMessageFloor: parsed.LANGMEM_RECENT_MESSAGE_FLOOR,
    hotpathTokenBudget: parsed.LANGMEM_HOTPATH_TOKEN_BUDGET,
    hotpathMarginPct: parsed.LANGMEM_HOTPATH_MARGIN_PCT,
    port: parsed.FASTIFY_PORT,
    persistence,
  };
}
