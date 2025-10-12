/**
 * Connection State Types
 *
 * Runtime entities for thread-persistent WebSocket connections.
 * These types represent ephemeral, in-memory state that exists only
 * during active WebSocket connections.
 */

/**
 * Connection lifecycle states
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'closed';

/**
 * Per-request status tracking
 */
export type RequestStatus = 'pending' | 'streaming' | 'completed' | 'cancelled' | 'error';

/**
 * Connection metadata for observability and debugging
 */
export interface ConnectionInfo {
  /**
   * Unique identifier for this WebSocket connection (crypto.randomUUID())
   */
  connectionId: string;

  /**
   * Thread this connection is associated with
   */
  threadId: string;

  /**
   * Currently active request ID (if streaming in progress)
   */
  activeRequestId?: string;

  /**
   * When the connection was established (ISO 8601 timestamp)
   */
  connectedAt: string;

  /**
   * Total number of messages sent over this connection
   */
  messageCount: number;
}
