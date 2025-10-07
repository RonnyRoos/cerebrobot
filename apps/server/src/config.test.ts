import { beforeEach, describe, expect, it } from 'vitest';
import { loadConfigFromEnv } from './config.js';

const baseEnv = {
  FASTIFY_PORT: '3030',
  LANGGRAPH_SYSTEM_PROMPT: 'Prompt',
  LANGGRAPH_PERSONA_TAG: 'persona',
  LANGCHAIN_MODEL: 'gpt-test',
  LANGCHAIN_TEMPERATURE: '0.5',
  LANGMEM_HOTPATH_LIMIT: '5',
  LANGMEM_HOTPATH_TOKEN_BUDGET: '2048',
  LANGMEM_RECENT_MESSAGE_FLOOR: '2',
  LANGMEM_HOTPATH_MARGIN_PCT: '0.1',
};

describe('loadConfigFromEnv', () => {
  beforeEach(() => {
    delete process.env.LANGGRAPH_PG_URL;
    delete process.env.LANGGRAPH_PG_SCHEMA;
  });

  it('defaults to memory persistence when postgres url is not provided', () => {
    const config = loadConfigFromEnv(baseEnv);

    expect(config.persistence.provider).toBe('memory');
    expect(config.persistence.postgres).toBeUndefined();
  });

  it('enables postgres persistence when url is present', () => {
    const env = {
      ...baseEnv,
      LANGGRAPH_PG_URL: 'postgresql://example',
    };

    const config = loadConfigFromEnv(env);

    expect(config.persistence.provider).toBe('postgres');
    expect(config.persistence.postgres).toEqual({
      url: 'postgresql://example',
      schema: undefined,
    });
  });

  it('captures optional schema when provided', () => {
    const env = {
      ...baseEnv,
      LANGGRAPH_PG_URL: 'postgresql://example',
      LANGGRAPH_PG_SCHEMA: 'langgraph',
    };

    const config = loadConfigFromEnv(env);

    expect(config.persistence.provider).toBe('postgres');
    expect(config.persistence.postgres).toEqual({
      url: 'postgresql://example',
      schema: 'langgraph',
    });
  });
});
