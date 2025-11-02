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
import { FieldError } from './FieldError.js';
import './LLMConfigSection.css';

type LLMConfig = NonNullable<AgentConfig['llm']>;

export interface LLMConfigSectionProps {
  llm: LLMConfig;
  onChange: (field: keyof LLMConfig, value: string | number | undefined) => void;
  errors?: Partial<Record<keyof LLMConfig, string>>;
}

export function LLMConfigSection({ llm, onChange, errors }: LLMConfigSectionProps) {
  return (
    <section className="form-section llm-config-section">
      <h2 className="section-heading">LLM Config</h2>

      <div className="form-group">
        <label htmlFor="llm-model">Model</label>
        <input
          id="llm-model"
          type="text"
          value={llm.model}
          onChange={(e) => onChange('model', e.target.value)}
          aria-invalid={errors?.model ? 'true' : 'false'}
          aria-describedby={errors?.model ? 'llm-model-error' : undefined}
        />
        <FieldError fieldId="llm-model" error={errors?.model} />
      </div>

      <div className="form-group">
        <label htmlFor="llm-temperature">Temperature</label>
        <input
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
        <FieldError fieldId="llm-temperature" error={errors?.temperature} />
      </div>

      <div className="form-group">
        <label htmlFor="llm-api-key">API Key</label>
        <input
          id="llm-api-key"
          type="password"
          value={llm.apiKey}
          onChange={(e) => onChange('apiKey', e.target.value)}
          aria-invalid={errors?.apiKey ? 'true' : 'false'}
          aria-describedby={errors?.apiKey ? 'llm-api-key-error' : undefined}
        />
        <FieldError fieldId="llm-api-key" error={errors?.apiKey} />
      </div>

      <div className="form-group">
        <label htmlFor="llm-api-base">API Base URL</label>
        <input
          id="llm-api-base"
          type="url"
          value={llm.apiBase ?? ''}
          onChange={(e) => onChange('apiBase', e.target.value)}
          aria-invalid={errors?.apiBase ? 'true' : 'false'}
          aria-describedby={errors?.apiBase ? 'llm-api-base-error' : undefined}
        />
        <FieldError fieldId="llm-api-base" error={errors?.apiBase} />
      </div>

      <div className="form-group">
        <label htmlFor="llm-max-tokens">
          Max Tokens <span className="optional-label">(optional)</span>
        </label>
        <input
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
        <FieldError fieldId="llm-max-tokens" error={errors?.maxTokens} />
      </div>
    </section>
  );
}
