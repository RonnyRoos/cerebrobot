import { useThread } from '../hooks/useThread.js';
import { useChatMessages } from '../hooks/useChatMessages.js';
import { useThreadHistory } from '../hooks/useThreadHistory.js';
import { useMemories } from '../hooks/useMemories.js';
import { useAgents } from '../hooks/useAgents.js';
import { useMemoryPanel } from '../hooks/useMemoryPanel.js';
import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { MemoryBrowser } from './MemoryBrowser/MemoryBrowser.js';
import { MessageBubble } from './chat/MessageBubble.js';
import { Toast } from './Toast.js';
import { Box, Stack, Text, Button, Textarea } from '@workspace/ui';
import { Brain } from 'lucide-react';
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
  // Load agent info to display agent name
  const { agents } = useAgents();
  const currentAgent = agents.find((agent) => agent.id === agentId);
  const agentName = currentAgent?.name || 'Agent';

  // Ref for auto-scrolling to bottom of messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Memory panel state with lazy loading
  const { state: memoryPanelState, openPanel, closePanel, markAsLoaded } = useMemoryPanel();

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
        timestamp: msg.timestamp,
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

    // Lazy load: Only fetch when panel opens for first time
    if (memoryPanelState.isOpen && !memoryPanelState.hasLoaded) {
      const loadMemories = async () => {
        setIsLoadingMemories(true);
        await fetchMemories(activeThreadId);
        await fetchStats(activeThreadId); // US5: T077 - Fetch capacity stats
        setIsLoadingMemories(false);
        markAsLoaded(); // Mark as loaded to prevent re-fetching
      };

      void loadMemories();
    }
  }, [
    activeThreadId,
    memoryPanelState.isOpen,
    memoryPanelState.hasLoaded,
    fetchMemories,
    fetchStats,
    markAsLoaded,
  ]);

  // Handle memory.created events from WebSocket
  const handleMemoryCreatedEvent = useCallback(
    (event: MemoryCreatedEvent) => {
      // Update local state via hook handler
      handleMemoryCreated(event);

      // Refresh stats after creating memory (US5: T077)
      if (activeThreadId) {
        void fetchStats(activeThreadId);
      }

      // Auto-open the memory panel when new memory is created
      if (activeThreadId && !memoryPanelState.isOpen) {
        openPanel(activeThreadId);
      }

      // Highlight the new memory (T068)
      setHighlightMemoryId(event.memory.id);

      // Clear highlight after 2s
      setTimeout(() => setHighlightMemoryId(null), 2000);
    },
    [handleMemoryCreated, fetchStats, activeThreadId, memoryPanelState.isOpen, openPanel],
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

  const disableSend = !pendingMessage.trim() || isStreaming || !isConnected;

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isStreaming]);

  // Also scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Use setTimeout to ensure DOM has rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }, 100);
    }
    // Only run when thread changes, not when messages update (handled by other effect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  return (
    <Box as="section" aria-label="Chat panel" className="flex h-full">
      {/* Main chat area */}
      <Box className="flex flex-col flex-1 min-w-0">
        {/* Header with Back button, Agent name, and connection status */}
        <Box className="p-2 px-3 md:px-4 border-b border-border flex items-center justify-between flex-shrink-0 gap-2">
          {/* Back button (left) - icon only on mobile */}
          <Button variant="ghost" onClick={onBack} className="text-sm md:text-base shrink-0">
            <span className="md:hidden">←</span>
            <span className="hidden md:inline">← Back to Threads</span>
          </Button>

          {/* Agent name with connection status (center) */}
          <Box className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <Text
              as="h1"
              className="text-sm md:text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent truncate"
            >
              {agentName}
            </Text>
            {/* Connection status indicator */}
            <Box className="flex items-center gap-1 md:gap-1.5 shrink-0">
              <Box
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`}
                aria-label={isConnected ? 'Connected' : 'Disconnected'}
              />
              <Text as="span" className="text-xs text-text-tertiary hidden md:inline">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </Box>
          </Box>

          {/* Memory button (right) - icon only on mobile */}
          <Button
            variant="ghost"
            onClick={() => activeThreadId && openPanel(activeThreadId)}
            disabled={!activeThreadId}
            className="flex items-center gap-2 shrink-0"
            aria-label="Open memory panel"
          >
            <Brain size={18} className="md:w-5 md:h-5" />
            <span className="text-sm hidden md:inline">Memory</span>
          </Button>
        </Box>

        <Box
          className="flex-1 overflow-y-auto p-4 chat-messages"
          aria-live="polite"
          ref={messagesContainerRef}
        >
          <Stack gap="4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                messageType={message.role === 'user' ? 'user' : 'agent'}
                senderName={message.role === 'user' ? 'You' : agentName}
                timestamp={message.timestamp}
                latencyMs={message.latencyMs}
                tokenUsage={message.tokenUsage}
                status={message.status}
                glowIntensity="medium"
              >
                {message.content}
              </MessageBubble>
            ))}
            {/* Invisible div for auto-scroll target */}
            <div ref={messagesEndRef} />
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
            {/* Textarea + Send button inline */}
            <Box className="flex gap-2 items-end">
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
                placeholder="Message..."
                className="flex-1"
                aria-label="Type your message"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={disableSend}
                className="h-[88px] px-6"
              >
                Send
              </Button>
            </Box>
            {/* Cancel button only when streaming */}
            {canCancel && (
              <Button type="button" variant="danger" onClick={handleCancel} className="w-full">
                Cancel
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Memory Panel - side-by-side on desktop, no backdrop */}
      {(memoryPanelState.isOpen ||
        memoryPanelState.animationState === 'closing' ||
        memoryPanelState.animationState === 'opening') && (
        <Box
          className={`border-l border-border bg-surface flex flex-col transition-all duration-300 ease-out ${
            memoryPanelState.animationState === 'open' ||
            memoryPanelState.animationState === 'closing'
              ? 'w-[400px]'
              : 'w-0'
          } ${
            memoryPanelState.animationState === 'closed' ||
            memoryPanelState.animationState === 'opening'
              ? 'opacity-0'
              : 'opacity-100'
          }`}
        >
          {/* Panel Header */}
          <Box className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <Text as="h2" variant="heading" size="lg">
              Memory Graph
            </Text>
            <Button
              variant="ghost"
              onClick={closePanel}
              className="text-sm"
              aria-label="Close memory panel"
            >
              ✕
            </Button>
          </Box>

          {/* Panel Content */}
          <Box className="flex-1 overflow-hidden">
            <MemoryBrowser
              memories={memories}
              searchResults={searchResults}
              stats={stats}
              isLoading={isLoadingMemories}
              isSearching={isSearching}
              error={memoryError?.message || null}
              autoOpen={false}
              highlightMemoryId={highlightMemoryId}
              onSearch={handleSearchMemories}
              onClearSearch={handleClearSearch}
              onCreateMemory={handleCreateMemory}
              onUpdateMemory={updateMemory}
              onDeleteMemory={deleteMemory}
            />
          </Box>
        </Box>
      )}

      {/* Success Toast (US4: T067) */}
      {toastMessage && (
        <Toast message={toastMessage} type="success" onDismiss={() => setToastMessage(null)} />
      )}
    </Box>
  );
}
