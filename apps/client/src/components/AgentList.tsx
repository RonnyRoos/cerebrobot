/**
 * AgentList Component - Compact vertical list matching ThreadListView style
 * Displays agents in single-line cards with Neon Flux styling
 */

import type { AgentListItem } from '@cerebrobot/chat-shared';
import { Stack, Text, Button, Box } from '@workspace/ui';
import { Plus } from 'lucide-react';
import { AgentCard } from './AgentCard.js';
import { EmptyState } from './EmptyState.js';

interface AgentListProps {
  agents: AgentListItem[];
  onNewAgent: () => void;
  onEditAgent: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
  onViewThreads?: (agentId: string, agentName: string) => void;
  onNewThread?: (agentId: string) => void;
}

export function AgentList({
  agents,
  onNewAgent,
  onEditAgent,
  onDeleteAgent,
  onViewThreads,
  onNewThread,
}: AgentListProps) {
  if (agents.length === 0) {
    return (
      <Box className="flex h-full flex-col bg-bg-base">
        {/* Minimal header */}
        <Box className="px-3 py-2 border-b border-border-default/20 flex items-center justify-between flex-shrink-0">
          <Text as="h2" className="text-sm font-semibold text-text-secondary">
            {agents.length} agents
          </Text>
          <Button
            variant="primary"
            onClick={onNewAgent}
            className="h-7 px-3 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-glow-purple transition-all duration-200"
          >
            <Plus size={14} className="mr-1" />
            New Agent
          </Button>
        </Box>

        {/* Empty state */}
        <Box className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            icon="🤖"
            heading="No agents configured"
            description="Agents are AI assistants with specific capabilities and personalities. Create your first agent to start building intelligent conversations."
            buttonText="Create Your First Agent"
            onButtonClick={onNewAgent}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box className="flex h-full flex-col bg-bg-base">
      {/* Minimal header matching thread list style */}
      <Box className="px-3 py-2 border-b border-border-default/20 flex items-center justify-between flex-shrink-0">
        <Text as="h2" className="text-sm font-semibold text-text-secondary">
          {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
        </Text>
        <Button
          variant="primary"
          onClick={onNewAgent}
          className="h-7 px-3 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-glow-purple transition-all duration-200"
        >
          <Plus size={14} className="mr-1" />
          New Agent
        </Button>
      </Box>

      {/* Agent list - vertical stack with compact spacing */}
      <Box className="flex-1 overflow-y-auto p-2">
        <Stack gap="1">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={onEditAgent}
              onDelete={onDeleteAgent}
              onViewThreads={onViewThreads}
              onNewThread={onNewThread}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
