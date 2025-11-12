/**
 * SummarizerConfigSection Component
 *
 * Form section for Summarizer configuration (Spec 017 - Phase 6):
 * - Model (optional - defaults to main LLM if not set)
 * - Temperature (0-2, optional)
 * - Token Budget (optional)
 * - API Key (optional - uses main LLM key if not set)
 * - API Base URL (optional - uses main LLM base if not set)
 *
 * Summarizer is used for conversation summarization when message count exceeds limits.
 * If not configured, the main LLM settings are used.
 */

import type { AgentConfig } from '@cerebrobot/chat-shared';
import { Stack, Text, Input, Tooltip, Button } from '@workspace/ui';
import { FieldError } from './FieldError.js';
import { useState } from 'react';

type SummarizerConfig = NonNullable<AgentConfig['summarizer']>;

export interface SummarizerConfigSectionProps {
  summarizer?: SummarizerConfig;
  onChange: (summarizer: SummarizerConfig | undefined) => void;
  errors?: Partial<Record<keyof SummarizerConfig, string>>;
}

export function SummarizerConfigSection({
  summarizer,
  onChange,
  errors,
}: SummarizerConfigSectionProps) {
  const [isEnabled, setIsEnabled] = useState(!!summarizer);

  const handleToggle = () => {
    if (isEnabled) {
      // Disable - clear summarizer config
      setIsEnabled(false);
      onChange(undefined);
    } else {
      // Enable - set default config
      setIsEnabled(true);
      onChange({
        model: '',
        temperature: 0,
        tokenBudget: 8000,
      });
    }
  };

  const handleChange = (field: keyof SummarizerConfig, value: string | number | undefined) => {
    if (!summarizer) return;
    onChange({ ...summarizer, [field]: value });
  };

  return (
    <Stack as="section" direction="vertical" gap="6" className="p-6 border-b border-border">
      <Stack direction="horizontal" gap="4" className="items-center justify-between">
        <Stack direction="vertical" gap="1">
          <Text as="h2" variant="heading" size="xl">
            Summarizer Config
          </Text>
          <Text variant="caption" className="text-muted">
            Use a separate (cheaper) model for conversation summarization
          </Text>
        </Stack>
        <Button
          type="button"
          variant={isEnabled ? 'danger' : 'secondary'}
          onClick={handleToggle}
          size="sm"
        >
          {isEnabled ? 'Disable' : 'Enable'}
        </Button>
      </Stack>

      {isEnabled && summarizer && (
        <>
          <Stack direction="vertical" gap="2">
            <Text as="label" htmlFor="summarizer-model" variant="body" className="font-medium">
              Model{' '}
              <Text as="span" variant="caption" className="text-muted">
                (optional - uses main LLM if empty)
              </Text>
            </Text>
            <Tooltip content="Cheaper model for summarization (e.g., deepseek-ai/DeepSeek-R1-Distill-Llama-70B)">
              <Input
                id="summarizer-model"
                type="text"
                value={summarizer.model ?? ''}
                onChange={(e) => handleChange('model', e.target.value || undefined)}
                placeholder="Leave empty to use main LLM model"
                aria-invalid={errors?.model ? 'true' : 'false'}
                aria-describedby={errors?.model ? 'summarizer-model-error' : undefined}
              />
            </Tooltip>
            <FieldError fieldId="summarizer-model" error={errors?.model} />
          </Stack>

          <Stack direction="vertical" gap="2">
            <Text
              as="label"
              htmlFor="summarizer-temperature"
              variant="body"
              className="font-medium"
            >
              Temperature{' '}
              <Text as="span" variant="caption" className="text-muted">
                (optional)
              </Text>
            </Text>
            <Tooltip content="Lower values (0-0.2) recommended for factual summarization">
              <Input
                id="summarizer-temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={summarizer.temperature ?? ''}
                onChange={(e) =>
                  handleChange(
                    'temperature',
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="0"
                aria-invalid={errors?.temperature ? 'true' : 'false'}
                aria-describedby={errors?.temperature ? 'summarizer-temperature-error' : undefined}
              />
            </Tooltip>
            <FieldError fieldId="summarizer-temperature" error={errors?.temperature} />
          </Stack>

          <Stack direction="vertical" gap="2">
            <Text
              as="label"
              htmlFor="summarizer-token-budget"
              variant="body"
              className="font-medium"
            >
              Token Budget{' '}
              <Text as="span" variant="caption" className="text-muted">
                (optional)
              </Text>
            </Text>
            <Tooltip content="Maximum tokens for summarization context (default: 8000)">
              <Input
                id="summarizer-token-budget"
                type="number"
                min="1000"
                step="1000"
                value={summarizer.tokenBudget ?? ''}
                onChange={(e) =>
                  handleChange(
                    'tokenBudget',
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                placeholder="8000"
                aria-invalid={errors?.tokenBudget ? 'true' : 'false'}
                aria-describedby={errors?.tokenBudget ? 'summarizer-token-budget-error' : undefined}
              />
            </Tooltip>
            <FieldError fieldId="summarizer-token-budget" error={errors?.tokenBudget} />
          </Stack>

          <Stack direction="vertical" gap="2">
            <Text as="label" htmlFor="summarizer-api-key" variant="body" className="font-medium">
              API Key{' '}
              <Text as="span" variant="caption" className="text-muted">
                (optional - uses main LLM key if empty)
              </Text>
            </Text>
            <Tooltip content="API key for summarizer model (leave empty to use main LLM key)">
              <Input
                id="summarizer-api-key"
                type="password"
                value={summarizer.apiKey ?? ''}
                onChange={(e) => handleChange('apiKey', e.target.value || undefined)}
                placeholder="Leave empty to use main LLM API key"
                aria-invalid={errors?.apiKey ? 'true' : 'false'}
                aria-describedby={errors?.apiKey ? 'summarizer-api-key-error' : undefined}
              />
            </Tooltip>
            <FieldError fieldId="summarizer-api-key" error={errors?.apiKey} />
          </Stack>

          <Stack direction="vertical" gap="2">
            <Text as="label" htmlFor="summarizer-api-base" variant="body" className="font-medium">
              API Base URL{' '}
              <Text as="span" variant="caption" className="text-muted">
                (optional - uses main LLM base if empty)
              </Text>
            </Text>
            <Tooltip content="Base URL for summarizer API (leave empty to use main LLM base)">
              <Input
                id="summarizer-api-base"
                type="url"
                value={summarizer.apiBase ?? ''}
                onChange={(e) => handleChange('apiBase', e.target.value || undefined)}
                placeholder="Leave empty to use main LLM API base"
                aria-invalid={errors?.apiBase ? 'true' : 'false'}
                aria-describedby={errors?.apiBase ? 'summarizer-api-base-error' : undefined}
              />
            </Tooltip>
            <FieldError fieldId="summarizer-api-base" error={errors?.apiBase} />
          </Stack>
        </>
      )}
    </Stack>
  );
}
