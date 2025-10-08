import { useState, useRef, useCallback } from 'react';
import { ChatView } from './components/ChatView';
import { UserSetup } from './components/UserSetup';
import { ThreadListView } from './components/ThreadListView';
import { useUserId } from './hooks/useUserId';

/**
 * Main application component
 *
 * Routing logic:
 * 1. If no userId: Show UserSetup
 * 2. If userId but no activeThreadId: Show ThreadListView
 * 3. If userId and activeThreadId: Show ChatView
 *
 * Phase 5 (T027b): Refresh thread list when navigating back from chat
 */
export function App(): JSX.Element {
  const { userId, showUserSetup, handleUserIdReady } = useUserId();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const refreshThreadsRef = useRef<(() => Promise<void>) | null>(null);

  // Handler for starting a new conversation (T024: Generate UUID for new thread)
  const handleNewThread = useCallback(() => {
    const newThreadId = crypto.randomUUID();
    setActiveThreadId(newThreadId);
  }, []);

  // Handler for returning to thread list (T027b: Trigger refresh)
  const handleBackToList = useCallback(() => {
    setActiveThreadId(null);
    // Refresh thread list to show any new threads or updated metadata
    void refreshThreadsRef.current?.();
  }, []);

  // Store refresh function from useThreads hook
  const handleRefreshReady = useCallback((refresh: () => Promise<void>) => {
    refreshThreadsRef.current = refresh;
  }, []);

  // Show user setup if no userId
  if (showUserSetup) {
    return <UserSetup onUserIdReady={handleUserIdReady} />;
  }

  // Show thread list if userId but no active thread
  if (!activeThreadId && userId) {
    return (
      <ThreadListView
        userId={userId}
        onSelectThread={setActiveThreadId}
        onNewThread={handleNewThread}
        onRefreshReady={handleRefreshReady}
      />
    );
  }

  // Show chat view with active thread
  if (activeThreadId && userId) {
    return <ChatView userId={userId} threadId={activeThreadId} onBack={handleBackToList} />;
  }

  // Fallback (should never reach here due to earlier guards)
  return <UserSetup onUserIdReady={handleUserIdReady} />;
}
