/**
 * EmptyState Component
 * Displays when no agents are found
 */

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'No agents found' }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <p className="empty-state-message">{message}</p>
        <p className="empty-state-hint">Create your first agent to get started</p>
      </div>
    </div>
  );
}
