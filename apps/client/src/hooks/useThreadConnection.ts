import { useEffect, useRef, useState } from 'react';
import type {
  ChatStreamEvent,
  MemoryCreatedEvent,
  MemoryUpdatedEvent,
  MemoryDeletedEvent,
} from '@cerebrobot/chat-shared';
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
export function useThreadConnection(
  threadId: string | null,
  onAutonomousMessage?: (message: string) => void,
  onAutonomousToken?: (requestId: string, token: string) => void,
  onAutonomousComplete?: (requestId: string, message: string, latencyMs?: number) => void,
  onMemoryCreated?: (event: MemoryCreatedEvent) => void,
  onMemoryUpdated?: (event: MemoryUpdatedEvent) => void,
  onMemoryDeleted?: (event: MemoryDeletedEvent) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const inflightRequestsRef = useRef<Map<string, ResponseHandler>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const onAutonomousMessageRef = useRef(onAutonomousMessage);
  const onAutonomousTokenRef = useRef(onAutonomousToken);
  const onAutonomousCompleteRef = useRef(onAutonomousComplete);
  const onMemoryCreatedRef = useRef(onMemoryCreated);
  const onMemoryUpdatedRef = useRef(onMemoryUpdated);
  const onMemoryDeletedRef = useRef(onMemoryDeleted);

  // Update callback refs when props change
  useEffect(() => {
    onAutonomousMessageRef.current = onAutonomousMessage;
    onAutonomousTokenRef.current = onAutonomousToken;
    onAutonomousCompleteRef.current = onAutonomousComplete;
    onMemoryCreatedRef.current = onMemoryCreated;
    onMemoryUpdatedRef.current = onMemoryUpdated;
    onMemoryDeletedRef.current = onMemoryDeleted;
  }, [
    onAutonomousMessage,
    onAutonomousToken,
    onAutonomousComplete,
    onMemoryCreated,
    onMemoryUpdated,
    onMemoryDeleted,
  ]);

  /**
   * Resolve WebSocket URL from environment or default
   */
  function resolveWebSocketUrl(): string {
    const envUrl = (import.meta.env?.VITE_WS_URL as string | undefined)?.trim();
    if (envUrl) {
      return envUrl;
    }

    // In development, use the same host/port as the page (Vite will proxy)
    // In production, construct URL from window.location
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // includes port if present
      return `${protocol}//${host}/api/chat/ws`;
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

    // Calculate exponential backoff delay: min(1000 * 2^attempts, 30000) ms
    const getReconnectDelay = (attempts: number): number => {
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      return Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
    };

    const createConnection = () => {
      console.log('[useThreadConnection] Creating WebSocket connection', {
        threadId,
        url,
        attempt: reconnectAttemptsRef.current,
      });

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        console.log('[useThreadConnection] WebSocket connected', { threadId });
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset counter on successful connection
      });

      ws.addEventListener('close', (event) => {
        console.log('[useThreadConnection] WebSocket closed', {
          threadId,
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          intentional: intentionalCloseRef.current,
        });
        setIsConnected(false);

        // Only reconnect if not an intentional close
        if (!intentionalCloseRef.current) {
          const delay = getReconnectDelay(reconnectAttemptsRef.current);
          console.log('[useThreadConnection] Scheduling reconnect', {
            threadId,
            attempt: reconnectAttemptsRef.current + 1,
            delayMs: delay,
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            createConnection();
          }, delay);
        }
      });

      ws.addEventListener('error', (event) => {
        console.error('[useThreadConnection] WebSocket error', {
          threadId,
          event,
          attempt: reconnectAttemptsRef.current,
        });
      });

      ws.addEventListener('message', (event) => {
        try {
          const serverEvent = JSON.parse(event.data) as
            | ChatStreamEvent
            | MemoryCreatedEvent
            | MemoryUpdatedEvent
            | MemoryDeletedEvent;

          // Handle memory events (no requestId correlation needed)
          if ('type' in serverEvent) {
            if (serverEvent.type === 'memory.created') {
              const memoryEvent = serverEvent as MemoryCreatedEvent;
              onMemoryCreatedRef.current?.(memoryEvent);
              return;
            }
            if (serverEvent.type === 'memory.updated') {
              const memoryEvent = serverEvent as MemoryUpdatedEvent;
              onMemoryUpdatedRef.current?.(memoryEvent);
              return;
            }
            if (serverEvent.type === 'memory.deleted') {
              const memoryEvent = serverEvent as MemoryDeletedEvent;
              onMemoryDeletedRef.current?.(memoryEvent);
              return;
            }
          }

          // Handle chat stream events (require requestId correlation)
          const chatEvent = serverEvent as ChatStreamEvent;

          // Extract requestId from event
          if (!('requestId' in chatEvent)) {
            console.warn('[useThreadConnection] Received event without requestId', chatEvent);
            return;
          }

          const { requestId } = chatEvent;
          const handler = inflightRequestsRef.current.get(requestId);

          // Server-initiated messages (autonomous follow-ups) don't have handlers
          // But we need to stream them token-by-token for real-time display
          if (!handler) {
            if (requestId.startsWith('followup_')) {
              // Autonomous message - stream tokens and notify on completion
              switch (chatEvent.type) {
                case 'token':
                  // Stream token to parent for display
                  onAutonomousTokenRef.current?.(requestId, chatEvent.value);
                  break;

                case 'final':
                  // Notify completion with full message
                  console.log('[useThreadConnection] Autonomous message complete', {
                    requestId,
                    messagePreview: chatEvent.message.slice(0, 50) + '...',
                  });
                  onAutonomousCompleteRef.current?.(
                    requestId,
                    chatEvent.message,
                    chatEvent.latencyMs,
                  );
                  // Also call legacy callback for backward compatibility
                  onAutonomousMessageRef.current?.(chatEvent.message);
                  break;

                case 'error':
                  console.error('[useThreadConnection] Autonomous message error', {
                    requestId,
                    error: chatEvent.message,
                  });
                  break;

                default:
                  console.log('[useThreadConnection] Autonomous message event', {
                    requestId,
                    type: chatEvent.type,
                  });
              }
            } else {
              console.warn('[useThreadConnection] No handler found for requestId', { requestId });
            }
            return;
          }

          // Route event to appropriate handler callback
          switch (chatEvent.type) {
            case 'token':
              handler.onToken?.(chatEvent.value);
              break;

            case 'final':
              handler.onComplete?.(chatEvent.message, chatEvent.latencyMs);
              cleanupHandler(requestId);
              break;

            case 'error':
              handler.onError?.(chatEvent.message, chatEvent.retryable ?? false);
              cleanupHandler(requestId);
              break;

            case 'cancelled':
              handler.onCancelled?.();
              cleanupHandler(requestId);
              break;

            default:
              console.warn('[useThreadConnection] Unknown event type', chatEvent);
          }
        } catch (error) {
          console.error('[useThreadConnection] Failed to parse server message', {
            error,
            data: event.data,
          });
        }
      });
    };

    // Start initial connection
    createConnection();

    // Cleanup on unmount or threadId change
    return () => {
      console.log('[useThreadConnection] Cleaning up WebSocket connection', { threadId });

      // Mark as intentional close to prevent reconnection
      intentionalCloseRef.current = true;

      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket if open
      if (wsRef.current) {
        const ws = wsRef.current;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(WS_CLOSE_CODES.NORMAL_CLOSURE, 'Component unmount');
        }
      }

      // Refs are stable across renders - safe to access in cleanup
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are intentionally stable and don't need to be in dependency array
      inflightRequestsRef.current.clear();
      wsRef.current = null;
      reconnectAttemptsRef.current = 0;
      intentionalCloseRef.current = false;
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
