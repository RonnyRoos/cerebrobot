import { beforeEach, describe, expect, it } from 'vitest';
import { loadInfrastructureConfig } from './config.js';

const baseEnv = {
  FASTIFY_PORT: '3030',
};

describe('loadInfrastructureConfig', () => {
  beforeEach(() => {
    delete process.env.LANGGRAPH_PG_URL;
    delete process.env.LANGGRAPH_PG_SCHEMA;
  });

  it('defaults to memory persistence when postgres url is not provided', () => {
    const config = loadInfrastructureConfig(baseEnv);

    expect(config.persistence.provider).toBe('memory');
    expect(config.persistence.postgres).toBeUndefined();
    expect(config.port).toBe(3030);
  });

  it('enables postgres persistence when url is present', () => {
    const env = {
      ...baseEnv,
      LANGGRAPH_PG_URL: 'postgresql://example',
    };

    const config = loadInfrastructureConfig(env);

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

    const config = loadInfrastructureConfig(env);

    expect(config.persistence.provider).toBe('postgres');
    expect(config.persistence.postgres).toEqual({
      url: 'postgresql://example',
      schema: 'langgraph',
    });
  });
});
