import { useThread } from '../hooks/useThread.js';
import { useChatMessages } from '../hooks/useChatMessages.js';
import { useThreadHistory } from '../hooks/useThreadHistory.js';
import { useMemories } from '../hooks/useMemories.js';
import { useMemo, useEffect, useCallback, useState } from 'react';
import { MemoryBrowser } from './MemoryBrowser/MemoryBrowser.js';
import { Toast } from './Toast.js';
import { Box, Stack, Text, Button, Textarea } from '@workspace/ui';
import type { MemoryCreatedEvent, MemoryDeletedEvent } from '@cerebrobot/chat-shared';

interface ChatViewProps {
  userId: string;
  agentId: string;
  threadId: string | null;
  onBack: () => void;
}

/**
 * Main chat interface component
 *
 * Phase 3 Changes:
 * - Now accepts userId, threadId, and onBack props from App.tsx
 * - UserSetup handling moved to App.tsx
 *
 * Phase 4 Changes:
 * - Loads thread history when threadId provided
 * - Converts history messages to DisplayMessage format for useChatMessages
 */
export function ChatView({ userId, agentId, threadId, onBack }: ChatViewProps): JSX.Element {
  // Load thread history if resuming an existing thread (not 'new' sentinel)
  const effectiveThreadId = threadId && threadId !== 'new' ? threadId : null;
  const { messages: historyMessages, error: historyError } = useThreadHistory(
    effectiveThreadId,
    userId,
  );

  // Convert history messages to DisplayMessage format
  const initialMessages = useMemo(
    () =>
      historyMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        status: 'complete' as const,
      })),
    [historyMessages],
  );

  const { threadId: activeThreadId, threadPromise, createThread } = useThread();

  // Auto-create thread when component mounts for new conversations
  // When resuming (threadId provided and not 'new' sentinel), reuse existing threadId
  useEffect(() => {
    if (activeThreadId) return; // Skip if we already have an active thread

    if (threadId && threadId !== 'new') {
      // Reuse existing threadId when resuming conversation
      void createThread(agentId, undefined, threadId, userId);
    } else {
      // Create new thread for new conversation (threadId is null or 'new')
      void createThread(agentId, undefined, undefined, userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - threadId doesn't change for a ChatView instance

  // Callback to get active thread ID for message sending
  const getActiveThreadId = useCallback(async (): Promise<string | null> => {
    if (activeThreadId) return activeThreadId;
    if (!threadPromise) return null;
    try {
      return await threadPromise;
    } catch {
      return null;
    }
  }, [activeThreadId, threadPromise]);

  // Memory management
  const {
    memories,
    searchResults,
    stats,
    error: memoryError,
    fetchMemories,
    fetchStats,
    searchMemories,
    clearSearch,
    createMemory,
    updateMemory,
    deleteMemory,
    handleMemoryCreated,
    handleMemoryUpdated,
    handleMemoryDeleted,
  } = useMemories();
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [autoOpenMemory, setAutoOpenMemory] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [highlightMemoryId, setHighlightMemoryId] = useState<string | null>(null);

  // Handle memory search (US2: T039)
  const handleSearchMemories = async (query: string) => {
    if (!activeThreadId) return;
    setIsSearching(true);
    await searchMemories(activeThreadId, query);
    setIsSearching(false);
  };

  // Handle clear search (US2: T039)
  const handleClearSearch = () => {
    clearSearch();
  };

  // Handle create memory (US4: T062, T067)
  const handleCreateMemory = async (content: string) => {
    if (!activeThreadId) return;
    await createMemory(activeThreadId, content);
    // Show success toast (T067)
    setToastMessage('Memory created successfully');
  };

  // Fetch memories when threadId changes
  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    const loadMemories = async () => {
      setIsLoadingMemories(true);
      await fetchMemories(activeThreadId);
      await fetchStats(activeThreadId); // US5: T077 - Fetch capacity stats
      setIsLoadingMemories(false);
    };

    void loadMemories();
  }, [activeThreadId, fetchMemories, fetchStats]);

  // Handle memory.created events from WebSocket
  const handleMemoryCreatedEvent = useCallback(
    (event: MemoryCreatedEvent) => {
      // Update local state via hook handler
      handleMemoryCreated(event);

      // Refresh stats after creating memory (US5: T077)
      if (activeThreadId) {
        void fetchStats(activeThreadId);
      }

      // Signal to auto-open the memory sidebar
      setAutoOpenMemory(true);

      // Highlight the new memory (T068)
      setHighlightMemoryId(event.memory.id);

      // Reset auto-open and highlight after short delays
      setTimeout(() => setAutoOpenMemory(false), 100);
      setTimeout(() => setHighlightMemoryId(null), 2000); // Clear highlight after 2s
    },
    [handleMemoryCreated, fetchStats, activeThreadId],
  );

  // Handle memory.deleted events and refresh stats (US5: T077)
  const handleMemoryDeletedEvent = useCallback(
    (event: MemoryDeletedEvent) => {
      handleMemoryDeleted(event);
      if (activeThreadId) {
        void fetchStats(activeThreadId);
      }
    },
    [handleMemoryDeleted, fetchStats, activeThreadId],
  );

  const {
    messages,
    isStreaming,
    error,
    cancelledMessage,
    isConnected,
    pendingMessage,
    handleSend,
    setPendingMessage,
    onRetry,
    clearChat,
    handleCancel,
    canCancel,
  } = useChatMessages({
    userId,
    getActiveThreadId,
    initialMessages,
    onMemoryCreated: handleMemoryCreatedEvent,
    onMemoryUpdated: handleMemoryUpdated,
    onMemoryDeleted: handleMemoryDeletedEvent,
  });

  const startNewThread = useCallback(
    async (previousThreadId?: string) => {
      clearChat();

      try {
        await createThread(agentId, previousThreadId, undefined, userId);
      } catch (err) {
        // Error will be set by the thread hook
      }
    },
    [clearChat, createThread, agentId, userId],
  );

  const handleNewThread = useCallback(() => {
    if (activeThreadId) {
      void startNewThread(activeThreadId);
    }
  }, [activeThreadId, startNewThread]);

  const disableSend = !pendingMessage.trim() || isStreaming || !isConnected;

  return (
    <Box as="section" aria-label="Chat panel">
      {/* Back to threads navigation */}
      <Box className="p-2 px-4 border-b border-border">
        <Button variant="ghost" onClick={onBack} className="text-sm">
          ← Back to Threads
        </Button>
      </Box>

      {/* Connection status indicator */}
      <Box
        className={`px-4 py-2 border-b border-border text-sm ${
          isConnected ? 'bg-green-50' : 'bg-destructive/10'
        }`}
      >
        <Text as="span" className="mr-2">
          {isConnected ? '🟢' : '🔴'}
        </Text>
        <Text as="span" className={isConnected ? 'text-green-800' : 'text-destructive'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </Box>

      <Box className="flex-1 overflow-y-auto p-4" aria-live="polite">
        <Stack gap="4">
          {messages.map((message) => (
            <Box
              key={message.id}
              className={`p-4 rounded-lg ${
                message.role === 'user' ? 'bg-accent-primary/10 ml-12' : 'bg-bg-secondary mr-12'
              }`}
            >
              <Text as="div" className="font-semibold mb-2 text-sm">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </Text>
              <Text as="p" className="text-base leading-relaxed">
                {message.content}
              </Text>
              {message.latencyMs != null && (
                <Text as="small" className="text-text-tertiary mt-2 block" aria-label="latency">
                  Latency: {message.latencyMs} ms
                </Text>
              )}
              {message.tokenUsage && (
                <Text as="small" className="text-text-tertiary mt-1 block" aria-label="token usage">
                  Context usage: {message.tokenUsage.utilisationPct}% (
                  {message.tokenUsage.recentTokens}/{message.tokenUsage.budget} tokens)
                </Text>
              )}
              {message.status === 'streaming' && (
                <Text as="small" className="text-accent-primary mt-1 block" aria-label="streaming">
                  Streaming…
                </Text>
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Show history loading error if thread not found */}
      {historyError && (
        <Box role="alert" className="p-4 bg-destructive/10 m-4">
          <Text as="strong" className="text-destructive">
            Failed to load conversation history
          </Text>
          <Text as="p" className="text-destructive/90 mt-2">
            {historyError.message}
          </Text>
          <Button variant="primary" onClick={onBack} className="mt-2">
            Back to Thread List
          </Button>
        </Box>
      )}

      {/* Show message streaming or thread error */}
      {error && (
        <Box
          role="alert"
          className="m-4 p-4 bg-destructive/10 border border-destructive/50 rounded-lg"
        >
          <Text as="strong" className="text-destructive">
            {error.message}
          </Text>
          {error.retryable ? (
            <Stack direction="horizontal" gap="3" className="mt-3">
              <Text as="span" className="text-destructive/80">
                You can try again.
              </Text>
              <Button
                type="button"
                variant="primary"
                onClick={() => onRetry()}
                disabled={isStreaming}
              >
                Retry
              </Button>
            </Stack>
          ) : null}
        </Box>
      )}

      {/* Show cancelled message retry option */}
      {cancelledMessage && !error && (
        <Box role="status" className="m-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Text as="strong" className="text-yellow-900">
            Message cancelled
          </Text>
          <Stack direction="horizontal" gap="3" align="center" className="mt-3">
            <Text as="span" className="text-yellow-800">
              Your message is ready to edit and resend in the input field above.
            </Text>
            <Button
              type="button"
              variant="primary"
              onClick={() => onRetry()}
              disabled={isStreaming}
            >
              Dismiss
            </Button>
          </Stack>
        </Box>
      )}

      <Box
        as="form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
        className="p-4 border-t border-border"
      >
        <Stack gap="3">
          <Box>
            <Text as="label" htmlFor="chat-message" className="text-sm font-medium mb-2 block">
              Message
            </Text>
            <Textarea
              id="chat-message"
              name="message"
              rows={3}
              value={pendingMessage}
              onChange={(event) => setPendingMessage(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey
                ) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              disabled={isStreaming}
              placeholder="Type your message here..."
            />
          </Box>
          <Stack direction="horizontal" gap="2" justify="start">
            <Button type="submit" variant="primary" disabled={disableSend}>
              Send
            </Button>
            {canCancel && (
              <Button type="button" variant="danger" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleNewThread}
              disabled={!activeThreadId}
            >
              New Thread
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Memory Browser Sidebar */}
      <MemoryBrowser
        memories={memories}
        searchResults={searchResults}
        stats={stats}
        isLoading={isLoadingMemories}
        isSearching={isSearching}
        error={memoryError?.message || null}
        autoOpen={autoOpenMemory}
        highlightMemoryId={highlightMemoryId}
        onSearch={handleSearchMemories}
        onClearSearch={handleClearSearch}
        onCreateMemory={handleCreateMemory}
        onUpdateMemory={updateMemory}
        onDeleteMemory={deleteMemory}
      />

      {/* Success Toast (US4: T067) */}
      {toastMessage && (
        <Toast message={toastMessage} type="success" onDismiss={() => setToastMessage(null)} />
      )}
    </Box>
  );
}
