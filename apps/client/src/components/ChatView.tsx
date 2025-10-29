import { useThread } from '../hooks/useThread.js';
import { useChatMessages } from '../hooks/useChatMessages.js';
import { useThreadHistory } from '../hooks/useThreadHistory.js';
import { useMemories } from '../hooks/useMemories.js';
import { useMemo, useEffect, useCallback, useState } from 'react';
import { MemoryBrowser } from './MemoryBrowser/MemoryBrowser.js';
import { Toast } from './Toast.js';
import type { MemoryCreatedEvent } from '@cerebrobot/chat-shared';

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
    error: memoryError,
    fetchMemories,
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
      setIsLoadingMemories(false);
    };

    void loadMemories();
  }, [activeThreadId, fetchMemories]);

  // Handle memory.created events from WebSocket
  const handleMemoryCreatedEvent = useCallback(
    (event: MemoryCreatedEvent) => {
      console.log('[ChatView] Memory created event received', event);

      // Update local state via hook handler
      handleMemoryCreated(event);

      // Signal to auto-open the memory sidebar
      setAutoOpenMemory(true);

      // Highlight the new memory (T068)
      setHighlightMemoryId(event.memory.id);

      // Reset auto-open and highlight after short delays
      setTimeout(() => setAutoOpenMemory(false), 100);
      setTimeout(() => setHighlightMemoryId(null), 2000); // Clear highlight after 2s
    },
    [handleMemoryCreated],
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
    onMemoryDeleted: handleMemoryDeleted,
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
    <section aria-label="Chat panel">
      {/* Back to threads navigation */}
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: 'transparent',
            color: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          ← Back to Threads
        </button>
      </div>

      {/* Connection status indicator */}
      <div
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: isConnected ? '#f0fdf4' : '#fef2f2',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '0.875rem',
        }}
      >
        <span style={{ marginRight: '0.5rem' }}>{isConnected ? '🟢' : '🔴'}</span>
        <span style={{ color: isConnected ? '#15803d' : '#991b1b' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="chat-history" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} data-role={message.role}>
            <header>{message.role === 'user' ? 'You' : 'Assistant'}</header>
            <p>{message.role === 'user' ? `You: ${message.content}` : message.content}</p>
            {message.latencyMs != null && (
              <small aria-label="latency">Latency: {message.latencyMs} ms</small>
            )}
            {message.tokenUsage && (
              <small aria-label="token usage">
                Context usage: {message.tokenUsage.utilisationPct}% (
                {message.tokenUsage.recentTokens}/{message.tokenUsage.budget} tokens)
              </small>
            )}
            {message.status === 'streaming' && <small aria-label="streaming">Streaming…</small>}
          </article>
        ))}
      </div>

      {/* Show history loading error if thread not found */}
      {historyError && (
        <div role="alert" style={{ padding: '1rem', backgroundColor: '#fef2f2', margin: '1rem' }}>
          <strong style={{ color: '#991b1b' }}>Failed to load conversation history</strong>
          <p style={{ color: '#7f1d1d', margin: '0.5rem 0 0 0' }}>{historyError.message}</p>
          <button
            onClick={onBack}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Back to Thread List
          </button>
        </div>
      )}

      {/* Show message streaming or thread error */}
      {error && (
        <div
          role="alert"
          style={{
            margin: '1rem',
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
          }}
        >
          <strong style={{ color: '#991b1b' }}>{error.message}</strong>
          {error.retryable ? (
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
              <span style={{ color: '#b91c1c' }}>You can try again.</span>
              <button
                type="button"
                onClick={() => onRetry()}
                disabled={isStreaming}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  opacity: isStreaming ? 0.6 : 1,
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Show cancelled message retry option */}
      {cancelledMessage && !error && (
        <div
          role="status"
          style={{
            margin: '1rem',
            padding: '1rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '0.5rem',
          }}
        >
          <strong style={{ color: '#92400e' }}>Message cancelled</strong>
          <div
            style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
            <span style={{ color: '#78350f' }}>
              Your message is ready to edit and resend in the input field above.
            </span>
            <button
              type="button"
              onClick={() => onRetry()}
              disabled={isStreaming}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                opacity: isStreaming ? 0.6 : 1,
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <label htmlFor="chat-message">Message</label>
        <textarea
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
        />
        <div className="chat-actions">
          <button type="submit" disabled={disableSend}>
            Send
          </button>
          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
          <button type="button" onClick={handleNewThread} disabled={!activeThreadId}>
            New Thread
          </button>
        </div>
      </form>

      {/* Memory Browser Sidebar */}
      <MemoryBrowser
        memories={memories}
        searchResults={searchResults}
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
    </section>
  );
}
