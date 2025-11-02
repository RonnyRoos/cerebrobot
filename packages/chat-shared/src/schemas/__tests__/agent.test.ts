import { describe, expect, it } from 'vitest';
import { AgentConfigSchema, AgentListItemSchema, AgentSchema } from '../agent.js';

/**
 * Helper to create a valid baseline agent config for testing
 */
function createValidAgentConfig() {
  return {
    name: 'Test Agent',
    systemPrompt: 'You are a helpful assistant.',
    personaTag: 'helpful',
    llm: {
      model: 'gpt-4',
      temperature: 0.7,
      apiKey: 'sk-test-key',
      apiBase: 'https://api.openai.com/v1',
      maxTokens: 4000,
    },
    memory: {
      hotPathLimit: 50,
      hotPathTokenBudget: 10000,
      recentMessageFloor: 5,
      hotPathMarginPct: 0.1,
      embeddingModel: 'text-embedding-ada-002',
      embeddingEndpoint: 'https://api.openai.com/v1/embeddings',
      apiKey: 'sk-test-key',
      similarityThreshold: 0.7,
      maxTokens: 5000,
      injectionBudget: 8000,
      retrievalTimeoutMs: 5000,
    },
    autonomy: {
      enabled: false,
      evaluator: {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 500,
        systemPrompt: 'Evaluate if a follow-up is needed.',
      },
      limits: {
        maxFollowUpsPerSession: 10,
        minDelayMs: 5000,
        maxDelayMs: 60000,
      },
      memoryContext: {
        recentMemoryCount: 5,
        includeRecentMessages: 10,
      },
    },
  };
}

describe('AgentConfigSchema', () => {
  describe('valid configurations', () => {
    it('accepts a complete valid configuration', () => {
      const config = createValidAgentConfig();
      expect(() => AgentConfigSchema.parse(config)).not.toThrow();
    });

    it('accepts minimal valid configuration with boundary values', () => {
      const config = createValidAgentConfig();
      config.llm.temperature = 0; // min boundary
      config.llm.maxTokens = 1; // min boundary
      config.memory.hotPathLimit = 1; // min boundary
      config.memory.hotPathTokenBudget = 100; // min boundary
      config.memory.similarityThreshold = 0; // min boundary
      config.autonomy.limits.maxFollowUpsPerSession = 1; // min boundary
      config.autonomy.limits.minDelayMs = 1000; // min boundary
      config.autonomy.memoryContext.recentMemoryCount = 0; // min boundary

      expect(() => AgentConfigSchema.parse(config)).not.toThrow();
    });

    it('accepts maximum boundary values', () => {
      const config = createValidAgentConfig();
      config.name = 'a'.repeat(100); // max length
      config.systemPrompt = 'a'.repeat(10000); // max length
      config.personaTag = 'a'.repeat(50); // max length
      config.llm.temperature = 2; // max boundary
      config.llm.maxTokens = 100000; // max boundary
      config.memory.hotPathLimit = 1000; // max boundary
      config.memory.hotPathTokenBudget = 50000; // max boundary
      config.memory.similarityThreshold = 1; // max boundary
      config.autonomy.evaluator.maxTokens = 10000; // max boundary
      config.autonomy.limits.maxFollowUpsPerSession = 100; // max boundary
      config.autonomy.limits.maxDelayMs = 3600000; // max boundary
      config.autonomy.memoryContext.recentMemoryCount = 100; // max boundary

      expect(() => AgentConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe('name validation', () => {
    it('rejects empty name', () => {
      const config = createValidAgentConfig();
      config.name = '';

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 100 characters', () => {
      const config = createValidAgentConfig();
      config.name = 'a'.repeat(101);

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('systemPrompt validation', () => {
    it('rejects empty systemPrompt', () => {
      const config = createValidAgentConfig();
      config.systemPrompt = '';

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects systemPrompt exceeding 10000 characters', () => {
      const config = createValidAgentConfig();
      config.systemPrompt = 'a'.repeat(10001);

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('personaTag validation', () => {
    it('rejects empty personaTag', () => {
      const config = createValidAgentConfig();
      config.personaTag = '';

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects personaTag exceeding 50 characters', () => {
      const config = createValidAgentConfig();
      config.personaTag = 'a'.repeat(51);

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('llm configuration validation', () => {
    it('rejects temperature below 0', () => {
      const config = createValidAgentConfig();
      config.llm.temperature = -0.1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects temperature above 2', () => {
      const config = createValidAgentConfig();
      config.llm.temperature = 2.1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects maxTokens below 1', () => {
      const config = createValidAgentConfig();
      config.llm.maxTokens = 0;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects maxTokens above 2000000', () => {
      const config = createValidAgentConfig();
      config.llm.maxTokens = 2000001;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects empty apiKey', () => {
      const config = createValidAgentConfig();
      config.llm.apiKey = '';

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects invalid apiBase URL', () => {
      const config = createValidAgentConfig();
      config.llm.apiBase = 'not-a-url';

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('memory configuration validation', () => {
    it('rejects hotPathLimit below 1', () => {
      const config = createValidAgentConfig();
      config.memory.hotPathLimit = 0;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects hotPathLimit above 1000', () => {
      const config = createValidAgentConfig();
      config.memory.hotPathLimit = 1001;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects hotPathTokenBudget below 100', () => {
      const config = createValidAgentConfig();
      config.memory.hotPathTokenBudget = 99;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects hotPathTokenBudget above 2000000', () => {
      const config = createValidAgentConfig();
      config.memory.hotPathTokenBudget = 2000001;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects recentMessageFloor below 0', () => {
      const config = createValidAgentConfig();
      config.memory.recentMessageFloor = -1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects recentMessageFloor above 100', () => {
      const config = createValidAgentConfig();
      config.memory.recentMessageFloor = 101;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects similarityThreshold below 0', () => {
      const config = createValidAgentConfig();
      config.memory.similarityThreshold = -0.1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects similarityThreshold above 1', () => {
      const config = createValidAgentConfig();
      config.memory.similarityThreshold = 1.1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects empty memory apiKey', () => {
      const config = createValidAgentConfig();
      config.memory.apiKey = '';

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects invalid embeddingEndpoint URL', () => {
      const config = createValidAgentConfig();
      config.memory.embeddingEndpoint = 'not-a-url';

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects maxTokens below 100', () => {
      const config = createValidAgentConfig();
      config.memory.maxTokens = 99;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects maxTokens above 2000000', () => {
      const config = createValidAgentConfig();
      config.memory.maxTokens = 2000001;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects retrievalTimeoutMs below 100', () => {
      const config = createValidAgentConfig();
      config.memory.retrievalTimeoutMs = 99;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects retrievalTimeoutMs above 60000', () => {
      const config = createValidAgentConfig();
      config.memory.retrievalTimeoutMs = 60001;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('autonomy configuration validation', () => {
    it('rejects evaluator maxTokens below 1', () => {
      const config = createValidAgentConfig();
      config.autonomy.evaluator.maxTokens = 0;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects evaluator maxTokens above 2000000', () => {
      const config = createValidAgentConfig();
      config.autonomy.evaluator.maxTokens = 2000001;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects evaluator temperature below 0', () => {
      const config = createValidAgentConfig();
      config.autonomy.evaluator.temperature = -0.1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects evaluator temperature above 2', () => {
      const config = createValidAgentConfig();
      config.autonomy.evaluator.temperature = 2.1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects maxFollowUpsPerSession below 1', () => {
      const config = createValidAgentConfig();
      config.autonomy.limits.maxFollowUpsPerSession = 0;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects maxFollowUpsPerSession above 100', () => {
      const config = createValidAgentConfig();
      config.autonomy.limits.maxFollowUpsPerSession = 101;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects minDelayMs below 1000', () => {
      const config = createValidAgentConfig();
      config.autonomy.limits.minDelayMs = 999;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects minDelayMs above 3600000', () => {
      const config = createValidAgentConfig();
      config.autonomy.limits.minDelayMs = 3600001;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects maxDelayMs below 1000', () => {
      const config = createValidAgentConfig();
      config.autonomy.limits.maxDelayMs = 999;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects maxDelayMs above 3600000', () => {
      const config = createValidAgentConfig();
      config.autonomy.limits.maxDelayMs = 3600001;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects recentMemoryCount below 0', () => {
      const config = createValidAgentConfig();
      config.autonomy.memoryContext.recentMemoryCount = -1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects recentMemoryCount above 100', () => {
      const config = createValidAgentConfig();
      config.autonomy.memoryContext.recentMemoryCount = 101;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects includeRecentMessages below 0', () => {
      const config = createValidAgentConfig();
      config.autonomy.memoryContext.includeRecentMessages = -1;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects includeRecentMessages above 100', () => {
      const config = createValidAgentConfig();
      config.autonomy.memoryContext.includeRecentMessages = 101;

      const result = AgentConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});

describe('AgentListItemSchema', () => {
  it('accepts a valid agent list item', () => {
    const item = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Agent',
      createdAt: '2025-10-31T14:30:00.000Z',
      updatedAt: '2025-10-31T14:30:00.000Z',
      autonomyEnabled: false,
    };

    expect(() => AgentListItemSchema.parse(item)).not.toThrow();
  });

  it('rejects invalid UUID', () => {
    const item = {
      id: 'not-a-uuid',
      name: 'Test Agent',
      createdAt: '2025-10-31T14:30:00.000Z',
      updatedAt: '2025-10-31T14:30:00.000Z',
      autonomyEnabled: false,
    };

    const result = AgentListItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime', () => {
    const item = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Agent',
      createdAt: 'not-a-datetime',
      updatedAt: '2025-10-31T14:30:00.000Z',
      autonomyEnabled: false,
    };

    const result = AgentListItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });
});

describe('AgentSchema', () => {
  it('accepts a complete agent with metadata', () => {
    const agent = {
      ...createValidAgentConfig(),
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2025-10-31T14:30:00.000Z',
      updatedAt: '2025-10-31T14:30:00.000Z',
    };

    expect(() => AgentSchema.parse(agent)).not.toThrow();
  });

  it('rejects agent without id', () => {
    const agent = {
      ...createValidAgentConfig(),
      createdAt: '2025-10-31T14:30:00.000Z',
      updatedAt: '2025-10-31T14:30:00.000Z',
    };

    const result = AgentSchema.safeParse(agent);
    expect(result.success).toBe(false);
  });

  it('rejects agent without timestamps', () => {
    const agent = {
      ...createValidAgentConfig(),
      id: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = AgentSchema.safeParse(agent);
    expect(result.success).toBe(false);
  });
});
