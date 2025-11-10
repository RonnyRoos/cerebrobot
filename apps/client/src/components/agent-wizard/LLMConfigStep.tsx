import { Box, Text } from '@workspace/ui';
import { LLMConfigSection } from '../LLMConfigSection.js';
import type { AgentConfig } from '@cerebrobot/chat-shared';

export interface LLMConfigStepProps {
  formData: Partial<AgentConfig>;
  onChange: (data: Partial<AgentConfig>) => void;
  errors: Record<string, string>;
}

/**
 * LLMConfigStep - Step 2 of agent creation wizard
 *
 * Configures LLM settings:
 * - Provider (required)
 * - Model (required)
 * - Temperature (0-2)
 * - Max tokens (optional)
 * - API key (required)
 * - API base URL (required)
 */
export function LLMConfigStep({ formData, onChange, errors }: LLMConfigStepProps): JSX.Element {
  return (
    <Box className="space-y-4">
      <Box>
        <Text as="h3" variant="heading" size="lg" className="mb-2">
          LLM Configuration
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          Configure the language model that powers your agent&apos;s intelligence.
        </Text>
      </Box>

      <LLMConfigSection formData={formData} onChange={onChange} errors={errors} />
    </Box>
  );
}
