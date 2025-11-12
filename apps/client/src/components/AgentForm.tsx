/**
 * AgentForm Component
 *
 * Form for creating and editing agent configurations.
 * Supports both create and edit modes with validation.
 *
 * Features:
 * - Multi-section form (Basic Info, LLM, Memory, Autonomy)
 * - Real-time validation via useValidation hook
 * - Create and Edit modes
 * - Autonomy toggle (show/hide config)
 */

import { useState, useEffect } from 'react';
import type { Agent, AgentConfig } from '@cerebrobot/chat-shared';
import { AgentConfigSchema } from '@cerebrobot/chat-shared';
import { Stack, Button } from '@workspace/ui';
import { useValidation } from '../hooks/useValidation.js';
import { ValidationMessage } from './ValidationMessage.js';
import { BasicInfoSection } from './BasicInfoSection.js';
import { LLMConfigSection } from './LLMConfigSection.js';
import { MemoryConfigSection } from './MemoryConfigSection.js';
import { SummarizerConfigSection } from './SummarizerConfigSection.js';
import { AutonomyConfigSection } from './AutonomyConfigSection.js';

export interface AgentFormProps {
  mode: 'create' | 'edit';
  initialData?: Agent;
  onSubmit: (config: AgentConfig) => void;
  onCancel: () => void;
}

/**
 * Get initial form values based on mode
 */
function getInitialFormData(mode: 'create' | 'edit', initialData?: Agent): Partial<AgentConfig> {
  if (mode === 'edit' && initialData) {
    return {
      name: initialData.name,
      systemPrompt: initialData.systemPrompt,
      personaTag: initialData.personaTag,
      llm: initialData.llm,
      memory: initialData.memory,
      autonomy: initialData.autonomy,
    };
  }

  // Default empty form for create mode
  return {
    name: '',
    systemPrompt: '',
    personaTag: '',
    llm: {
      model: '',
      temperature: 0.7,
      apiKey: '',
      apiBase: 'https://api.deepinfra.com/v1/openai',
    },
    memory: {
      hotPathLimit: 50,
      hotPathTokenBudget: 10000,
      recentMessageFloor: 5,
      hotPathMarginPct: 0.1,
      embeddingModel: 'Qwen/Qwen3-Embedding-8B',
      embeddingEndpoint: 'https://api.deepinfra.com/v1/openai',
      apiKey: '',
      similarityThreshold: 0.7,
      maxTokens: 5000,
      injectionBudget: 8000,
      retrievalTimeoutMs: 5000,
    },
    autonomy: {
      enabled: false,
      // When autonomy is disabled, leave nested fields undefined so Zod skips validation
      evaluator: undefined,
      limits: undefined,
      memoryContext: undefined,
    },
  };
}

export function AgentForm({ mode, initialData, onSubmit, onCancel }: AgentFormProps) {
  const [formData, setFormData] = useState<Partial<AgentConfig>>(() =>
    getInitialFormData(mode, initialData),
  );

  // Validation hook
  const { errors, validate, validateImmediate } = useValidation(AgentConfigSchema, 500);

  // Validate on form data changes (debounced)
  useEffect(() => {
    validate(formData);
  }, [formData, validate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate immediately and check result synchronously
    const result = AgentConfigSchema.safeParse(formData);

    // Update validation state
    validateImmediate(formData);

    // Only submit if valid
    if (!result.success) {
      return;
    }

    onSubmit(formData as AgentConfig);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    onCancel();
  };

  const handleFieldChange = (field: keyof AgentConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLLMFieldChange = (
    field: keyof NonNullable<AgentConfig['llm']>,
    value: string | number | undefined,
  ) => {
    setFormData((prev) => ({
      ...prev,
      llm: {
        ...prev.llm!,
        [field]: value,
      },
    }));
  };

  const handleMemoryFieldChange = (
    field: keyof NonNullable<AgentConfig['memory']>,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      memory: {
        ...prev.memory!,
        [field]: value,
      },
    }));
  };

  const handleSummarizerChange = (
    summarizer: NonNullable<AgentConfig['summarizer']> | undefined,
  ) => {
    setFormData((prev) => ({
      ...prev,
      summarizer,
    }));
  };

  const handleAutonomyToggle = () => {
    setFormData((prev) => {
      const newEnabled = !prev.autonomy?.enabled;

      return {
        ...prev,
        autonomy: {
          enabled: newEnabled,
          // When enabling, initialize with defaults; when disabling, set to undefined
          evaluator: newEnabled
            ? prev.autonomy?.evaluator ?? {
                model: '',
                temperature: 0.5,
                maxTokens: 500,
                systemPrompt: '',
              }
            : undefined,
          limits: newEnabled
            ? prev.autonomy?.limits ?? {
                maxFollowUpsPerSession: 10,
                minDelayMs: 5000,
                maxDelayMs: 60000,
              }
            : undefined,
          memoryContext: newEnabled
            ? prev.autonomy?.memoryContext ?? {
                recentMemoryCount: 5,
                includeRecentMessages: 10,
              }
            : undefined,
        },
      };
    });
  };

  const handleAutonomyEvaluatorChange = (
    field: keyof NonNullable<AgentConfig['autonomy']>['evaluator'],
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      autonomy: {
        ...prev.autonomy!,
        evaluator: {
          ...prev.autonomy!.evaluator,
          [field]: value,
        },
      },
    }));
  };

  const handleAutonomyLimitsChange = (
    field: keyof NonNullable<AgentConfig['autonomy']>['limits'],
    value: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      autonomy: {
        ...prev.autonomy!,
        limits: {
          ...prev.autonomy!.limits,
          [field]: value,
        },
      },
    }));
  };

  const handleAutonomyMemoryContextChange = (
    field: keyof NonNullable<AgentConfig['autonomy']>['memoryContext'],
    value: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      autonomy: {
        ...prev.autonomy!,
        memoryContext: {
          ...prev.autonomy!.memoryContext,
          [field]: value,
        },
      },
    }));
  };

  // Extract field-specific errors from flat error object
  const getFieldErrors = (prefix: string) => {
    const fieldErrors: Record<string, string> = {};
    Object.keys(errors).forEach((key) => {
      if (key.startsWith(prefix + '.')) {
        const fieldName = key.substring(prefix.length + 1);
        fieldErrors[fieldName] = errors[key];
      } else if (key === prefix) {
        fieldErrors[key] = errors[key];
      }
    });
    return fieldErrors;
  };

  // Get top-level field errors (name, systemPrompt, personaTag)
  const basicInfoErrors = {
    name: errors['name'],
    systemPrompt: errors['systemPrompt'],
    personaTag: errors['personaTag'],
  };

  const llmErrors = getFieldErrors('llm');
  const memoryErrors = getFieldErrors('memory');
  const summarizerErrors = getFieldErrors('summarizer');
  const autonomyEvaluatorErrors = getFieldErrors('autonomy.evaluator');
  const autonomyLimitsErrors = getFieldErrors('autonomy.limits');
  const autonomyMemoryContextErrors = getFieldErrors('autonomy.memoryContext');

  // Check if there are any validation errors to show
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Stack as="form" direction="vertical" gap="0" aria-label="form" onSubmit={handleSubmit}>
      {/* Validation Message */}
      {hasErrors && (
        <Stack className="p-6 border-b border-border">
          <ValidationMessage errors={['Please fix the validation errors below']} severity="error" />
        </Stack>
      )}

      {/* Basic Info Section */}
      <BasicInfoSection
        name={formData.name ?? ''}
        systemPrompt={formData.systemPrompt ?? ''}
        personaTag={formData.personaTag ?? ''}
        onChange={handleFieldChange}
        errors={basicInfoErrors}
      />

      {/* LLM Config Section */}
      <LLMConfigSection llm={formData.llm!} onChange={handleLLMFieldChange} errors={llmErrors} />

      {/* Memory Config Section */}
      <MemoryConfigSection
        memory={formData.memory!}
        onChange={handleMemoryFieldChange}
        errors={memoryErrors}
      />

      {/* Summarizer Config Section */}
      <SummarizerConfigSection
        summarizer={formData.summarizer}
        onChange={handleSummarizerChange}
        errors={summarizerErrors}
      />

      {/* Autonomy Section */}
      <AutonomyConfigSection
        autonomy={formData.autonomy!}
        onToggle={handleAutonomyToggle}
        onEvaluatorChange={handleAutonomyEvaluatorChange}
        onLimitsChange={handleAutonomyLimitsChange}
        onMemoryContextChange={handleAutonomyMemoryContextChange}
        errors={{
          evaluator: autonomyEvaluatorErrors,
          limits: autonomyLimitsErrors,
          memoryContext: autonomyMemoryContextErrors,
        }}
      />

      {/* Form Actions */}
      <Stack
        direction="horizontal"
        gap="4"
        className="p-6 border-t border-border bg-background sticky bottom-0"
      >
        <Button type="submit" variant="primary" disabled={hasErrors}>
          {mode === 'create' ? 'Create' : 'Update'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
