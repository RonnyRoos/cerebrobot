import { UserSetup } from './UserSetup.js';
import { useUserId } from '../hooks/useUserId.js';
import { useChatSession } from '../hooks/useChatSession.js';
import { useChatMessages } from '../hooks/useChatMessages.js';

export function ChatView(): JSX.Element {
  const {
    userId,
    showUserSetup,
    handleUserIdReady: handleUserIdReadyFromHook,
  } = useUserId(() => {
    void startNewSession();
  });

  const { sessionId, sessionPromise, createSession } = useChatSession();

  // Callback to get active session ID for message sending
  const getActiveSessionId = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!sessionPromise) return null;
    try {
      return await sessionPromise;
    } catch {
      return null;
    }
  };

  const { messages, isStreaming, error, pendingMessage, handleSend, setPendingMessage, clearChat } =
    useChatMessages({
      userId,
      getActiveSessionId,
    });

  const handleUserIdReady = (newUserId: string) => {
    handleUserIdReadyFromHook(newUserId);
  };

  const startNewSession = async (previousSessionId?: string) => {
    clearChat();

    try {
      await createSession(previousSessionId);
    } catch (err) {
      // Error will be set by the session hook
    }
  };

  if (showUserSetup) {
    return <UserSetup onUserIdReady={handleUserIdReady} />;
  }

  const disableSend = !pendingMessage.trim() || isStreaming;

  return (
    <section aria-label="Chat panel">
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
          <button
            type="button"
            onClick={() => sessionId && void startNewSession(sessionId)}
            disabled={!sessionId}
          >
            New Session
          </button>
        </div>
      </form>
    </section>
  );
}
