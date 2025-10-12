import type { FastifyBaseLogger } from 'fastify';
import type { WebSocket } from '@fastify/websocket';

/**
 * Per-connection state tracked by ConnectionManager
 */
export interface ConnectionState {
  /**
   * Unique identifier for this WebSocket connection (crypto.randomUUID())
   */
  connectionId: string;

  /**
   * Thread this connection is associated with
   */
  threadId: string;

  /**
   * The underlying WebSocket instance
   */
  socket: WebSocket;

  /**
   * Currently active request ID (if streaming in progress)
   */
  activeRequestId?: string;

  /**
   * AbortController for cancelling the active request
   */
  abortController?: AbortController;

  /**
   * Total number of messages sent over this connection
   */
  messageCount: number;

  /**
   * When the connection was established (ISO 8601 timestamp)
   */
  connectedAt: string;
}

/**
 * Manages WebSocket connection state and request lifecycle for thread-persistent connections.
 *
 * **Responsibilities**:
 * - Register/unregister connections with dual-ID tracking (connectionId + threadId)
 * - Track active request per connection with AbortController
 * - Provide cancellation interface (abort active request)
 * - Ensure cleanup completes within 500ms (per SC-006)
 *
 * **Thread-safety**: Single-threaded Node.js event loop; no locking required
 */
export class ConnectionManager {
  private connections: Map<string, ConnectionState> = new Map();

  constructor(private logger: FastifyBaseLogger) {}

  /**
   * Register a new WebSocket connection
   *
   * @param connectionId - Unique connection identifier (crypto.randomUUID())
   * @param threadId - Thread this connection belongs to
   * @param socket - The WebSocket instance
   */
  register(connectionId: string, threadId: string, socket: WebSocket): void {
    if (this.connections.has(connectionId)) {
      this.logger.warn({ connectionId, threadId }, 'Connection ID already exists, replacing');
    }

    const state: ConnectionState = {
      connectionId,
      threadId,
      socket,
      messageCount: 0,
      connectedAt: new Date().toISOString(),
    };

    this.connections.set(connectionId, state);

    // Check for multiple connections to same thread
    const threadConnections = this.getConnectionsByThread(threadId);
    if (threadConnections.length > 1) {
      this.logger.info(
        {
          connectionId,
          threadId,
          threadConnectionCount: threadConnections.length,
          allThreadConnections: threadConnections,
        },
        'Multiple connections detected for same thread',
      );
    }

    this.logger.info(
      { connectionId, threadId, totalConnections: this.connections.size },
      'Connection registered',
    );

    // Warn if approaching deployment limit (5 concurrent connections per spec)
    if (this.connections.size > 5) {
      this.logger.warn(
        { totalConnections: this.connections.size },
        'Connection count exceeds deployment limit (5)',
      );
    }
  }

  /**
   * Get connection state by ID
   *
   * @param connectionId - The connection identifier
   * @returns Connection state or undefined if not found
   */
  get(connectionId: string): ConnectionState | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Set the active request for a connection
   *
   * @param connectionId - The connection identifier
   * @param requestId - The request identifier
   * @param abortController - AbortController for cancelling this request
   */
  setActiveRequest(
    connectionId: string,
    requestId: string,
    abortController: AbortController,
  ): void {
    const state = this.connections.get(connectionId);
    if (!state) {
      this.logger.error(
        { connectionId, requestId },
        'Cannot set active request: connection not found',
      );
      return;
    }

    // If there's already an active request, abort it first
    if (state.activeRequestId && state.abortController) {
      this.logger.warn(
        { connectionId, oldRequestId: state.activeRequestId, newRequestId: requestId },
        'Aborting previous active request',
      );
      state.abortController.abort();
    }

    state.activeRequestId = requestId;
    state.abortController = abortController;
    state.messageCount++;

    this.logger.debug(
      { connectionId, requestId, threadId: state.threadId, messageCount: state.messageCount },
      'Active request set',
    );
  }

  /**
   * Clear the active request for a connection
   *
   * @param connectionId - The connection identifier
   */
  clearActiveRequest(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (!state) {
      this.logger.error({ connectionId }, 'Cannot clear active request: connection not found');
      return;
    }

    const clearedRequestId = state.activeRequestId;

    // Defensive cleanup: ensure AbortController is aborted
    if (state.abortController && !state.abortController.signal.aborted) {
      state.abortController.abort();
    }

    state.activeRequestId = undefined;
    state.abortController = undefined;

    this.logger.debug(
      { connectionId, requestId: clearedRequestId, threadId: state.threadId },
      'Active request cleared',
    );
  }

  /**
   * Abort the active request for a connection
   *
   * @param connectionId - The connection identifier
   * @param requestId - The request identifier (validated against active request)
   * @returns true if request was aborted, false if no matching active request
   */
  abort(connectionId: string, requestId: string): boolean {
    const state = this.connections.get(connectionId);
    if (!state) {
      this.logger.error({ connectionId, requestId }, 'Cannot abort: connection not found');
      return false;
    }

    if (state.activeRequestId !== requestId) {
      this.logger.debug(
        { connectionId, requestId, activeRequestId: state.activeRequestId },
        'Abort request does not match active request (race condition or already completed)',
      );
      return false;
    }

    if (state.abortController) {
      state.abortController.abort();
      this.logger.info({ connectionId, requestId, threadId: state.threadId }, 'Request aborted');
      return true;
    }

    this.logger.warn({ connectionId, requestId }, 'No abort controller found for active request');
    return false;
  }

  /**
   * Unregister a connection and clean up resources
   *
   * @param connectionId - The connection identifier
   */
  unregister(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (!state) {
      this.logger.warn({ connectionId }, 'Cannot unregister: connection not found');
      return;
    }

    // Abort active request if any
    if (state.activeRequestId && state.abortController) {
      this.logger.info(
        { connectionId, requestId: state.activeRequestId },
        'Aborting active request during connection cleanup',
      );
      state.abortController.abort();
    }

    // Calculate connection duration for metrics
    const duration = Date.now() - new Date(state.connectedAt).getTime();

    this.connections.delete(connectionId);

    this.logger.info(
      {
        connectionId,
        threadId: state.threadId,
        messageCount: state.messageCount,
        durationMs: duration,
        remainingConnections: this.connections.size,
      },
      'Connection unregistered',
    );
  }

  /**
   * Get total number of active connections
   *
   * @returns Number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get all connection IDs for a specific thread
   *
   * @param threadId - The thread identifier
   * @returns Array of connection IDs
   */
  getConnectionsByThread(threadId: string): string[] {
    const connectionIds: string[] = [];
    for (const [connectionId, state] of this.connections.entries()) {
      if (state.threadId === threadId) {
        connectionIds.push(connectionId);
      }
    }
    return connectionIds;
  }
}
