/**
 * AgentList Component
 * Displays a list of agents in a grid layout with "New Agent" button
 * Migrated to design system primitives (T026)
 */

import type { AgentListItem } from '@cerebrobot/chat-shared';
import { Stack, Text, Button } from '@workspace/ui';
import { AgentCard } from './AgentCard.js';
import { EmptyState } from './EmptyState.js';

interface AgentListProps {
  agents: AgentListItem[];
  onNewAgent: () => void;
  onEditAgent: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
}

export function AgentList({ agents, onNewAgent, onEditAgent, onDeleteAgent }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <Stack gap="4" className="p-6">
        <Stack direction="horizontal" align="center" justify="between">
          <Text as="h2" variant="heading" size="xl">
            Agents
          </Text>
          <Button variant="primary" onClick={onNewAgent}>
            New Agent
          </Button>
        </Stack>
        <EmptyState message="No agents found" />
      </Stack>
    );
  }

  return (
    <Stack gap="4" className="p-6">
      {/* Header */}
      <Stack direction="horizontal" align="center" justify="between">
        <Text as="h2" variant="heading" size="xl">
          Agents
        </Text>
        <Stack direction="horizontal" gap="4" align="center">
          <Text variant="caption" className="text-muted">
            {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
          </Text>
          <Button variant="primary" onClick={onNewAgent}>
            New Agent
          </Button>
        </Stack>
      </Stack>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onEdit={onEditAgent} onDelete={onDeleteAgent} />
        ))}
      </div>
    </Stack>
  );
}
