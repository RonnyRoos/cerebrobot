import { useState, useRef, useCallback, useEffect } from 'react';
import { ChatView } from './components/ChatView';
import { UserSetup } from './components/UserSetup';
import { ThreadListView } from './components/ThreadListView';
import { AgentPicker } from './components/AgentPicker';
import { AgentsPage } from './pages/AgentsPage';
import { useUserId } from './hooks/useUserId';

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
  const { userId, showUserSetup, handleUserIdReady } = useUserId();

  // Initialize showAgentsPage from URL path
  const [showAgentsPage, setShowAgentsPage] = useState(window.location.pathname === '/agents');
  const [agentContextMode, setAgentContextMode] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<{ threadId: string; agentId: string } | null>(
    null,
  );
  const [showAgentPickerForNew, setShowAgentPickerForNew] = useState(false);
  const refreshThreadsRef = useRef<(() => Promise<void>) | null>(null);

  // Listen to URL changes for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setShowAgentsPage(window.location.pathname === '/agents');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation helpers
  const navigateToAgents = useCallback(() => {
    window.history.pushState({}, '', '/agents');
    setShowAgentsPage(true);
  }, []);

  const navigateToThreads = useCallback(() => {
    window.history.pushState({}, '', '/');
    setShowAgentsPage(false);
  }, []);

  // Handler for selecting a thread (receives both threadId and agentId)
  // Does NOT change agentContextMode - user returns to same view they came from
  const handleSelectThread = useCallback((threadId: string, agentId: string) => {
    setActiveThread({ threadId, agentId });
  }, []);

  // Handler for starting a new conversation
  // If in Agent Context Mode: reuse that agent (skip picker)
  // If in All Threads mode: show agent picker
  const handleNewThread = useCallback(() => {
    if (agentContextMode) {
      // In Agent Context Mode: create new thread with context agent
      setActiveThread({ threadId: 'new', agentId: agentContextMode });
    } else {
      // In All Threads mode: show agent picker
      setShowAgentPickerForNew(true);
    }
  }, [agentContextMode]);

  // Handler when agent is selected for new conversation
  // ENTERS Agent Context Mode for this agent
  const handleAgentSelectedForNew = useCallback((agentId: string) => {
    setAgentContextMode(agentId); // Enter Agent Context Mode
    setShowAgentPickerForNew(false);
    setActiveThread({ threadId: 'new', agentId });
  }, []);

  // Handler for returning to thread list (T027b: Trigger refresh)
  // Does NOT clear agentContextMode - user returns to same view
  const handleBackToList = useCallback(() => {
    setActiveThread(null);
    // Refresh thread list to show any new threads or updated metadata
    void refreshThreadsRef.current?.();
  }, []);

  // Handler for exiting Agent Context Mode back to All Threads
  const handleExitAgentContext = useCallback(() => {
    setAgentContextMode(null);
  }, []);

  // Store refresh function from useThreads hook
  const handleRefreshReady = useCallback((refresh: () => Promise<void>) => {
    refreshThreadsRef.current = refresh;
  }, []);

  // Show user setup if no userId
  if (showUserSetup) {
    return <UserSetup onUserIdReady={handleUserIdReady} />;
  }

  // Show agents management page
  if (showAgentsPage && userId) {
    return (
      <div>
        <button onClick={navigateToThreads}>← Back to Threads</button>
        <AgentsPage />
      </div>
    );
  }

  // Show agent picker for new conversation (only when NOT in Agent Context Mode)
  if (showAgentPickerForNew && !agentContextMode && userId) {
    return <AgentPicker selectedAgentId={null} onSelect={handleAgentSelectedForNew} />;
  }

  // Show thread list if userId and no active thread
  if (!activeThread && userId) {
    return (
      <ThreadListView
        userId={userId}
        agentContextMode={agentContextMode}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onExitAgentContext={handleExitAgentContext}
        onRefreshReady={handleRefreshReady}
        onNavigateToAgents={navigateToAgents}
      />
    );
  }

  // Show chat view with active thread
  if (activeThread && userId) {
    return (
      <ChatView
        userId={userId}
        agentId={activeThread.agentId}
        threadId={activeThread.threadId}
        onBack={handleBackToList}
      />
    );
  }

  // Fallback (should never reach here due to earlier guards)
  return <UserSetup onUserIdReady={handleUserIdReady} />;
}
