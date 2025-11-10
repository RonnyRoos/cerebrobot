import { Box, Text } from '@workspace/ui';
import { BasicInfoSection } from '../BasicInfoSection.js';
import type { AgentConfig } from '@cerebrobot/chat-shared';

export interface BasicInfoStepProps {
  formData: Partial<AgentConfig>;
  onChange: (data: Partial<AgentConfig>) => void;
  errors: Record<string, string>;
}

/**
 * BasicInfoStep - Step 1 of agent creation wizard
 *
 * Collects basic agent information:
 * - Agent name (required, min 1 char)
 * - System prompt (required, min 1 char)
 * - Persona tag (required, min 1 char)
 */
export function BasicInfoStep({ formData, onChange, errors }: BasicInfoStepProps): JSX.Element {
  return (
    <Box className="space-y-4">
      <Box>
        <Text as="h3" variant="heading" size="lg" className="mb-2">
          Basic Information
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          Let&apos;s start with the basics. Give your agent a name and define its core personality.
        </Text>
      </Box>

      <BasicInfoSection formData={formData} onChange={onChange} errors={errors} />
    </Box>
  );
}
