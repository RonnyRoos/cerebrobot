import { useEffect, useRef, useState } from 'react';
import type { ChatStreamEvent } from '@cerebrobot/chat-shared';
import { WS_CLOSE_CODES } from '@cerebrobot/chat-shared';

/**
 * Response handler for correlating server events with client requests
 */
interface ResponseHandler {
  onToken?: (token: string) => void;
  onComplete?: (message: string, latencyMs?: number) => void;
  onError?: (error: string, retryable: boolean) => void;
  onCancelled?: () => void;
  timeoutId?: ReturnType<typeof setTimeout>; // Timeout ID for cleanup
}

/**
 * useThreadConnection Hook
 *
 * Manages a thread-persistent WebSocket connection that multiplexes multiple
 * request/response cycles over a single connection. The connection persists for
 * the lifetime of the thread component (mount → unmount).
 *
 * **Key responsibilities**:
 * - Create and maintain WebSocket connection tied to threadId
 * - Track connection state (isConnected)
 * - Multiplex requests using requestId correlation
 * - Route server events to appropriate response handlers
 * - Provide message sending and cancellation interface
 * - Clean up connection on unmount
 *
 * **Pattern**: One WebSocket per thread, many requests per WebSocket
 */
export function useThreadConnection(threadId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const inflightRequestsRef = useRef<Map<string, ResponseHandler>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Resolve WebSocket URL from environment or default
   */
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

  /**
   * WebSocket lifecycle effect - creates connection on mount, cleans up on unmount
   *
   * Note: Disabling exhaustive-deps because wsRef and inflightRequestsRef are refs that
   * are stable across renders. They don't need to be in the dependency array and including
   * them would be redundant.
   */
  useEffect(() => {
    // Skip connection creation if no threadId yet
    if (!threadId) {
      setIsConnected(false);
      return;
    }

    // Helper to cleanup handler and clear timeout
    const cleanupHandler = (requestId: string) => {
      const handler = inflightRequestsRef.current.get(requestId);
      if (handler?.timeoutId) {
        clearTimeout(handler.timeoutId);
      }
      inflightRequestsRef.current.delete(requestId);
    };

    const wsUrl = resolveWebSocketUrl();
    const url = `${wsUrl}?threadId=${encodeURIComponent(threadId)}`;

    console.log('[useThreadConnection] Creating WebSocket connection', { threadId, url });

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      console.log('[useThreadConnection] WebSocket connected', { threadId });
      setIsConnected(true);
    });

    ws.addEventListener('close', (event) => {
      console.log('[useThreadConnection] WebSocket closed', {
        threadId,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      setIsConnected(false);
    });

    ws.addEventListener('error', (event) => {
      console.error('[useThreadConnection] WebSocket error', { threadId, event });
    });

    ws.addEventListener('message', (event) => {
      try {
        const serverEvent = JSON.parse(event.data) as ChatStreamEvent;

        // Extract requestId from event
        if (!('requestId' in serverEvent)) {
          console.warn('[useThreadConnection] Received event without requestId', serverEvent);
          return;
        }

        const { requestId } = serverEvent;
        const handler = inflightRequestsRef.current.get(requestId);

        if (!handler) {
          console.warn('[useThreadConnection] No handler found for requestId', { requestId });
          return;
        }

        // Route event to appropriate handler callback
        switch (serverEvent.type) {
          case 'token':
            handler.onToken?.(serverEvent.value);
            break;

          case 'final':
            handler.onComplete?.(serverEvent.message, serverEvent.latencyMs);
            cleanupHandler(requestId);
            break;

          case 'error':
            handler.onError?.(serverEvent.message, serverEvent.retryable ?? false);
            cleanupHandler(requestId);
            break;

          case 'cancelled':
            handler.onCancelled?.();
            cleanupHandler(requestId);
            break;

          default:
            console.warn('[useThreadConnection] Unknown event type', serverEvent);
        }
      } catch (error) {
        console.error('[useThreadConnection] Failed to parse server message', {
          error,
          data: event.data,
        });
      }
    });

    // Cleanup on unmount or threadId change
    return () => {
      console.log('[useThreadConnection] Cleaning up WebSocket connection', { threadId });

      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(WS_CLOSE_CODES.NORMAL_CLOSURE, 'Component unmount');
      }

      // Refs are stable across renders - safe to access in cleanup
      inflightRequestsRef.current.clear();
      wsRef.current = null;
    };
  }, [threadId]);

  /**
   * Send a message over the persistent WebSocket connection
   *
   * @param content - Message content to send
   * @param onToken - Callback for streaming tokens
   * @param onComplete - Callback for completion
   * @param onError - Callback for errors
   * @param onCancelled - Optional callback for cancellation acknowledgment
   * @returns requestId for cancellation tracking
   */
  function sendMessage(
    content: string,
    onToken: (token: string) => void,
    onComplete: (message: string, latencyMs?: number) => void,
    onError: (error: string, retryable: boolean) => void,
    onCancelled?: () => void,
  ): string {
    if (!threadId) {
      console.error('[useThreadConnection] Cannot send message: No threadId available');
      onError('Thread not available', true);
      return '';
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[useThreadConnection] Cannot send message: WebSocket not connected');
      onError('Connection not available', true);
      return '';
    }

    // Generate requestId using crypto.randomUUID()
    const requestId = crypto.randomUUID();

    // Set 60-second timeout to auto-cleanup if server hangs
    const timeoutId = setTimeout(() => {
      const handler = inflightRequestsRef.current.get(requestId);
      if (handler) {
        console.warn('[useThreadConnection] Request timed out', { requestId, threadId });
        inflightRequestsRef.current.delete(requestId);
        handler.onError?.('Request timed out - server did not respond', true);
      }
    }, 60000); // 60 seconds

    // Register response handler (with timeout ID for cleanup)
    inflightRequestsRef.current.set(requestId, {
      onToken,
      onComplete,
      onError,
      onCancelled,
      timeoutId, // Add timeout ID for cleanup
    });

    // Send message to server
    const message = {
      type: 'message',
      requestId,
      threadId,
      content,
    };

    try {
      wsRef.current.send(JSON.stringify(message));
      console.log('[useThreadConnection] Message sent', { requestId, threadId });
    } catch (error) {
      console.error('[useThreadConnection] Failed to send message', { error, requestId });
      clearTimeout(timeoutId); // Clear timeout on send failure
      inflightRequestsRef.current.delete(requestId);
      onError('Failed to send message', true);
      return '';
    }

    return requestId;
  }

  /**
   * Cancel an in-progress request
   *
   * @param requestId - The request to cancel
   */
  function cancelMessage(requestId: string): void {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[useThreadConnection] Cannot cancel: WebSocket not connected');
      return;
    }

    // Send cancellation signal to server
    const cancellation = {
      type: 'cancel',
      requestId,
    };

    try {
      wsRef.current.send(JSON.stringify(cancellation));
      console.log('[useThreadConnection] Cancellation sent', { requestId, threadId });
    } catch (error) {
      console.error('[useThreadConnection] Failed to send cancellation', { error, requestId });
    }
  }

  return {
    sendMessage,
    cancelMessage,
    isConnected,
  };
}
