/**
 * AgentCard Component
 * Displays a single agent with metadata and action buttons
 * Migrated to design system primitives (T025)
 */

import type { AgentListItem } from '@cerebrobot/chat-shared';
import { Box, Stack, Text, Button } from '@workspace/ui';

interface AgentCardProps {
  agent: AgentListItem;
  onEdit?: (agentId: string) => void;
  onDelete?: (agentId: string) => void;
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Box className="rounded-lg border border-border bg-card p-6 shadow-md">
      {/* Header: Name + Autonomy Badge */}
      <Stack direction="horizontal" gap="3" align="center" className="mb-4">
        <Text as="h3" variant="heading" size="lg" className="flex-1">
          {agent.name}
        </Text>
        {agent.autonomyEnabled && (
          <Text
            as="span"
            variant="caption"
            className="rounded-full bg-accent-primary/10 px-3 py-1 text-accent-primary"
          >
            Autonomy Enabled
          </Text>
        )}
      </Stack>

      {/* Metadata */}
      <Stack gap="2" className="mb-4">
        <Stack direction="horizontal" gap="2">
          <Text variant="caption" className="text-muted">
            Created:
          </Text>
          <Text variant="body">{formatDate(agent.createdAt)}</Text>
        </Stack>
        <Stack direction="horizontal" gap="2">
          <Text variant="caption" className="text-muted">
            Updated:
          </Text>
          <Text variant="body">{formatDate(agent.updatedAt)}</Text>
        </Stack>
      </Stack>

      {/* Actions */}
      <Stack direction="horizontal" gap="2">
        <Button variant="ghost" size="sm">
          View
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onEdit?.(agent.id)}>
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={() => onDelete?.(agent.id)}>
          Delete
        </Button>
      </Stack>
    </Box>
  );
}
