import { memo, useCallback, useState } from 'react';
import type { ThreadMetadata } from '@cerebrobot/chat-shared';
import { Text, Badge, cn } from '@workspace/ui';

/**
 * ThreadCard Component
 *
 * Individual thread card with Neon Flux glassmorphic styling.
 * Used in ThreadListView to display conversation threads.
 *
 * Features:
 * - Glassmorphic background (bg-surface/50 backdrop-blur-sm)
 * - Gradient accent bar (3px left border, purple-pink for active, blue-purple for others)
 * - Agent badge (custom Text styling since Badge doesn't support text children)
 * - Message preview (truncated 100 chars with fade-out)
 * - Metadata row (relative timestamp, message count)
 * - Hover glow effect (shadow-glow-purple)
 *
 * Spec: Feature 015 - User Story 5 (T072, T073, T074, T075, T076)
 */

export interface ThreadCardProps {
  /** Thread metadata */
  thread: ThreadMetadata;

  /** Agent display name for this thread */
  agentName?: string;

  /** Whether this thread is currently active/selected */
  isActive: boolean;

  /** Click handler */
  onClick: () => void;
}

/**
 * Format timestamp as relative time for recent activity, absolute for older
 * - <60 min: "Xm ago"
 * - <24 hours: "Xh ago"
 * - <7 days: "X days ago" or "Yesterday"
 * - Older: Absolute date (YYYY-MM-DD)
 */
const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const timestamp = new Date(date);
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  // Older than 7 days: show ISO date (YYYY-MM-DD)
  return timestamp.toLocaleDateString('sv-SE');
};

const ThreadCardComponent = ({
  thread,
  agentName,
  isActive,
  onClick,
}: ThreadCardProps): JSX.Element => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Open conversation: ${thread.title}`}
      className={cn(
        // Flex container for accent bar + content
        'flex w-full cursor-pointer text-left group',
        // Glassmorphic styling (T072)
        'rounded-lg border',
        isActive
          ? 'border-accent-primary/50 bg-accent-primary/5'
          : 'border-border-default/50 bg-surface/60',
        'backdrop-blur-xl',
        // Hover effects (T072)
        'transition-all duration-200 ease-out',
        'hover:border-accent-primary/60 hover:bg-surface/80',
        isHovered && 'shadow-glow-purple',
        isActive && 'shadow-glow-purple/50',
      )}
    >
      {/* Gradient Accent Bar (T073) */}
      <div
        className={cn(
          'w-1 rounded-l-lg transition-all duration-200',
          isActive
            ? 'bg-gradient-to-b from-purple-500 via-pink-500 to-purple-500'
            : 'bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-blue-500/50',
          isHovered && !isActive && 'from-purple-500/70 via-pink-500/70 to-purple-500/70',
        )}
        aria-hidden="true"
      />

      {/* Content - Single line horizontal layout for max density */}
      <div className="flex-1 py-1.5 px-2 flex items-center gap-2 min-w-0 overflow-hidden">
        {/* Title */}
        <Text
          as="h3"
          variant="heading"
          size="sm"
          className={cn(
            'font-semibold transition-colors duration-200 truncate shrink-0 min-w-0 max-w-[120px] md:max-w-[200px]',
            isActive ? 'text-accent-primary' : 'text-text-primary group-hover:text-accent-primary',
          )}
        >
          {thread.title}
        </Text>

        {/* Message Preview */}
        {!thread.isEmpty && (
          <Text className="text-xs text-text-tertiary truncate flex-1 min-w-0 hidden sm:block">
            <Text as="span" className="font-medium text-accent-secondary">
              {thread.lastMessageRole === 'user' ? 'You: ' : 'AI: '}
            </Text>
            {thread.lastMessage.substring(0, 60)}
            {thread.lastMessage.length > 60 && '...'}
          </Text>
        )}

        {/* Agent Badge */}
        {agentName && (
          <Text
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0',
              'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
              'border border-accent-primary/30',
              'text-accent-primary',
              'transition-all duration-200',
              'group-hover:shadow-glow-purple/30 group-hover:border-accent-primary/50',
              'max-w-[80px] truncate',
            )}
          >
            {agentName}
          </Text>
        )}

        {/* Metadata: Timestamp + Count */}
        <div className="flex items-center gap-1 text-xs text-text-tertiary shrink-0 ml-auto">
          <Text as="span" className="font-medium hidden sm:inline">
            {formatTimestamp(thread.updatedAt)}
          </Text>
          <Text as="span" className="text-border-default hidden sm:inline">
            ·
          </Text>
          <Badge variant="purple" count={thread.messageCount} size="sm" />
        </div>
      </div>
    </button>
  );
};

/**
 * Memoized ThreadCard component
 * Only re-renders when thread, agentName, isActive, or onClick changes
 */
export const ThreadCard = memo(ThreadCardComponent);
