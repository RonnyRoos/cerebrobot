/**
 * AutonomyConfigSection Component
 *
 * Form section for autonomy configuration with conditional rendering:
 * - Enable checkbox (top-level toggle)
 * - When enabled, show 3 subsections:
 *   - Evaluator: model, temperature, maxTokens, systemPrompt
 *   - Limits: maxFollowUpsPerSession, minDelayMs, maxDelayMs
 *   - Memory Context: recentMemoryCount, includeRecentMessages
 *
 * Extracted from AgentForm for better separation of concerns.
 */

import type { AgentConfig } from '@cerebrobot/chat-shared';
import { FieldError } from './FieldError';
import './AutonomyConfigSection.css';

type AutonomyConfig = NonNullable<AgentConfig['autonomy']>;
type EvaluatorConfig = AutonomyConfig['evaluator'];
type LimitsConfig = AutonomyConfig['limits'];
type MemoryContextConfig = AutonomyConfig['memoryContext'];

export interface AutonomyConfigSectionProps {
  autonomy: AutonomyConfig;
  onToggle: () => void;
  onEvaluatorChange: (field: keyof EvaluatorConfig, value: string | number) => void;
  onLimitsChange: (field: keyof LimitsConfig, value: number) => void;
  onMemoryContextChange: (field: keyof MemoryContextConfig, value: number) => void;
  errors?: {
    evaluator?: Partial<Record<keyof EvaluatorConfig, string>>;
    limits?: Partial<Record<keyof LimitsConfig, string>>;
    memoryContext?: Partial<Record<keyof MemoryContextConfig, string>>;
  };
}

export function AutonomyConfigSection({
  autonomy,
  onToggle,
  onEvaluatorChange,
  onLimitsChange,
  onMemoryContextChange,
  errors,
}: AutonomyConfigSectionProps) {
  return (
    <section className="form-section autonomy-config-section">
      <h2 className="section-heading">Autonomy</h2>

      <div className="form-group">
        <label>
          <input type="checkbox" checked={autonomy.enabled} onChange={onToggle} />
          Enable Autonomy
        </label>
      </div>

      {autonomy.enabled && (
        <div className="autonomy-config">
          {/* Evaluator Configuration */}
          <div className="subsection">
            <h3 className="subsection-heading">Evaluator</h3>

            <div className="form-group">
              <label htmlFor="autonomy-evaluator-model">Model</label>
              <input
                id="autonomy-evaluator-model"
                type="text"
                value={autonomy.evaluator.model}
                onChange={(e) => onEvaluatorChange('model', e.target.value)}
                aria-invalid={errors?.evaluator?.model ? 'true' : 'false'}
                aria-describedby={
                  errors?.evaluator?.model ? 'autonomy-evaluator-model-error' : undefined
                }
              />
              <FieldError fieldId="autonomy-evaluator-model" error={errors?.evaluator?.model} />
            </div>

            <div className="form-group">
              <label htmlFor="autonomy-evaluator-temperature">Temperature</label>
              <input
                id="autonomy-evaluator-temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={autonomy.evaluator.temperature}
                onChange={(e) => onEvaluatorChange('temperature', parseFloat(e.target.value))}
                aria-invalid={errors?.evaluator?.temperature ? 'true' : 'false'}
                aria-describedby={
                  errors?.evaluator?.temperature
                    ? 'autonomy-evaluator-temperature-error'
                    : undefined
                }
              />
              <FieldError
                fieldId="autonomy-evaluator-temperature"
                error={errors?.evaluator?.temperature}
              />
            </div>

            <div className="form-group">
              <label htmlFor="autonomy-evaluator-max-tokens">Max Tokens</label>
              <input
                id="autonomy-evaluator-max-tokens"
                type="number"
                min="1"
                max="10000"
                step="1"
                value={autonomy.evaluator.maxTokens}
                onChange={(e) => onEvaluatorChange('maxTokens', parseInt(e.target.value, 10))}
                aria-invalid={errors?.evaluator?.maxTokens ? 'true' : 'false'}
                aria-describedby={
                  errors?.evaluator?.maxTokens ? 'autonomy-evaluator-max-tokens-error' : undefined
                }
              />
              <FieldError
                fieldId="autonomy-evaluator-max-tokens"
                error={errors?.evaluator?.maxTokens}
              />
            </div>

            <div className="form-group">
              <label htmlFor="autonomy-evaluator-system-prompt">System Prompt</label>
              <textarea
                id="autonomy-evaluator-system-prompt"
                value={autonomy.evaluator.systemPrompt}
                onChange={(e) => onEvaluatorChange('systemPrompt', e.target.value)}
                rows={4}
                aria-invalid={errors?.evaluator?.systemPrompt ? 'true' : 'false'}
                aria-describedby={
                  errors?.evaluator?.systemPrompt
                    ? 'autonomy-evaluator-system-prompt-error'
                    : undefined
                }
              />
              <FieldError
                fieldId="autonomy-evaluator-system-prompt"
                error={errors?.evaluator?.systemPrompt}
              />
            </div>
          </div>

          {/* Limits Configuration */}
          <div className="subsection">
            <h3 className="subsection-heading">Limits</h3>

            <div className="form-group">
              <label htmlFor="autonomy-limits-max-followups">Max Follow-ups Per Session</label>
              <input
                id="autonomy-limits-max-followups"
                type="number"
                min="1"
                max="100"
                step="1"
                value={autonomy.limits.maxFollowUpsPerSession}
                onChange={(e) =>
                  onLimitsChange('maxFollowUpsPerSession', parseInt(e.target.value, 10))
                }
                aria-invalid={errors?.limits?.maxFollowUpsPerSession ? 'true' : 'false'}
                aria-describedby={
                  errors?.limits?.maxFollowUpsPerSession
                    ? 'autonomy-limits-max-followups-error'
                    : undefined
                }
              />
              <FieldError
                fieldId="autonomy-limits-max-followups"
                error={errors?.limits?.maxFollowUpsPerSession}
              />
            </div>

            <div className="form-group">
              <label htmlFor="autonomy-limits-min-delay">Min Delay (ms)</label>
              <input
                id="autonomy-limits-min-delay"
                type="number"
                min="1000"
                max="3600000"
                step="1000"
                value={autonomy.limits.minDelayMs}
                onChange={(e) => onLimitsChange('minDelayMs', parseInt(e.target.value, 10))}
                aria-invalid={errors?.limits?.minDelayMs ? 'true' : 'false'}
                aria-describedby={
                  errors?.limits?.minDelayMs ? 'autonomy-limits-min-delay-error' : undefined
                }
              />
              <FieldError fieldId="autonomy-limits-min-delay" error={errors?.limits?.minDelayMs} />
            </div>

            <div className="form-group">
              <label htmlFor="autonomy-limits-max-delay">Max Delay (ms)</label>
              <input
                id="autonomy-limits-max-delay"
                type="number"
                min="1000"
                max="3600000"
                step="1000"
                value={autonomy.limits.maxDelayMs}
                onChange={(e) => onLimitsChange('maxDelayMs', parseInt(e.target.value, 10))}
                aria-invalid={errors?.limits?.maxDelayMs ? 'true' : 'false'}
                aria-describedby={
                  errors?.limits?.maxDelayMs ? 'autonomy-limits-max-delay-error' : undefined
                }
              />
              <FieldError fieldId="autonomy-limits-max-delay" error={errors?.limits?.maxDelayMs} />
            </div>
          </div>

          {/* Memory Context Configuration */}
          <div className="subsection">
            <h3 className="subsection-heading">Memory Context</h3>

            <div className="form-group">
              <label htmlFor="autonomy-memory-recent-count">Recent Memory Count</label>
              <input
                id="autonomy-memory-recent-count"
                type="number"
                min="0"
                max="100"
                step="1"
                value={autonomy.memoryContext.recentMemoryCount}
                onChange={(e) =>
                  onMemoryContextChange('recentMemoryCount', parseInt(e.target.value, 10))
                }
                aria-invalid={errors?.memoryContext?.recentMemoryCount ? 'true' : 'false'}
                aria-describedby={
                  errors?.memoryContext?.recentMemoryCount
                    ? 'autonomy-memory-recent-count-error'
                    : undefined
                }
              />
              <FieldError
                fieldId="autonomy-memory-recent-count"
                error={errors?.memoryContext?.recentMemoryCount}
              />
            </div>

            <div className="form-group">
              <label htmlFor="autonomy-memory-recent-messages">Include Recent Messages</label>
              <input
                id="autonomy-memory-recent-messages"
                type="number"
                min="0"
                max="100"
                step="1"
                value={autonomy.memoryContext.includeRecentMessages}
                onChange={(e) =>
                  onMemoryContextChange('includeRecentMessages', parseInt(e.target.value, 10))
                }
                aria-invalid={errors?.memoryContext?.includeRecentMessages ? 'true' : 'false'}
                aria-describedby={
                  errors?.memoryContext?.includeRecentMessages
                    ? 'autonomy-memory-recent-messages-error'
                    : undefined
                }
              />
              <FieldError
                fieldId="autonomy-memory-recent-messages"
                error={errors?.memoryContext?.includeRecentMessages}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
