import { useCallback, useState } from 'react';
import type { ThreadMetadata } from '@cerebrobot/chat-shared';

interface ThreadListItemProps {
  thread: ThreadMetadata;
  agentName?: string; // Agent display name for this thread
  onSelect: (threadId: string) => void;
}

/**
 * Renders a single conversation thread in the thread list
 *
 * Displays:
 * - Thread title (derived from first user message or "New Conversation")
 * - Last message preview with role indicator ("You: " or "Assistant: ")
 * - Relative timestamp (e.g., "5m ago", "2h ago", "Yesterday")
 * - Message count
 */
export function ThreadListItem({ thread, agentName, onSelect }: ThreadListItemProps): JSX.Element {
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
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        border: 'none',
        background: 'transparent',
        backgroundColor: isHovered ? '#f9fafb' : 'transparent',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Open conversation: ${thread.title}`}
    >
      <h3
        style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1rem',
          fontWeight: 600,
          color: '#111827',
        }}
      >
        {thread.title}
      </h3>

      {!thread.isEmpty && (
        <p
          style={{
            color: '#6b7280',
            margin: '0 0 0.5rem 0',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
          }}
        >
          <span style={{ fontWeight: 500 }}>
            {thread.lastMessageRole === 'user' ? 'You: ' : 'Assistant: '}
          </span>
          {thread.lastMessage}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: '#9ca3af',
        }}
      >
        {agentName && (
          <>
            <span style={{ color: '#6366f1', fontWeight: 500 }}>{agentName}</span>
            <span>·</span>
          </>
        )}
        <span>{formatTimestamp(thread.updatedAt)}</span>
        <span>·</span>
        <span>
          {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
        </span>
      </div>
    </button>
  );
}
