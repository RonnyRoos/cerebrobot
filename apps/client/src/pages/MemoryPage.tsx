import { Box, Text, Stack } from '@workspace/ui';
import { Brain } from 'lucide-react';

/**
 * Memory Page (Placeholder)
 *
 * Future: Global memory graph browser across all agents and threads
 * Phase 6+ feature - not part of MVP
 */
export function MemoryPage() {
  return (
    <Box className="p-8">
      <Stack gap="6" align="center" className="max-w-2xl mx-auto mt-16">
        <Brain size={64} className="text-accent-primary opacity-50" />
        <Text as="h1" variant="heading" size="2xl" className="text-center">
          Memory Browser
        </Text>
        <Text variant="body" size="lg" className="text-text-secondary text-center">
          Global memory graph visualization and management coming soon.
        </Text>
        <Text variant="body" className="text-text-tertiary text-center">
          This feature will allow you to explore the knowledge graph across all agents and
          conversations, search memories, and manage long-term knowledge retention.
        </Text>
      </Stack>
    </Box>
  );
}
