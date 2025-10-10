import { useEffect, useState } from 'react';
import type { AgentListResponse } from '@cerebrobot/chat-shared';

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
    return <div style={{ padding: '8px', color: '#666' }}>Loading agents...</div>;
  }

  if (error) {
    return <div style={{ padding: '8px', color: '#d32f2f' }}>Error: {error}</div>;
  }

  if (agents.length === 0) {
    return <div style={{ padding: '8px', color: '#666' }}>No agents available</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2>Select an Agent</h2>
      <p style={{ color: '#666', marginBottom: '16px' }}>
        Choose which agent personality you&apos;d like to chat with.
      </p>
      <div>
        <label htmlFor="agent-picker" style={{ marginRight: '8px', fontWeight: 'bold' }}>
          Agent:
        </label>
        <select
          id="agent-picker"
          value={selectedAgentId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            minWidth: '250px',
          }}
        >
          <option value="">-- Please select an agent --</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
              {agent.description ? ` - ${agent.description}` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
