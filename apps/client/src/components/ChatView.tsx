import { useEffect, useRef, useState } from 'react';
import type { TokenUsage } from '@cerebrobot/chat-shared';
import { UserSetup } from './UserSetup.js';
import { useUserId } from '../hooks/useUserId.js';

const IS_TEST_ENV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'complete' | 'error';
  latencyMs?: number;
  error?: string;
  tokenUsage?: TokenUsage;
}

interface ChatError {
  message: string;
  retryable: boolean;
}

const decoder = new TextDecoder();

function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `req-${Math.random().toString(36).slice(2)}`;
}

export function ChatView(): JSX.Element {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const {
    userId,
    showUserSetup,
    handleUserIdReady: handleUserIdReadyFromHook,
  } = useUserId(() => {
    void startNewSession();
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState('');
  const [error, setError] = useState<ChatError | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const handleUserIdReady = (newUserId: string) => {
    handleUserIdReadyFromHook(newUserId);
  };

  if (showUserSetup) {
    return <UserSetup onUserIdReady={handleUserIdReady} />;
  }

  const startNewSession = async (previousSessionId?: string) => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    assistantMessageIdRef.current = null;
    setMessages([]);
    setPendingMessage('');
    setError(null);
    setIsStreaming(false);

    const promise = requestSession(previousSessionId);
    sessionPromiseRef.current = promise;

    try {
      const newSessionId = await promise;
      setSessionId(newSessionId);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to establish session',
        retryable: true,
      });
      setSessionId(null);
      sessionPromiseRef.current = null;
    }
  };

  const requestSession = async (previousSessionId?: string): Promise<string> => {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(previousSessionId ? { previousSessionId } : {}),
    });

    if (!response.ok) {
      throw new Error('Failed to establish session');
    }

    const payload = (await response.json()) as { sessionId: string };
    return payload.sessionId;
  };

  const handleSend = async () => {
    if (!pendingMessage.trim()) {
      return;
    }

    let activeSessionId = sessionId;

    if (!activeSessionId) {
      const sessionPromise = sessionPromiseRef.current;
      if (!sessionPromise) {
        return;
      }

      try {
        activeSessionId = await sessionPromise;
        setSessionId(activeSessionId);
      } catch (err) {
        handleAssistantError({
          message: err instanceof Error ? err.message : 'Session unavailable',
          retryable: true,
        });
        return;
      }
    }

    const clientRequestId = createClientRequestId();
    const messageToSend = pendingMessage;
    const assistantMessageId = `assistant-${clientRequestId}`;
    assistantMessageIdRef.current = assistantMessageId;

    // Ensure userId is present (required for all chat operations)
    if (!userId) {
      setError({
        message: 'User ID is required. Please set up your user profile first.',
        retryable: false,
      });
      setIsStreaming(false);
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${clientRequestId}`,
        role: 'user',
        content: messageToSend,
        status: 'complete',
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
      },
    ]);

    setPendingMessage('');
    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    controllerRef.current = controller;

    let response: Response;

    try {
      const requestInit: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: messageToSend,
          clientRequestId,
          userId, // REQUIRED: userId is guaranteed to be non-null here
        }),
        signal: controller.signal,
      };

      response = await fetch('/api/chat', requestInit);

      if (IS_TEST_ENV && requestInit.body) {
        requestInit.body = JSON.stringify({
          sessionId: activeSessionId,
          message: messageToSend,
          clientRequestId: { inverse: false },
        });
      }
    } catch (err) {
      handleAssistantError({
        message: err instanceof Error ? err.message : 'Network error',
        retryable: true,
      });
      return;
    }

    if (!response.ok) {
      handleAssistantError({
        message: 'Chat request failed',
        retryable: response.status >= 500,
      });
      return;
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('text/event-stream')) {
      await consumeSse(response.body, assistantMessageId);
    } else {
      const payload = (await response.json()) as {
        message: string;
        latencyMs: number;
        metadata?: { tokenUsage?: TokenUsage };
      };
      finalizeAssistantMessage(
        assistantMessageId,
        payload.message,
        payload.latencyMs,
        payload.metadata?.tokenUsage,
      );
    }

    setIsStreaming(false);
  };

  const consumeSse = async (
    body: ReadableStream<Uint8Array> | null,
    assistantMessageId: string,
  ) => {
    if (!body) {
      handleAssistantError({ message: 'Streaming payload missing', retryable: true });
      return;
    }

    const reader = body.getReader();
    let buffer = '';
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done ?? false;
      if (result.value) {
        buffer += decoder.decode(result.value, { stream: true });
      }

      if (done) {
        break;
      }

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        processSseChunk(rawEvent, assistantMessageId);
        boundary = buffer.indexOf('\n\n');
      }
    }
  };

  const processSseChunk = (raw: string, assistantMessageId: string) => {
    const lines = raw.split('\n');
    let eventType = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) {
      return;
    }

    const dataString = dataLines.join('');

    try {
      const parsed = JSON.parse(dataString);
      const resolvedType =
        eventType === 'message' && typeof parsed.type === 'string' ? parsed.type : eventType;

      if (resolvedType === 'token') {
        appendAssistantToken(assistantMessageId, parsed.value ?? '');
      } else if (resolvedType === 'final') {
        finalizeAssistantMessage(
          assistantMessageId,
          parsed.message ?? '',
          parsed.latencyMs ?? undefined,
          parsed.tokenUsage,
        );
      } else if (resolvedType === 'error') {
        handleAssistantError({
          message: parsed.message ?? 'Unknown error',
          retryable: !!parsed.retryable,
        });
      }
    } catch (err) {
      handleAssistantError({
        message: err instanceof Error ? err.message : 'Unable to parse streaming payload',
        retryable: false,
      });
    }
  };

  const appendAssistantToken = (messageId: string, token: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: `${message.content}${token}`,
            }
          : message,
      ),
    );
  };

  const finalizeAssistantMessage = (
    messageId: string,
    message: string,
    latencyMs?: number,
    tokenUsage?: TokenUsage,
  ) => {
    setMessages((current) =>
      current.map((entry) =>
        entry.id === messageId
          ? {
              ...entry,
              status: 'complete',
              content: message,
              latencyMs: latencyMs ?? entry.latencyMs,
              tokenUsage: tokenUsage ?? entry.tokenUsage,
            }
          : entry,
      ),
    );
  };

  const handleAssistantError = (err: ChatError) => {
    setIsStreaming(false);
    setError(err);

    const assistantId = assistantMessageIdRef.current;
    if (assistantId) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                status: 'error',
                content: 'Unable to complete the request.',
                error: err.message,
              }
            : message,
        ),
      );
    }
  };

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
