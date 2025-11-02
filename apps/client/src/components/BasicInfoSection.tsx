/**
 * BasicInfoSection Component
 *
 * Form section for basic agent information:
 * - Name (required)
 * - System Prompt (required)
 * - Persona Tag (required)
 *
 * Extracted from AgentForm for better separation of concerns.
 */

import { FieldError } from './FieldError.js';
import './BasicInfoSection.css';

export interface BasicInfoSectionProps {
  name: string;
  systemPrompt: string;
  personaTag: string;
  onChange: (field: 'name' | 'systemPrompt' | 'personaTag', value: string) => void;
  errors?: Partial<Record<'name' | 'systemPrompt' | 'personaTag', string>>;
}

export function BasicInfoSection({
  name,
  systemPrompt,
  personaTag,
  onChange,
  errors,
}: BasicInfoSectionProps) {
  return (
    <section className="form-section basic-info-section">
      <h2 className="section-heading">Basic Info</h2>

      <div className="form-group">
        <label htmlFor="agent-name">Name</label>
        <input
          id="agent-name"
          type="text"
          value={name}
          onChange={(e) => onChange('name', e.target.value)}
          aria-invalid={errors?.name ? 'true' : 'false'}
          aria-describedby={errors?.name ? 'agent-name-error' : undefined}
        />
        <FieldError fieldId="agent-name" error={errors?.name} />
      </div>

      <div className="form-group">
        <label htmlFor="agent-system-prompt">System Prompt</label>
        <textarea
          id="agent-system-prompt"
          value={systemPrompt}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          rows={4}
          aria-invalid={errors?.systemPrompt ? 'true' : 'false'}
          aria-describedby={errors?.systemPrompt ? 'agent-system-prompt-error' : undefined}
        />
        <FieldError fieldId="agent-system-prompt" error={errors?.systemPrompt} />
      </div>

      <div className="form-group">
        <label htmlFor="agent-persona">Persona Tag</label>
        <input
          id="agent-persona"
          type="text"
          value={personaTag}
          onChange={(e) => onChange('personaTag', e.target.value)}
          aria-invalid={errors?.personaTag ? 'true' : 'false'}
          aria-describedby={errors?.personaTag ? 'agent-persona-error' : undefined}
        />
        <FieldError fieldId="agent-persona" error={errors?.personaTag} />
      </div>
    </section>
  );
}
