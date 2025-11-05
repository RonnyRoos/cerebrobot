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

import { Stack, Text, Input, Textarea } from '@workspace/ui';
import { FieldError } from './FieldError.js';

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
    <Stack as="section" direction="vertical" gap="6" className="p-6 border-b border-border">
      <Text as="h2" variant="heading" size="xl">
        Basic Info
      </Text>

      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="agent-name" variant="body" className="font-medium">
          Name
        </Text>
        <Input
          id="agent-name"
          type="text"
          value={name}
          onChange={(e) => onChange('name', e.target.value)}
          aria-invalid={errors?.name ? 'true' : 'false'}
          aria-describedby={errors?.name ? 'agent-name-error' : undefined}
        />
        <FieldError fieldId="agent-name" error={errors?.name} />
      </Stack>

      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="agent-system-prompt" variant="body" className="font-medium">
          System Prompt
        </Text>
        <Textarea
          id="agent-system-prompt"
          value={systemPrompt}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          rows={4}
          aria-invalid={errors?.systemPrompt ? 'true' : 'false'}
          aria-describedby={errors?.systemPrompt ? 'agent-system-prompt-error' : undefined}
        />
        <FieldError fieldId="agent-system-prompt" error={errors?.systemPrompt} />
      </Stack>

      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="agent-persona" variant="body" className="font-medium">
          Persona Tag
        </Text>
        <Input
          id="agent-persona"
          type="text"
          value={personaTag}
          onChange={(e) => onChange('personaTag', e.target.value)}
          aria-invalid={errors?.personaTag ? 'true' : 'false'}
          aria-describedby={errors?.personaTag ? 'agent-persona-error' : undefined}
        />
        <FieldError fieldId="agent-persona" error={errors?.personaTag} />
      </Stack>
    </Stack>
  );
}
