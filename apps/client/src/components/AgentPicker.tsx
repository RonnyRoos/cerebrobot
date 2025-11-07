import { useEffect, useState } from 'react';
import type { AgentListResponse } from '@cerebrobot/chat-shared';
import { Stack, Text } from '@workspace/ui';

interface AgentPickerProps {
  selectedAgentId: string | null;
  onSelect: (agentId: string) => void;
}

export function AgentPicker({ selectedAgentId, onSelect }: AgentPickerProps) {
  const [agents, setAgents] = useState<AgentListResponse['agents']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/agents');
        if (!response.ok) {
          throw new Error(`Failed to load agents: ${response.statusText}`);
        }

        const data: AgentListResponse = await response.json();
        setAgents(data.agents);

        // Do NOT auto-select - let user choose from dropdown
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []); // Fetch agents once on mount

  if (loading) {
    return (
      <Stack className="p-2">
        <Text variant="caption" className="text-muted">
          Loading agents...
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack className="p-2">
        <Text variant="caption" className="text-destructive">
          Error: {error}
        </Text>
      </Stack>
    );
  }

  if (agents.length === 0) {
    return (
      <Stack className="p-2">
        <Text variant="caption" className="text-muted">
          No agents available
        </Text>
      </Stack>
    );
  }

  return (
    <Stack direction="vertical" gap="4" className="p-4">
      <Text as="h2" variant="heading" size="xl">
        Select an Agent
      </Text>
      <Text variant="caption" className="text-muted">
        Choose which agent personality you&apos;d like to chat with.
      </Text>
      <Stack direction="vertical" gap="2">
        <Text as="label" htmlFor="agent-picker" className="font-medium">
          Agent:
        </Text>
        <select
          id="agent-picker"
          value={selectedAgentId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          className="h-10 w-full min-w-[250px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-accent-primary/50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
        >
          <option value="">-- Please select an agent --</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
              {agent.description ? ` - ${agent.description}` : ''}
            </option>
          ))}
        </select>
      </Stack>
    </Stack>
  );
}
