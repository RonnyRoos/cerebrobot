/**
 * MemoryConfigSection Component
 *
 * Form section for memory configuration (12 fields):
 * - Hot-path management (limit, token budget, margin %, recent message floor)
 * - Embedding config (model, endpoint, apiKey)
 * - Semantic search (similarity threshold, max tokens, injection budget)
 * - Performance (retrieval timeout)
 *
 * Extracted from AgentForm for better separation of concerns.
 */

import type { AgentConfig } from '@cerebrobot/chat-shared';
import { Stack, Text, Input } from '@workspace/ui';
import { FieldError } from './FieldError';

type MemoryConfig = NonNullable<AgentConfig['memory']>;

export interface MemoryConfigSectionProps {
  memory: MemoryConfig;
  onChange: (field: keyof MemoryConfig, value: string | number) => void;
  errors?: Partial<Record<keyof MemoryConfig, string>>;
}

export function MemoryConfigSection({ memory, onChange, errors }: MemoryConfigSectionProps) {
  return (
    <Stack as="section" direction="vertical" gap="6" className="p-6 border-b border-border">
      <Stack direction="vertical" gap="2">
        <Text as="h2" variant="heading" size="xl">
          Memory Config
        </Text>
        <Text as="p" variant="caption" className="text-muted">
          Memory configuration controls semantic retrieval and hot-path management.
        </Text>
      </Stack>

      {/* Hot-Path Management */}
      <Stack direction="vertical" gap="4">
        <Text as="h3" variant="heading" size="lg">
          Hot-Path Management
        </Text>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-hot-path-limit">
            Hot Path Limit
          </Text>
          <Input
            id="memory-hot-path-limit"
            type="number"
            min="1"
            max="1000"
            step="1"
            value={memory.hotPathLimit}
            onChange={(e) => onChange('hotPathLimit', parseInt(e.target.value, 10))}
            aria-invalid={errors?.hotPathLimit ? 'true' : 'false'}
            aria-describedby={errors?.hotPathLimit ? 'memory-hot-path-limit-error' : undefined}
          />
          <FieldError fieldId="memory-hot-path-limit" error={errors?.hotPathLimit} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-hot-path-token-budget">
            Hot Path Token Budget
          </Text>
          <Input
            id="memory-hot-path-token-budget"
            type="number"
            min="100"
            max="50000"
            step="100"
            value={memory.hotPathTokenBudget}
            onChange={(e) => onChange('hotPathTokenBudget', parseInt(e.target.value, 10))}
            aria-invalid={errors?.hotPathTokenBudget ? 'true' : 'false'}
            aria-describedby={
              errors?.hotPathTokenBudget ? 'memory-hot-path-token-budget-error' : undefined
            }
          />
          <FieldError fieldId="memory-hot-path-token-budget" error={errors?.hotPathTokenBudget} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-hot-path-margin-pct">
            Hot Path Margin %
          </Text>
          <Input
            id="memory-hot-path-margin-pct"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={memory.hotPathMarginPct}
            onChange={(e) => onChange('hotPathMarginPct', parseFloat(e.target.value))}
            aria-invalid={errors?.hotPathMarginPct ? 'true' : 'false'}
            aria-describedby={
              errors?.hotPathMarginPct ? 'memory-hot-path-margin-pct-error' : undefined
            }
          />
          <FieldError fieldId="memory-hot-path-margin-pct" error={errors?.hotPathMarginPct} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-recent-message-floor">
            Recent Message Floor
          </Text>
          <Input
            id="memory-recent-message-floor"
            type="number"
            min="0"
            max="100"
            step="1"
            value={memory.recentMessageFloor}
            onChange={(e) => onChange('recentMessageFloor', parseInt(e.target.value, 10))}
            aria-invalid={errors?.recentMessageFloor ? 'true' : 'false'}
            aria-describedby={
              errors?.recentMessageFloor ? 'memory-recent-message-floor-error' : undefined
            }
          />
          <FieldError fieldId="memory-recent-message-floor" error={errors?.recentMessageFloor} />
        </Stack>
      </Stack>

      {/* Embedding Configuration */}
      <Stack direction="vertical" gap="4">
        <Text as="h3" variant="heading" size="lg">
          Embedding Configuration
        </Text>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-embedding-model">
            Embedding Model
          </Text>
          <Input
            id="memory-embedding-model"
            type="text"
            value={memory.embeddingModel}
            onChange={(e) => onChange('embeddingModel', e.target.value)}
            aria-invalid={errors?.embeddingModel ? 'true' : 'false'}
            aria-describedby={errors?.embeddingModel ? 'memory-embedding-model-error' : undefined}
          />
          <FieldError fieldId="memory-embedding-model" error={errors?.embeddingModel} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-embedding-endpoint">
            Embedding Endpoint
          </Text>
          <Input
            id="memory-embedding-endpoint"
            type="url"
            value={memory.embeddingEndpoint}
            onChange={(e) => onChange('embeddingEndpoint', e.target.value)}
            aria-invalid={errors?.embeddingEndpoint ? 'true' : 'false'}
            aria-describedby={
              errors?.embeddingEndpoint ? 'memory-embedding-endpoint-error' : undefined
            }
          />
          <FieldError fieldId="memory-embedding-endpoint" error={errors?.embeddingEndpoint} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-api-key">
            API Key
          </Text>
          <Input
            id="memory-api-key"
            type="password"
            value={memory.apiKey}
            onChange={(e) => onChange('apiKey', e.target.value)}
            aria-invalid={errors?.apiKey ? 'true' : 'false'}
            aria-describedby={errors?.apiKey ? 'memory-api-key-error' : undefined}
          />
          <FieldError fieldId="memory-api-key" error={errors?.apiKey} />
        </Stack>
      </Stack>

      {/* Semantic Search */}
      <Stack direction="vertical" gap="4">
        <Text as="h3" variant="heading" size="lg">
          Semantic Search
        </Text>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-similarity-threshold">
            Similarity Threshold
          </Text>
          <Input
            id="memory-similarity-threshold"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={memory.similarityThreshold}
            onChange={(e) => onChange('similarityThreshold', parseFloat(e.target.value))}
            aria-invalid={errors?.similarityThreshold ? 'true' : 'false'}
            aria-describedby={
              errors?.similarityThreshold ? 'memory-similarity-threshold-error' : undefined
            }
          />
          <FieldError fieldId="memory-similarity-threshold" error={errors?.similarityThreshold} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-max-tokens">
            Max Tokens
          </Text>
          <Input
            id="memory-max-tokens"
            type="number"
            min="100"
            max="50000"
            step="100"
            value={memory.maxTokens}
            onChange={(e) => onChange('maxTokens', parseInt(e.target.value, 10))}
            aria-invalid={errors?.maxTokens ? 'true' : 'false'}
            aria-describedby={errors?.maxTokens ? 'memory-max-tokens-error' : undefined}
          />
          <FieldError fieldId="memory-max-tokens" error={errors?.maxTokens} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-injection-budget">
            Injection Budget
          </Text>
          <Input
            id="memory-injection-budget"
            type="number"
            min="100"
            max="50000"
            step="100"
            value={memory.injectionBudget}
            onChange={(e) => onChange('injectionBudget', parseInt(e.target.value, 10))}
            aria-invalid={errors?.injectionBudget ? 'true' : 'false'}
            aria-describedby={errors?.injectionBudget ? 'memory-injection-budget-error' : undefined}
          />
          <FieldError fieldId="memory-injection-budget" error={errors?.injectionBudget} />
        </Stack>

        <Stack direction="vertical" gap="2">
          <Text as="label" htmlFor="memory-retrieval-timeout-ms">
            Retrieval Timeout (ms)
          </Text>
          <Input
            id="memory-retrieval-timeout-ms"
            type="number"
            min="100"
            max="60000"
            step="100"
            value={memory.retrievalTimeoutMs}
            onChange={(e) => onChange('retrievalTimeoutMs', parseInt(e.target.value, 10))}
            aria-invalid={errors?.retrievalTimeoutMs ? 'true' : 'false'}
            aria-describedby={
              errors?.retrievalTimeoutMs ? 'memory-retrieval-timeout-ms-error' : undefined
            }
          />
          <FieldError fieldId="memory-retrieval-timeout-ms" error={errors?.retrievalTimeoutMs} />
        </Stack>
      </Stack>
    </Stack>
  );
}
