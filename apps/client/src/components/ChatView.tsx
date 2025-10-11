import { useThread } from '../hooks/useThread.js';
import { useChatMessages } from '../hooks/useChatMessages.js';
import { useThreadHistory } from '../hooks/useThreadHistory.js';
import { useMemo, useEffect, useCallback } from 'react';

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
      void createThread(agentId, undefined, threadId);
    } else {
      // Create new thread for new conversation (threadId is null or 'new')
      void createThread(agentId);
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

  const { messages, isStreaming, error, pendingMessage, handleSend, setPendingMessage, clearChat } =
    useChatMessages({
      userId,
      getActiveThreadId,
      initialMessages,
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

  const disableSend = !pendingMessage.trim() || isStreaming;

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
        <div role="alert">
          <strong>{error.message}</strong>
          {error.retryable && <span> — You can try again.</span>}
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
          <button type="button" onClick={handleNewThread} disabled={!activeThreadId}>
            New Thread
          </button>
        </div>
      </form>
    </section>
  );
}
