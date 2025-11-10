import { useEffect, useState, useCallback } from 'react';
import { useThreads } from '../hooks/useThreads.js';
import { ThreadCard } from './thread-list/ThreadCard.js';
import { EmptyState } from './EmptyState.js';
import { Box, Stack, Button, Text } from '@workspace/ui';
import { Plus } from 'lucide-react';
import type { AgentListResponse } from '@cerebrobot/chat-shared';

interface ThreadListViewProps {
  userId: string;
  agentContextMode?: string | null; // null = All Threads, uuid = Agent Context Mode
  onSelectThread: (threadId: string, agentId: string) => void;
  onNewThread: () => void;
  onExitAgentContext: () => void; // Handler to exit Agent Context Mode
  onRefreshReady: (refresh: () => Promise<void>) => void;
  // Removed: onNavigateToAgents, onAgentFilterChange, onClearAgentFilter (redundant with sidebar)
}

/**
 * Main thread list view component
 * Migrated to design system primitives (T028)
 * Visual redesign with ThreadCard component (T072-T077)
 * Streamlined header - removed redundant controls (sidebar handles all navigation)
 *
 * Displays:
 * - Compact list of conversation threads with ThreadCard components
 * - Minimal header (only "Back to All Threads" button in agent context mode)
 * - Empty state when no threads exist
 * - Error state when thread loading fails
 *
 * All navigation controls moved to sidebar:
 * - New Conversation (handled by sidebar or floating action button)
 * - Manage Agents (sidebar Agents nav item)
 * - Agent filtering (removed - use sidebar to navigate to specific agent)
 *
 * KISS Principle: No loading indicators - content appears when ready
 *
 * Phase 5 (T027b): Exposes refresh function to parent for thread list updates
 * Phase 8 (T077): Uses ThreadCard component with Neon Flux visual design
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

  // Get current thread ID from URL for active state detection
  const currentThreadId = (() => {
    const path = window.location.pathname;
    const match = path.match(/^\/chat\/([^/]+)\/([^/]+)$/);
    return match ? match[1] : null;
  })();

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
    <Box as="section" className="flex h-full flex-col bg-bg-base overflow-hidden">
      {/* Compact header with thread count */}
      <Box className="px-3 py-2 border-b border-border-default/20 flex items-center justify-between gap-2 flex-shrink-0">
        <Text className="text-sm font-semibold text-text-secondary">
          {threads.length === 1 ? '1 conversation' : `${threads.length} conversations`}
        </Text>
        <div className="flex items-center gap-2">
          {agentContextMode && (
            <Button
              variant="ghost"
              onClick={onExitAgentContext}
              className="text-xs text-accent-primary hover:text-accent-primary hover:bg-accent-primary/10 transition-all duration-200 h-6 px-2"
            >
              ← All Threads
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onNewThread}
            className="h-7 px-3 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-glow-purple transition-all duration-200"
          >
            <Plus size={14} className="mr-1" />
            New
          </Button>
        </div>
      </Box>

      {/* Thread list or empty state */}
      {threads.length === 0 ? (
        // Empty state with Brain icon and fade-in animation (T080)
        <Box className="flex-1">
          <EmptyState
            heading="No conversations yet"
            description="Start chatting with your AI agents by creating your first conversation. Your conversation history will appear here."
            buttonText="Start Your First Conversation"
            onButtonClick={onNewThread}
          />
        </Box>
      ) : (
        // Thread list (FR-001, FR-003) - Updated to use ThreadCard (T077)
        <Box className="flex-1 overflow-y-auto">
          <Stack gap="1" className="p-2">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.threadId}
                thread={thread}
                agentName={agentNameMap.get(thread.agentId)}
                isActive={thread.threadId === currentThreadId}
                onClick={() => onSelectThread(thread.threadId, thread.agentId)}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
