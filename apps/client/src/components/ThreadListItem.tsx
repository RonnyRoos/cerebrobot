import { useCallback, useState, memo } from 'react';
import type { ThreadMetadata } from '@cerebrobot/chat-shared';
import { Stack, Text } from '@workspace/ui';

interface ThreadListItemProps {
  thread: ThreadMetadata;
  agentName?: string; // Agent display name for this thread
  onSelect: (threadId: string) => void;
}

/**
 * Renders a single conversation thread in the thread list
 * Migrated to design system primitives (T027)
 *
 * Displays:
 * - Thread title (derived from first user message or "New Conversation")
 * - Last message preview with role indicator ("You: " or "Assistant: ")
 * - Relative timestamp (e.g., "5m ago", "2h ago", "Yesterday")
 * - Message count
 *
 * Memoized to prevent re-renders when parent updates but props haven't changed.
 */
const ThreadListItemComponent = ({
  thread,
  agentName,
  onSelect,
}: ThreadListItemProps): JSX.Element => {
  const [isHovered, setIsHovered] = useState(false);

  /**
   * Format timestamp as relative time for recent activity, absolute for older
   * - <60 min: "Xm ago"
   * - <24 hours: "Xh ago"
   * - <7 days: "X days ago" or "Yesterday"
   * - Older: Absolute date (MMM DD)
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

    // Older than 7 days: show absolute date
    return timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleClick = useCallback(() => {
    onSelect(thread.threadId);
  }, [onSelect, thread.threadId]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Open conversation: ${thread.title}`}
      className={`w-full cursor-pointer border-0 border-b border-border bg-transparent p-4 text-left transition-colors ${
        isHovered ? 'bg-muted/50' : ''
      }`}
    >
      <Stack gap="2">
        <Text as="h3" variant="heading" size="md">
          {thread.title}
        </Text>

        {!thread.isEmpty && (
          <Text variant="body" className="text-muted">
            <Text as="span" className="font-medium">
              {thread.lastMessageRole === 'user' ? 'You: ' : 'Assistant: '}
            </Text>
            {thread.lastMessage}
          </Text>
        )}

        <Stack direction="horizontal" gap="2" className="text-xs text-muted">
          {agentName && (
            <>
              <Text as="span" className="font-medium text-accent-primary">
                {agentName}
              </Text>
              <Text as="span">·</Text>
            </>
          )}
          <Text as="span">{formatTimestamp(thread.updatedAt)}</Text>
          <Text as="span">·</Text>
          <Text as="span">
            {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
          </Text>
        </Stack>
      </Stack>
    </button>
  );
};

/**
 * Memoized ThreadListItem component
 * Only re-renders when thread, agentName, or onSelect changes
 */
export const ThreadListItem = memo(ThreadListItemComponent);
