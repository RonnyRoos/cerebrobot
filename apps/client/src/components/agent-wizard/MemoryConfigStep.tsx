import { Box, Text } from '@workspace/ui';
import { MemoryConfigSection } from '../MemoryConfigSection.js';
import type { AgentConfig } from '@cerebrobot/chat-shared';

export interface MemoryConfigStepProps {
  formData: Partial<AgentConfig>;
  onChange: (data: Partial<AgentConfig>) => void;
  errors: Record<string, string>;
}

/**
 * MemoryConfigStep - Step 3 of agent creation wizard
 *
 * Configures memory settings:
 * - Hot path limit (positive integer)
 * - Token budget (positive integer)
 * - Recent message floor (non-negative)
 * - Hot path margin percentage (0-1)
 * - Embedding model and endpoint
 * - Similarity threshold (0-1)
 * - Max tokens and injection budget
 * - Retrieval timeout
 */
export function MemoryConfigStep({
  formData,
  onChange,
  errors,
}: MemoryConfigStepProps): JSX.Element {
  return (
    <Box className="space-y-4">
      <Box>
        <Text as="h3" variant="heading" size="lg" className="mb-2">
          Memory Configuration
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          Fine-tune how your agent remembers and recalls information across conversations.
        </Text>
      </Box>

      <MemoryConfigSection formData={formData} onChange={onChange} errors={errors} />
    </Box>
  );
}
