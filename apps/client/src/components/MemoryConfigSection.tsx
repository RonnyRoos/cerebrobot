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
import { FieldError } from './FieldError';
import './MemoryConfigSection.css';

type MemoryConfig = NonNullable<AgentConfig['memory']>;

export interface MemoryConfigSectionProps {
  memory: MemoryConfig;
  onChange: (field: keyof MemoryConfig, value: string | number) => void;
  errors?: Partial<Record<keyof MemoryConfig, string>>;
}

export function MemoryConfigSection({ memory, onChange, errors }: MemoryConfigSectionProps) {
  return (
    <section className="form-section memory-config-section">
      <h2 className="section-heading">Memory Config</h2>
      <p className="section-description">
        Memory configuration controls semantic retrieval and hot-path management.
      </p>

      {/* Hot-Path Management */}
      <div className="subsection">
        <h3 className="subsection-heading">Hot-Path Management</h3>

        <div className="form-group">
          <label htmlFor="memory-hot-path-limit">Hot Path Limit</label>
          <input
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
        </div>

        <div className="form-group">
          <label htmlFor="memory-hot-path-token-budget">Hot Path Token Budget</label>
          <input
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
        </div>

        <div className="form-group">
          <label htmlFor="memory-hot-path-margin-pct">Hot Path Margin %</label>
          <input
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
        </div>

        <div className="form-group">
          <label htmlFor="memory-recent-message-floor">Recent Message Floor</label>
          <input
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
        </div>
      </div>

      {/* Embedding Configuration */}
      <div className="subsection">
        <h3 className="subsection-heading">Embedding Configuration</h3>

        <div className="form-group">
          <label htmlFor="memory-embedding-model">Embedding Model</label>
          <input
            id="memory-embedding-model"
            type="text"
            value={memory.embeddingModel}
            onChange={(e) => onChange('embeddingModel', e.target.value)}
            aria-invalid={errors?.embeddingModel ? 'true' : 'false'}
            aria-describedby={errors?.embeddingModel ? 'memory-embedding-model-error' : undefined}
          />
          <FieldError fieldId="memory-embedding-model" error={errors?.embeddingModel} />
        </div>

        <div className="form-group">
          <label htmlFor="memory-embedding-endpoint">Embedding Endpoint</label>
          <input
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
        </div>

        <div className="form-group">
          <label htmlFor="memory-api-key">API Key</label>
          <input
            id="memory-api-key"
            type="password"
            value={memory.apiKey}
            onChange={(e) => onChange('apiKey', e.target.value)}
            aria-invalid={errors?.apiKey ? 'true' : 'false'}
            aria-describedby={errors?.apiKey ? 'memory-api-key-error' : undefined}
          />
          <FieldError fieldId="memory-api-key" error={errors?.apiKey} />
        </div>
      </div>

      {/* Semantic Search */}
      <div className="subsection">
        <h3 className="subsection-heading">Semantic Search</h3>

        <div className="form-group">
          <label htmlFor="memory-similarity-threshold">Similarity Threshold</label>
          <input
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
        </div>

        <div className="form-group">
          <label htmlFor="memory-max-tokens">Max Tokens</label>
          <input
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
        </div>

        <div className="form-group">
          <label htmlFor="memory-injection-budget">Injection Budget</label>
          <input
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
        </div>

        <div className="form-group">
          <label htmlFor="memory-retrieval-timeout-ms">Retrieval Timeout (ms)</label>
          <input
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
        </div>
      </div>
    </section>
  );
}
