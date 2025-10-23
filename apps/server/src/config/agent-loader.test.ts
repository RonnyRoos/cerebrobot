/**
 * Agent Configuration Loader Tests
 *
 * Tests for lazy loading and fail-fast validation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AgentLoader } from './agent-loader.js';

const ORIGINAL_ENV = { ...process.env };

// Minimal valid autonomy config for tests
const TEST_AUTONOMY_CONFIG = {
  enabled: false,
  evaluator: {
    model: 'test-model',
    temperature: 0.2,
    maxTokens: 512,
    systemPrompt: 'Test autonomy evaluator',
  },
  limits: {
    maxFollowUpsPerSession: 3,
    minDelayMs: 30000,
    maxDelayMs: 3600000,
  },
  memoryContext: {
    recentMemoryCount: 5,
    includeRecentMessages: 6,
  },
};

describe('AgentLoader class', () => {
  let testDir: string;
  let loader: AgentLoader;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDir = path.join(process.cwd(), 'config', `agents-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    loader = new AgentLoader({ configDir: testDir });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns valid configs as metadata', async () => {
    const config1 = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Agent 1',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    const config2 = {
      ...config1,
      id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Agent 2',
    };

    await fs.writeFile(path.join(testDir, 'agent1.json'), JSON.stringify(config1));
    await fs.writeFile(path.join(testDir, 'agent2.json'), JSON.stringify(config2));

    const agents = await loader.discoverAgentConfigs();

    expect(agents).toHaveLength(2);
    expect(agents).toContainEqual({ id: config1.id, name: config1.name });
    expect(agents).toContainEqual({ id: config2.id, name: config2.name });
  });

  it('excludes template.json from listing', async () => {
    const validConfig = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Valid Agent',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    // Create both a template and a valid config
    await fs.writeFile(path.join(testDir, 'template.json'), JSON.stringify(validConfig));
    await fs.writeFile(path.join(testDir, 'agent1.json'), JSON.stringify(validConfig));

    const agents = await loader.discoverAgentConfigs();

    // Should only return agent1, not template
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('Valid Agent');
  });

  it('throws error if any config is invalid (fail-fast)', async () => {
    const validConfig = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Valid Agent',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    const invalidConfig = {
      ...validConfig,
      id: 'invalid-uuid', // Invalid UUID format
      name: 'Invalid Agent',
    };

    await fs.writeFile(path.join(testDir, 'valid.json'), JSON.stringify(validConfig));
    await fs.writeFile(path.join(testDir, 'invalid.json'), JSON.stringify(invalidConfig));

    // Should fail-fast on invalid config
    await expect(loader.discoverAgentConfigs()).rejects.toThrow();
  });

  it('throws error when directory is missing', async () => {
    // Create loader pointing to non-existent directory
    const missingDirLoader = new AgentLoader({ configDir: '/nonexistent/path' });

    // Should fail-fast instead of falling back to .env
    await expect(missingDirLoader.discoverAgentConfigs()).rejects.toThrow('ENOENT');
  });

  it('throws error when directory is empty', async () => {
    // testDir exists but is empty - no JSON files
    // Should fail-fast instead of falling back to .env
    await expect(loader.discoverAgentConfigs()).rejects.toThrow(/No agent configs found/);
  });
});

describe('AgentLoader - loadAgentConfig', () => {
  let testDir: string;
  let loader: AgentLoader;

  const validConfig = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Agent',
    systemPrompt: 'You are a test agent',
    personaTag: 'test',
    llm: {
      model: 'test-model',
      temperature: 0.7,
      apiKey: 'test-key',
      apiBase: 'https://api.example.com',
    },
    memory: {
      hotPathLimit: 1000,
      hotPathTokenBudget: 1024,
      recentMessageFloor: 2,
      hotPathMarginPct: 0.3,
      embeddingModel: 'test-embedding',
      embeddingEndpoint: 'https://api.example.com',
      similarityThreshold: 0.5,
      maxTokens: 2048,
      injectionBudget: 1000,
      retrievalTimeoutMs: 5000,
    },
    autonomy: TEST_AUTONOMY_CONFIG,
  };

  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'config', `agents-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    loader = new AgentLoader({ configDir: testDir });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    process.env = { ...ORIGINAL_ENV };
  });

  it('loads valid config by ID', async () => {
    await fs.writeFile(path.join(testDir, 'agent1.json'), JSON.stringify(validConfig));

    const config = await loader.loadAgentConfig(validConfig.id);

    expect(config.id).toBe(validConfig.id);
    expect(config.name).toBe(validConfig.name);
    expect(config.llm.model).toBe(validConfig.llm.model);
  });

  it('throws error for missing required field', async () => {
    const invalidConfig = { ...validConfig };
    delete (invalidConfig as { name?: string }).name;

    await fs.writeFile(path.join(testDir, 'invalid.json'), JSON.stringify(invalidConfig));

    await expect(loader.loadAgentConfig(validConfig.id)).rejects.toThrow();
  });

  it('throws error for invalid UUID format', async () => {
    const invalidConfig = { ...validConfig, id: 'not-a-uuid' };

    await fs.writeFile(path.join(testDir, 'invalid.json'), JSON.stringify(invalidConfig));

    await expect(loader.loadAgentConfig('not-a-uuid')).rejects.toThrow();
  });

  it('throws error for out-of-range temperature', async () => {
    const invalidConfig = { ...validConfig, llm: { ...validConfig.llm, temperature: 5 } };

    await fs.writeFile(path.join(testDir, 'invalid.json'), JSON.stringify(invalidConfig));

    await expect(loader.loadAgentConfig(validConfig.id)).rejects.toThrow();
  });

  it('throws error for negative integers', async () => {
    const invalidConfig = {
      ...validConfig,
      memory: { ...validConfig.memory, hotPathLimit: -100 },
    };

    await fs.writeFile(path.join(testDir, 'invalid.json'), JSON.stringify(invalidConfig));

    await expect(loader.loadAgentConfig(validConfig.id)).rejects.toThrow();
  });

  it('throws error for invalid URL format', async () => {
    const invalidConfig = { ...validConfig, llm: { ...validConfig.llm, apiBase: 'not-a-url' } };

    await fs.writeFile(path.join(testDir, 'invalid.json'), JSON.stringify(invalidConfig));

    await expect(loader.loadAgentConfig(validConfig.id)).rejects.toThrow();
  });

  it('ignores unknown fields (forward compatibility)', async () => {
    const configWithExtra = { ...validConfig, unknownField: 'should be ignored' };

    await fs.writeFile(path.join(testDir, 'extra.json'), JSON.stringify(configWithExtra));

    const config = await loader.loadAgentConfig(validConfig.id);

    expect(config.id).toBe(validConfig.id);
    expect('unknownField' in config).toBe(false);
  });

  it('throws error when config not found', async () => {
    // Create a config file so directory is not empty (avoids .env fallback)
    const otherConfig = { ...validConfig, id: 'other-id-123' };
    await fs.writeFile(path.join(testDir, 'other.json'), JSON.stringify(otherConfig));

    await expect(loader.loadAgentConfig('nonexistent-id')).rejects.toThrow(
      'Agent configuration not found',
    );
  });
});

// Schema-only tests (these work without file system mocking)
describe('AgentConfigSchema validation', () => {
  it('validates complete valid config', async () => {
    const { AgentConfigSchema } = await import('./agent-config.js');

    const validConfig = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Agent',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    const result = AgentConfigSchema.parse(validConfig);
    expect(result).toEqual(validConfig);
  });

  it('rejects missing required field (name)', async () => {
    const { AgentConfigSchema } = await import('./agent-config.js');

    const invalidConfig = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      // name: missing
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    expect(() => AgentConfigSchema.parse(invalidConfig)).toThrow();
  });

  it('rejects invalid UUID format', async () => {
    const { AgentConfigSchema } = await import('./agent-config.js');

    const invalidConfig = {
      id: 'not-a-uuid',
      name: 'Test Agent',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    expect(() => AgentConfigSchema.parse(invalidConfig)).toThrow('Must be a valid UUID v4');
  });

  it('rejects temperature out of range (> 2)', async () => {
    const { AgentConfigSchema } = await import('./agent-config.js');

    const invalidConfig = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Agent',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 5,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    expect(() => AgentConfigSchema.parse(invalidConfig)).toThrow(
      'Temperature must be between 0 and 2',
    );
  });

  it('rejects negative integers (hotPathLimit)', async () => {
    const { AgentConfigSchema } = await import('./agent-config.js');

    const invalidConfig = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Agent',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: -100,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    expect(() => AgentConfigSchema.parse(invalidConfig)).toThrow('Must be a positive integer');
  });

  it('rejects invalid URL format', async () => {
    const { AgentConfigSchema } = await import('./agent-config.js');

    const invalidConfig = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Agent',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'not-a-url',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    expect(() => AgentConfigSchema.parse(invalidConfig)).toThrow('Must be a valid URL');
  });

  it('allows unknown fields (forward compatibility)', async () => {
    const { AgentConfigSchema } = await import('./agent-config.js');

    const configWithExtra = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Agent',
      systemPrompt: 'You are a test agent',
      personaTag: 'test',
      unknownField: 'should be ignored',
      llm: {
        model: 'test-model',
        temperature: 0.7,
        apiKey: 'test-key',
        apiBase: 'https://api.example.com',
      },
      memory: {
        hotPathLimit: 1000,
        hotPathTokenBudget: 1024,
        recentMessageFloor: 2,
        hotPathMarginPct: 0.3,
        embeddingModel: 'test-embedding',
        embeddingEndpoint: 'https://api.example.com',
        similarityThreshold: 0.5,
        maxTokens: 2048,
        injectionBudget: 1000,
        retrievalTimeoutMs: 5000,
      },
      autonomy: TEST_AUTONOMY_CONFIG,
    };

    const result = AgentConfigSchema.parse(configWithExtra);
    // Unknown field should NOT be in result (strict mode)
    expect(result).not.toHaveProperty('unknownField');
  });
});
