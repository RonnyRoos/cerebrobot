/**
 * AgentCard Component - Compact single-line design matching ThreadCard
 * Displays agent with inline metadata, actions, and Neon Flux styling
 */

import type { AgentListItem } from '@cerebrobot/chat-shared';
import { memo, useCallback, useState } from 'react';
import { Text, cn } from '@workspace/ui';
import { MessageSquare, List, Pencil, Trash2 } from 'lucide-react';

interface AgentCardProps {
  agent: AgentListItem;
  onEdit?: (agentId: string) => void;
  onDelete?: (agentId: string) => void;
  onViewThreads?: (agentId: string, agentName: string) => void;
  onNewThread?: (agentId: string) => void;
}

/**
 * Format date as relative time for recent, absolute for older
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const AgentCardComponent = ({
  agent,
  onEdit,
  onDelete,
  onViewThreads,
  onNewThread,
}: AgentCardProps): JSX.Element => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        // Flex container for accent bar + content
        'flex w-full group',
        // Glassmorphic styling
        'rounded-lg border border-border-default/50 bg-surface/60 backdrop-blur-xl',
        // Hover effects
        'transition-all duration-200 ease-out',
        'hover:border-accent-primary/60 hover:bg-surface/80',
        isHovered && 'shadow-glow-purple',
      )}
    >
      {/* Gradient Accent Bar */}
      <div
        className={cn(
          'w-1 rounded-l-lg transition-all duration-200',
          'bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-blue-500/50',
          isHovered && 'from-purple-500/70 via-pink-500/70 to-purple-500/70',
        )}
        aria-hidden="true"
      />

      {/* Content - Single line horizontal layout */}
      <div className="flex-1 py-1.5 px-2 flex items-center gap-2 min-w-0 overflow-hidden">
        {/* Agent Name */}
        <Text
          as="h3"
          variant="heading"
          size="sm"
          className={cn(
            'font-semibold transition-colors duration-200 truncate shrink-0 min-w-0 max-w-[120px] md:max-w-[200px]',
            'text-text-primary group-hover:text-accent-primary',
          )}
        >
          {agent.name}
        </Text>

        {/* Autonomy Badge */}
        {agent.autonomyEnabled && (
          <Text
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0',
              'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
              'border border-accent-primary/30',
              'text-accent-primary',
              'transition-all duration-200',
              'group-hover:shadow-glow-purple/30 group-hover:border-accent-primary/50',
              'max-w-[100px] truncate hidden sm:block',
            )}
          >
            Autonomy Enabled
          </Text>
        )}

        {/* Metadata: Updated date */}
        <div className="flex items-center gap-1 text-xs text-text-tertiary shrink-0 ml-auto hidden sm:flex">
          <Text as="span" className="font-medium">
            {formatDate(agent.updatedAt)}
          </Text>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onNewThread?.(agent.id)}
            className={cn(
              'p-1.5 rounded-md transition-all duration-200',
              'hover:bg-accent-primary/10 hover:text-accent-primary',
              'focus:outline-none focus:ring-2 focus:ring-accent-primary',
            )}
            aria-label="New conversation"
            title="New conversation with this agent"
          >
            <MessageSquare size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewThreads?.(agent.id, agent.name)}
            className={cn(
              'p-1.5 rounded-md transition-all duration-200',
              'hover:bg-accent-secondary/10 hover:text-accent-secondary',
              'focus:outline-none focus:ring-2 focus:ring-accent-secondary',
            )}
            aria-label="Show conversations"
            title="Show conversations with this agent"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => onEdit?.(agent.id)}
            className={cn(
              'p-1.5 rounded-md transition-all duration-200',
              'hover:bg-accent-primary/10 hover:text-accent-primary',
              'focus:outline-none focus:ring-2 focus:ring-accent-primary',
            )}
            aria-label="Edit agent"
            title="Edit agent"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(agent.id)}
            className={cn(
              'p-1.5 rounded-md transition-all duration-200',
              'hover:bg-destructive/10 hover:text-destructive',
              'focus:outline-none focus:ring-2 focus:ring-destructive',
            )}
            aria-label="Delete agent"
            title="Delete agent"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const AgentCard = memo(AgentCardComponent);
