import { useEffect, useState, useCallback } from 'react';
import { useThreads } from '../hooks/useThreads.js';
import { ThreadListItem } from './ThreadListItem.js';
import { EmptyState } from './EmptyState.js';
import { Box, Stack, Text, Button } from '@workspace/ui';
import type { AgentListResponse } from '@cerebrobot/chat-shared';

interface ThreadListViewProps {
  userId: string;
  agentContextMode?: string | null; // null = All Threads, uuid = Agent Context Mode
  onSelectThread: (threadId: string, agentId: string) => void;
  onNewThread: () => void;
  onExitAgentContext: () => void; // Handler to exit Agent Context Mode
  onRefreshReady: (refresh: () => Promise<void>) => void;
  onNavigateToAgents?: () => void; // Handler to navigate to agents management page
}

/**
 * Main thread list view component
 * Migrated to design system primitives (T028)
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
  onNavigateToAgents,
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
      <Stack gap="4" className="p-8 text-center">
        <Box role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <Text variant="heading" size="md" className="mb-2 text-destructive">
            Failed to load conversation threads
          </Text>
          <Text variant="body" className="text-destructive/80">
            {error.message}
          </Text>
        </Box>
        <Button variant="primary" onClick={handleReload}>
          Reload Page
        </Button>
      </Stack>
    );
  }

  return (
    <Box as="section" className="flex h-screen flex-col">
      {/* Header with New Conversation button */}
      <Box as="header" className="border-b-2 border-border p-4">
        {/* Back to All Threads button (only in Agent Context Mode) */}
        {agentContextMode && (
          <Button variant="ghost" onClick={onExitAgentContext} className="mb-3">
            ← Back to All Threads
          </Button>
        )}

        {/* Header title and New Conversation button */}
        <Stack direction="horizontal" align="center" justify="between">
          <Text as="h2" variant="heading" size="xl">
            {agentContextMode
              ? `🤖 ${agentNameMap.get(agentContextMode) || 'Agent'} Conversations`
              : 'Conversations'}
          </Text>
          <Stack direction="horizontal" gap="2">
            {/* Manage Agents button (only in All Threads mode) */}
            {!agentContextMode && onNavigateToAgents && (
              <Button variant="ghost" onClick={onNavigateToAgents}>
                ⚙️ Manage Agents
              </Button>
            )}
            <Button variant="primary" onClick={onNewThread}>
              + New Conversation
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Thread list or empty state */}
      {threads.length === 0 ? (
        // Empty state (FR-008) - Enhanced with EmptyState component (T087)
        <Box className="flex-1">
          <EmptyState
            icon="💬"
            heading="No conversations yet"
            description="Start chatting with your AI agents by creating your first conversation. Your conversation history will appear here."
            buttonText="Start Your First Conversation"
            onButtonClick={onNewThread}
          />
        </Box>
      ) : (
        // Thread list (FR-001, FR-003)
        <Box className="flex-1 overflow-y-auto">
          {threads.map((thread) => (
            <ThreadListItem
              key={thread.threadId}
              thread={thread}
              agentName={agentNameMap.get(thread.agentId)}
              onSelect={() => onSelectThread(thread.threadId, thread.agentId)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
