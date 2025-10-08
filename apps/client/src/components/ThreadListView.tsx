import { useEffect } from 'react';
import { useThreads } from '../hooks/useThreads.js';
import { ThreadListItem } from './ThreadListItem.js';

interface ThreadListViewProps {
  userId: string;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onRefreshReady: (refresh: () => Promise<void>) => void;
}

/**
 * Main thread list view component
 *
 * Displays:
 * - List of conversation threads sorted by most recent first
 * - "New Conversation" button in header
 * - Empty state when no threads exist
 * - Error state when thread loading fails
 *
 * KISS Principle: No loading indicators - content appears when ready
 *
 * Phase 5 (T027b): Exposes refresh function to parent for thread list updates
 */
export function ThreadListView({
  userId,
  onSelectThread,
  onNewThread,
  onRefreshReady,
}: ThreadListViewProps): JSX.Element {
  const { threads, error, refresh } = useThreads(userId);

  // Expose refresh function to parent (T027b)
  useEffect(() => {
    onRefreshReady(refresh);
  }, [refresh, onRefreshReady]);

  // Error state (FR-012)
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <strong style={{ color: '#991b1b', display: 'block', marginBottom: '0.5rem' }}>
            Failed to load conversation threads
          </strong>
          <p style={{ color: '#7f1d1d', margin: 0 }}>{error.message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <section style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with New Conversation button */}
      <header
        style={{
          padding: '1rem',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Conversations</h2>
        <button
          onClick={onNewThread}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          + New Conversation
        </button>
      </header>

      {/* Thread list or empty state */}
      {threads.length === 0 ? (
        // Empty state (FR-008)
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              color: '#6b7280',
              fontSize: '1.125rem',
              marginBottom: '1.5rem',
            }}
          >
            No conversations yet. Start a new one!
          </p>
          <button
            onClick={onNewThread}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Start Your First Conversation
          </button>
        </div>
      ) : (
        // Thread list (FR-001, FR-003)
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {threads.map((thread) => (
            <ThreadListItem key={thread.threadId} thread={thread} onSelect={onSelectThread} />
          ))}
        </div>
      )}
    </section>
  );
}
