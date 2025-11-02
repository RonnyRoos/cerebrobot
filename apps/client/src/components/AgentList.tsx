/**
 * AgentList Component
 * Displays a list of agents in a grid layout with "New Agent" button
 */

import type { AgentListItem } from '@cerebrobot/chat-shared';
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
      <div className="agent-list">
        <div className="agent-list-header">
          <h2 className="agent-list-title">Agents</h2>
          <button onClick={onNewAgent} className="btn btn-primary">
            New Agent
          </button>
        </div>
        <EmptyState message="No agents found" />
      </div>
    );
  }

  return (
    <div className="agent-list">
      <div className="agent-list-header">
        <h2 className="agent-list-title">Agents</h2>
        <div className="agent-list-actions">
          <p className="agent-list-count">
            {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
          </p>
          <button onClick={onNewAgent} className="btn btn-primary">
            New Agent
          </button>
        </div>
      </div>
      <div className="agent-list-grid">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onEdit={onEditAgent} onDelete={onDeleteAgent} />
        ))}
      </div>
    </div>
  );
}
