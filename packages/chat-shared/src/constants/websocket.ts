/**
 * WebSocket Constants
 *
 * Centralized constants for WebSocket communication patterns.
 */

/**
 * Standard WebSocket close codes
 * @see https://datatracker.ietf.org/doc/html/rfc6455#section-7.4
 */
export const WS_CLOSE_CODES = {
  /** Normal closure - connection completed successfully */
  NORMAL_CLOSURE: 1000,

  /** Abnormal closure - connection closed without close frame */
  ABNORMAL_CLOSURE: 1006,

  /** Policy violation - used for thread ID mismatch or missing parameters */
  POLICY_VIOLATION: 1008,

  /** Server error - internal server error during message processing */
  INTERNAL_ERROR: 1011,
} as const;

/**
 * Human-readable descriptions for WebSocket close codes
 */
export const WS_CLOSE_CODE_DESCRIPTIONS: Record<number, string> = {
  [WS_CLOSE_CODES.NORMAL_CLOSURE]: 'normal_closure',
  [WS_CLOSE_CODES.ABNORMAL_CLOSURE]: 'abnormal_closure',
  [WS_CLOSE_CODES.POLICY_VIOLATION]: 'policy_violation',
  [WS_CLOSE_CODES.INTERNAL_ERROR]: 'internal_error',
};

/**
 * Connection limits for deployment constraints
 */
export const CONNECTION_LIMITS = {
  /** Maximum concurrent WebSocket connections per deployment */
  MAX_CONCURRENT_CONNECTIONS: 5,

  /** Warning threshold for connection count monitoring */
  CONNECTION_WARNING_THRESHOLD: 5,
} as const;
