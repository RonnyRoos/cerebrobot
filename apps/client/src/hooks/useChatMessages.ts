import { useEffect, useRef, useState } from 'react';
import type { TokenUsage } from '@cerebrobot/chat-shared';

/**
 * useChatMessages Hook (340 lines)
 *
 * Encapsulates all message state and WebSocket streaming logic for ChatView.
 * Exceeds typical file size target (300 lines) but maintains strong cohesion—
 * splitting would separate tightly coupled streaming state management.
 *
 * Error Handling Philosophy:
 * - Manages internal error state for user-facing display
 * - Includes retry logic (retryable vs. non-retryable errors)
 * - Self-contained error recovery (caller doesn't need error handling)
 */

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'complete' | 'error';
  latencyMs?: number;
  error?: string;
  tokenUsage?: TokenUsage;
}

interface ErrorState {
  message: string;
  retryable: boolean;
}

interface UseChatMessagesOptions {
  userId: string | null;
  getActiveThreadId: () => Promise<string | null>;
  initialMessages?: DisplayMessage[];
}

type ConnectionState = 'connecting' | 'open' | 'closing' | 'closed';

interface UseChatMessagesResult {
  messages: DisplayMessage[];
  isStreaming: boolean;
  error: ErrorState | null;
  connectionState: ConnectionState;
  pendingMessage: string;
  handleSend: () => Promise<void>;
  setPendingMessage: (msg: string) => void;
  onRetry: () => void;
  clearChat: () => void;
}

function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Math.random().toString(36).slice(2)}`;
}

function resolveWebSocketUrl(): string {
  const envUrl = (import.meta.env?.VITE_WS_URL as string | undefined)?.trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    return `${protocol}//${host}:3030/api/chat/ws`;
  }

  return 'ws://localhost:3030/api/chat/ws';
}

export function useChatMessages(options: UseChatMessagesOptions): UseChatMessagesResult {
  const { userId, getActiveThreadId, initialMessages = [] } = options;

  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [pendingMessage, setPendingMessage] = useState('');
  const [error, setErrorInternal] = useState<ErrorState | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('closed');

  const wsRef = useRef<WebSocket | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);
  const errorRef = useRef<ErrorState | null>(null);

  const setErrorState = (value: ErrorState | null) => {
    errorRef.current = value;
    setErrorInternal(value);
  };

  // Sync messages with initialMessages when they change (e.g., when switching threads)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        setConnectionState('closing');
        wsRef.current.close(1000, 'Component unmounted');
      }
      wsRef.current = null;
      setConnectionState('closed');
    };
  }, []);

  const handleAssistantError = (err: ErrorState) => {
    setIsStreaming(false);
    setConnectionState('closed');
    setErrorState(err);

    const assistantId = assistantMessageIdRef.current;
    if (assistantId) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                status: 'error',
                content: '',
                error: err.message,
              }
            : message,
        ),
      );
    }
    assistantMessageIdRef.current = null;
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

  const handleSend = async () => {
    if (!pendingMessage.trim()) {
      return;
    }

    const activeThreadId = await getActiveThreadId();

    if (!activeThreadId) {
      handleAssistantError({
        message:
          'Thread unavailable: No active conversation thread found. Please refresh the page.',
        retryable: true,
      });
      return;
    }

    const clientRequestId = createClientRequestId();
    const messageToSend = pendingMessage;
    const assistantMessageId = `assistant-${clientRequestId}`;
    assistantMessageIdRef.current = assistantMessageId;

    // Ensure userId is present (required for all chat operations)
    if (!userId) {
      setErrorState({
        message: 'User ID is required. Please set up your user profile first.',
        retryable: false,
      });
      setIsStreaming(false);
      return;
    }

    if (
      connectionState === 'connecting' ||
      connectionState === 'open' ||
      connectionState === 'closing'
    ) {
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
    setErrorState(null);

    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      setConnectionState('closing');
      wsRef.current.close(1000, 'Starting new request');
    }

    let socket: WebSocket;

    try {
      const websocketUrl = resolveWebSocketUrl();
      socket = new WebSocket(websocketUrl);
      wsRef.current = socket;
      setConnectionState('connecting');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'WebSocket initialisation failed';
      handleAssistantError({
        message: `Could not open WebSocket connection: ${errorMessage}`,
        retryable: true,
      });
      setConnectionState('closed');
      return;
    }

    socket.onopen = () => {
      setConnectionState('open');
      socket.send(
        JSON.stringify({
          threadId: activeThreadId,
          message: messageToSend,
          clientRequestId,
          userId,
        }),
      );
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const raw =
          typeof event.data === 'string'
            ? event.data
            : event.data instanceof ArrayBuffer
              ? new TextDecoder().decode(event.data)
              : String(event.data);

        const payload: {
          type: 'token' | 'final' | 'error';
          value?: string;
          message?: string;
          latencyMs?: number;
          tokenUsage?: TokenUsage;
          retryable?: boolean;
        } = JSON.parse(raw);

        if (payload.type === 'error') {
          handleAssistantError({
            message:
              typeof payload.message === 'string'
                ? payload.message
                : 'Server error occurred while streaming response.',
            retryable: Boolean(payload.retryable),
          });
          if (wsRef.current === socket && socket.readyState === WebSocket.OPEN) {
            setConnectionState('closing');
            socket.close(payload.retryable ? 1011 : 1000, 'Server signalled error');
          }
          return;
        }

        if (payload.type === 'token' && typeof payload.value === 'string') {
          appendAssistantToken(assistantMessageId, payload.value);
          return;
        }

        if (payload.type === 'final') {
          finalizeAssistantMessage(
            assistantMessageId,
            payload.message ?? '',
            payload.latencyMs,
            payload.tokenUsage,
          );
          assistantMessageIdRef.current = null;
          setIsStreaming(false);
          if (wsRef.current === socket && socket.readyState === WebSocket.OPEN) {
            setConnectionState('closing');
            socket.close(1000, 'Stream complete');
          }
          return;
        }

        throw new Error(
          `Unsupported stream event type: ${String((payload as { type?: unknown }).type)}`,
        );
      } catch (err) {
        handleAssistantError({
          message: `Failed to process streaming payload: ${err instanceof Error ? err.message : 'Invalid message format'}`,
          retryable: false,
        });
        if (socket.readyState === WebSocket.OPEN) {
          setConnectionState('closing');
          socket.close(1002, 'Invalid payload received');
        }
      }
    };

    socket.onclose = (event: CloseEvent) => {
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
      if (event.code !== 1000 && !event.wasClean && !errorRef.current) {
        const retryableCodes = new Set([1001, 1006, 1011]);
        const reason =
          typeof event.reason === 'string' && event.reason.trim().length > 0
            ? event.reason
            : `Connection closed unexpectedly (code ${event.code})`;
        handleAssistantError({
          message: reason,
          retryable: retryableCodes.has(event.code),
        });
      }
      setConnectionState('closed');
      setIsStreaming(false);
    };

    socket.onerror = () => {
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
      if (!errorRef.current) {
        handleAssistantError({
          message: 'WebSocket connection error occurred while streaming response.',
          retryable: true,
        });
      }
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        setConnectionState('closing');
        socket.close(1011, 'Connection error');
      }
    };
  };

  const onRetry = () => {
    if (!errorRef.current?.retryable) {
      return;
    }
    setErrorState(null);
  };

  const clearChat = () => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      setConnectionState('closing');
      wsRef.current.close(1000, 'Chat cleared');
    }
    wsRef.current = null;
    setConnectionState('closed');
    assistantMessageIdRef.current = null;
    setMessages([]);
    setPendingMessage('');
    setErrorState(null);
    setIsStreaming(false);
  };

  return {
    messages,
    isStreaming,
    error,
    connectionState,
    pendingMessage,
    handleSend,
    setPendingMessage,
    onRetry,
    clearChat,
  };
}
