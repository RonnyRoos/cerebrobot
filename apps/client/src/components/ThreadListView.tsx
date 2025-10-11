import { useEffect, useState, useCallback } from 'react';
import { useThreads } from '../hooks/useThreads.js';
import { ThreadListItem } from './ThreadListItem.js';
import type { AgentListResponse } from '@cerebrobot/chat-shared';

interface ThreadListViewProps {
  userId: string;
  agentContextMode?: string | null; // null = All Threads, uuid = Agent Context Mode
  onSelectThread: (threadId: string, agentId: string) => void;
  onNewThread: () => void;
  onExitAgentContext: () => void; // Handler to exit Agent Context Mode
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
 * Agent Context Mode:
 * - When agentContextMode is set: shows "🤖 {AgentName} Conversations" header
 * - Includes "← Back to All Threads" button to exit context mode
 * - Thread list filtered to that agent only
 *
 * KISS Principle: No loading indicators - content appears when ready
 *
 * Phase 5 (T027b): Exposes refresh function to parent for thread list updates
 */
export function ThreadListView({
  userId,
  agentContextMode,
  onSelectThread,
  onNewThread,
  onExitAgentContext,
  onRefreshReady,
}: ThreadListViewProps): JSX.Element {
  const { threads, error, refresh } = useThreads(userId, agentContextMode);
  const [agents, setAgents] = useState<AgentListResponse['agents']>([]);

  // Fetch agent list to map agentIds to names
  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data: AgentListResponse = await response.json();
          setAgents(data.agents);
        }
      } catch {
        // Silently fail - agent names are non-critical
      }
    }
    fetchAgents();
  }, []);

  // Create agent ID to name map
  const agentNameMap = new Map(agents.map((agent) => [agent.id, agent.name]));

  // Expose refresh function to parent (T027b)
  useEffect(() => {
    onRefreshReady(refresh);
  }, [refresh, onRefreshReady]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

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
          onClick={handleReload}
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
        }}
      >
        {/* Back to All Threads button (only in Agent Context Mode) */}
        {agentContextMode && (
          <button
            onClick={onExitAgentContext}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#3b82f6',
              border: '1px solid #3b82f6',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '0.75rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ← Back to All Threads
          </button>
        )}

        {/* Header title and New Conversation button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
            {agentContextMode
              ? `🤖 ${agentNameMap.get(agentContextMode) || 'Agent'} Conversations`
              : 'Conversations'}
          </h2>
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
        </div>
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
            <ThreadListItem
              key={thread.threadId}
              thread={thread}
              agentName={agentNameMap.get(thread.agentId)}
              onSelect={() => onSelectThread(thread.threadId, thread.agentId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
