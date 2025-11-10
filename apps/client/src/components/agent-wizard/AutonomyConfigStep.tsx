import { Box, Text } from '@workspace/ui';
import { AutonomyConfigSection } from '../AutonomyConfigSection.js';
import type { AgentConfig } from '@cerebrobot/chat-shared';

export interface AutonomyConfigStepProps {
  formData: Partial<AgentConfig>;
  onChange: (data: Partial<AgentConfig>) => void;
  errors: Record<string, string>;
}

/**
 * AutonomyConfigStep - Step 4 of agent creation wizard
 *
 * Configures autonomy settings:
 * - Autonomy enabled toggle
 * - Schedule (required if enabled)
 * - Evaluator configuration
 * - Limits and thresholds
 * - Memory context settings
 */
export function AutonomyConfigStep({
  formData,
  onChange,
  errors,
}: AutonomyConfigStepProps): JSX.Element {
  return (
    <Box className="space-y-4">
      <Box>
        <Text as="h3" variant="heading" size="lg" className="mb-2">
          Autonomy Configuration
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          Configure autonomous behavior for your agent. This is optional and can be enabled later.
        </Text>
      </Box>

      <AutonomyConfigSection formData={formData} onChange={onChange} errors={errors} />
    </Box>
  );
}
