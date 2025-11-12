/**
 * LLMConfigSection Component
 *
 * Form section for LLM configuration:
 * - Model (required)
 * - Temperature (0-2, default 0.7)
 * - API Key (required)
 * - API Base URL (required)
 * - Max Tokens (optional)
 *
 * Extracted from AgentForm for better separation of concerns.
 */

import type { AgentConfig } from '@cerebrobot/chat-shared';
import { Stack, Text, Input, Tooltip } from '@workspace/ui';
import { FieldError } from './FieldError.js';

type LLMConfig = NonNullable<AgentConfig['llm']>;

export interface LLMConfigSectionProps {
  llm: LLMConfig;
  onChange: (field: keyof LLMConfig, value: string | number | undefined) => void;
  errors?: Partial<Record<keyof LLMConfig, string>>;
}

export function LLMConfigSection({ llm, onChange, errors }: LLMConfigSectionProps) {
  return (
    <Stack as="section" direction="vertical" gap="6" className="p-6 border-b border-border">
      <Text as="h2" variant="heading" size="xl">
        LLM Config
      </Text>

      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="llm-model" variant="body" className="font-medium">
          Model
        </Text>
        <Tooltip content="LLM model identifier (e.g., deepseek-ai/DeepSeek-V3.1-Terminus)">
          <Input
            id="llm-model"
            type="text"
            value={llm.model}
            onChange={(e) => onChange('model', e.target.value)}
            aria-invalid={errors?.model ? 'true' : 'false'}
            aria-describedby={errors?.model ? 'llm-model-error' : undefined}
          />
        </Tooltip>
        <FieldError fieldId="llm-model" error={errors?.model} />
      </Stack>

      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="llm-temperature" variant="body" className="font-medium">
          Temperature
        </Text>
        <Tooltip content="Randomness in responses (0.0 = deterministic, 1.0 = creative)">
          <Input
            id="llm-temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={llm.temperature}
            onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
            aria-invalid={errors?.temperature ? 'true' : 'false'}
            aria-describedby={errors?.temperature ? 'llm-temperature-error' : undefined}
          />
        </Tooltip>
        <FieldError fieldId="llm-temperature" error={errors?.temperature} />
      </Stack>

      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="llm-api-key" variant="body" className="font-medium">
          API Key
        </Text>
        <Tooltip content="API key for LLM provider authentication">
          <Input
            id="llm-api-key"
            type="password"
            value={llm.apiKey}
            onChange={(e) => onChange('apiKey', e.target.value)}
            aria-invalid={errors?.apiKey ? 'true' : 'false'}
            aria-describedby={errors?.apiKey ? 'llm-api-key-error' : undefined}
          />
        </Tooltip>
        <FieldError fieldId="llm-api-key" error={errors?.apiKey} />
      </Stack>

      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="llm-api-base" variant="body" className="font-medium">
          API Base URL
        </Text>
        <Tooltip content="Base URL for LLM API endpoint">
          <Input
            id="llm-api-base"
            type="url"
            value={llm.apiBase ?? ''}
            onChange={(e) => onChange('apiBase', e.target.value)}
            aria-invalid={errors?.apiBase ? 'true' : 'false'}
            aria-describedby={errors?.apiBase ? 'llm-api-base-error' : undefined}
          />
        </Tooltip>
        <FieldError fieldId="llm-api-base" error={errors?.apiBase} />
      </Stack>

      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="llm-max-tokens" variant="body" className="font-medium">
          Max Tokens{' '}
          <Text as="span" variant="caption" className="text-muted">
            (optional)
          </Text>
        </Text>
        <Tooltip content="Maximum tokens in model response (leave empty for model default)">
          <Input
            id="llm-max-tokens"
            type="number"
            min="1"
            step="1"
            value={llm.maxTokens ?? ''}
            onChange={(e) =>
              onChange('maxTokens', e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            aria-invalid={errors?.maxTokens ? 'true' : 'false'}
            aria-describedby={errors?.maxTokens ? 'llm-max-tokens-error' : undefined}
          />
        </Tooltip>
        <FieldError fieldId="llm-max-tokens" error={errors?.maxTokens} />
      </Stack>
    </Stack>
  );
}
