import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatView } from './components/ChatView';
import { UserSetup } from './components/UserSetup';
import { ThreadListView } from './components/ThreadListView';
import { AgentPicker } from './components/AgentPicker';
import { AgentsPage } from './pages/AgentsPage';
import { MemoryPage } from './pages/MemoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useUserId } from './hooks/useUserId';
import { useAgentFilter } from './hooks/useAgentFilter';
import { AppLayout } from './layouts/AppLayout';
import type { AgentListResponse } from '@cerebrobot/chat-shared';

/**
 * Main application component
 *
 * Routing logic:
 * 1. If no userId: Show UserSetup
 * 2. If userId and URL path is /agents: Show AgentsPage
 * 3. If userId and no activeThread: Show ThreadListView
 *    - agentContextMode = null: "All Threads" view (no filtering)
 *    - agentContextMode = uuid: "Agent Context Mode" (filtered to that agent)
 * 4. If userId and activeThread: Show ChatView
 *
 * URL-based routing:
 * - / → ThreadListView
 * - /agents → AgentsPage
 * - Supports browser back/forward navigation
 *
 * Agent Context Mode:
 * - Activated when user selects agent for new conversation
 * - Shows header "🤖 {AgentName} Conversations" with "Back to All Threads" button
 * - Thread list filtered to that agent only
 * - "+ New Conversation" reuses the context agent (no picker)
 *
 * Phase 5 (T027b): Refresh thread list when navigating back from chat
 */
export function App(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, showUserSetup, handleUserIdReady } = useUserId();

  // Fetch agent list for filter validation
  const [agents, setAgents] = useState<AgentListResponse['agents']>([]);
  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data: AgentListResponse = await response.json();
          setAgents(data.agents);
        }
      } catch {
        // Silently fail
      }
    }
    void fetchAgents();
  }, []);

  // Agent filter hook with localStorage persistence
  const { filter: agentFilter, setFilter, clearFilter } = useAgentFilter(agents.map((a) => a.id));

  // Initialize showAgentsPage from URL path
  const [currentPage, setCurrentPage] = useState<
    'threads' | 'agents' | 'memory' | 'settings' | 'chat'
  >(() => {
    const path = location.pathname;
    if (path === '/agents') return 'agents';
    if (path === '/memory') return 'memory';
    if (path === '/settings') return 'settings';
    if (path.startsWith('/chat/')) return 'chat';
    return 'threads';
  });
  const [showAgentsPage, setShowAgentsPage] = useState(location.pathname === '/agents');
  const [agentContextMode, setAgentContextMode] = useState<string | null>(
    agentFilter?.agentId ?? null,
  );
  const [activeThread, setActiveThread] = useState<{ threadId: string; agentId: string } | null>(
    () => {
      // Initialize from URL if on /chat/:threadId/:agentId
      const path = location.pathname;
      const match = path.match(/^\/chat\/([^/]+)\/([^/]+)$/);
      if (match) {
        return { threadId: match[1], agentId: match[2] };
      }
      return null;
    },
  );
  const [showAgentPickerForNew, setShowAgentPickerForNew] = useState(false);
  const refreshThreadsRef = useRef<(() => Promise<void>) | null>(null);

  // Sync agentContextMode with persisted filter
  useEffect(() => {
    setAgentContextMode(agentFilter?.agentId ?? null);
  }, [agentFilter]);

  // Sync state with URL changes (browser back/forward navigation)
  useEffect(() => {
    const path = location.pathname;
    setShowAgentsPage(path === '/agents');
    if (path === '/agents') setCurrentPage('agents');
    else if (path === '/memory') setCurrentPage('memory');
    else if (path === '/settings') setCurrentPage('settings');
    else if (path.startsWith('/chat/')) {
      setCurrentPage('chat');
      const match = path.match(/^\/chat\/([^/]+)\/([^/]+)$/);
      if (match) {
        setActiveThread({ threadId: match[1], agentId: match[2] });
      }
    } else {
      setCurrentPage('threads');
      setActiveThread(null);
    }
  }, [location.pathname]);

  // Navigation helpers
  const navigateToThreads = useCallback(() => {
    navigate('/threads');
  }, [navigate]);

  // Handler for selecting a thread (receives both threadId and agentId)
  // Does NOT change agentContextMode - user returns to same view they came from
  const handleSelectThread = useCallback(
    (threadId: string, agentId: string) => {
      navigate(`/chat/${threadId}/${agentId}`);
    },
    [navigate],
  );

  // Handler for starting a new conversation
  // If in Agent Context Mode: reuse that agent (skip picker)
  // If in All Threads mode: show agent picker
  const handleNewThread = useCallback(() => {
    if (agentContextMode) {
      // In Agent Context Mode: create new thread with context agent
      navigate(`/chat/new/${agentContextMode}`);
    } else {
      // In All Threads mode: show agent picker
      setShowAgentPickerForNew(true);
    }
  }, [agentContextMode, navigate]);

  // Handler when agent is selected for new conversation
  // Sets filter and enters Agent Context Mode
  const handleAgentSelectedForNew = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) {
        setFilter(agentId, agent.name); // Persist filter to localStorage
      }
      setShowAgentPickerForNew(false);
      navigate(`/chat/new/${agentId}`);
    },
    [agents, setFilter, navigate],
  );

  // Handler for returning to thread list (T027b: Trigger refresh)
  // Does NOT clear agentContextMode - user returns to same view
  const handleBackToList = useCallback(() => {
    navigate('/threads');
    // Refresh thread list to show any new threads or updated metadata
    void refreshThreadsRef.current?.();
  }, [navigate]);

  // Handler for exiting Agent Context Mode back to All Threads
  const handleExitAgentContext = useCallback(() => {
    clearFilter(); // Clear persisted filter
  }, [clearFilter]);

  // Handler for viewing threads from AgentsPage (T089)
  const handleViewThreadsFromAgents = useCallback(
    (agentId: string, agentName: string) => {
      setFilter(agentId, agentName); // Set filter and persist
      navigateToThreads(); // Navigate to thread list
    },
    [setFilter, navigateToThreads],
  );

  // Handler for starting conversation from AgentsPage
  const handleStartConversationFromAgents = useCallback(
    (agentId: string, agentName: string) => {
      setFilter(agentId, agentName); // Set filter for context
      navigate(`/chat/new/${agentId}`); // Start new conversation immediately
    },
    [setFilter, navigate],
  );

  // Store refresh function from useThreads hook
  const handleRefreshReady = useCallback((refresh: () => Promise<void>) => {
    refreshThreadsRef.current = refresh;
  }, []);

  // Show user setup if no userId
  if (showUserSetup) {
    return <UserSetup onUserIdReady={handleUserIdReady} />;
  }

  // Show memory page
  if (currentPage === 'memory' && userId) {
    return (
      <AppLayout>
        <MemoryPage />
      </AppLayout>
    );
  }

  // Show settings page
  if (currentPage === 'settings' && userId) {
    return (
      <AppLayout>
        <SettingsPage />
      </AppLayout>
    );
  }

  // Show agents management page
  if (showAgentsPage && userId) {
    return (
      <AppLayout>
        <AgentsPage
          onViewThreads={handleViewThreadsFromAgents}
          onStartConversation={handleStartConversationFromAgents}
        />
      </AppLayout>
    );
  }

  // Show agent picker for new conversation (only when NOT in Agent Context Mode)
  if (showAgentPickerForNew && !agentContextMode && userId) {
    return <AgentPicker selectedAgentId={null} onSelect={handleAgentSelectedForNew} />;
  }

  // Show thread list if userId and no active thread
  if (!activeThread && userId) {
    return (
      <AppLayout>
        <ThreadListView
          userId={userId}
          agentContextMode={agentContextMode}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          onExitAgentContext={handleExitAgentContext}
          onRefreshReady={handleRefreshReady}
        />
      </AppLayout>
    );
  }

  // Show chat view with active thread
  if (activeThread && userId) {
    return (
      <AppLayout>
        <ChatView
          userId={userId}
          agentId={activeThread.agentId}
          threadId={activeThread.threadId}
          onBack={handleBackToList}
        />
      </AppLayout>
    );
  }

  // Fallback (should never reach here due to earlier guards)
  return <UserSetup onUserIdReady={handleUserIdReady} />;
}
