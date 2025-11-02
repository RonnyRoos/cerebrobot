/**
 * AgentCard Component
 * Displays a single agent with metadata and action buttons
 */

import type { AgentListItem } from '@cerebrobot/chat-shared';

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
    <div className="agent-card">
      <div className="agent-card-header">
        <h3 className="agent-card-name">{agent.name}</h3>
        {agent.autonomyEnabled && (
          <span className="agent-card-badge autonomy-enabled">Autonomy Enabled</span>
        )}
      </div>
      <div className="agent-card-metadata">
        <div className="agent-card-meta-item">
          <span className="agent-card-meta-label">Created:</span>
          <span className="agent-card-meta-value">{formatDate(agent.createdAt)}</span>
        </div>
        <div className="agent-card-meta-item">
          <span className="agent-card-meta-label">Updated:</span>
          <span className="agent-card-meta-value">{formatDate(agent.updatedAt)}</span>
        </div>
      </div>
      <div className="agent-card-actions">
        <button className="agent-card-button view-button">View</button>
        <button className="agent-card-button edit-button" onClick={() => onEdit?.(agent.id)}>
          Edit
        </button>
        <button className="agent-card-button delete-button" onClick={() => onDelete?.(agent.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
