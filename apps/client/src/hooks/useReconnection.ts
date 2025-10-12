import { useEffect, useRef } from 'react';

/**
 * Reconnection delay strategy: exponential backoff
 * [1 second, 2 seconds, 4 seconds]
 */
export const RECONNECT_DELAYS_MS = [1000, 2000, 4000] as const;

/**
 * Maximum reconnection attempts before requiring manual intervention
 */
export const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * useReconnection Hook
 *
 * Implements automatic reconnection with exponential backoff after connection loss.
 * Attempts reconnection up to MAX_RECONNECT_ATTEMPTS times with increasing delays.
 * After exhausting attempts, requires manual retry by the user.
 *
 * **Reconnection strategy**:
 * - Attempt 1: Wait 1 second → reconnect
 * - Attempt 2: Wait 2 seconds → reconnect
 * - Attempt 3: Wait 4 seconds → reconnect
 * - Total auto-retry window: 7 seconds
 * - After 3 failed attempts: stop and require manual retry
 *
 * **Pattern**: Passive monitoring + active retry trigger
 *
 * @param isConnected - Current connection state (from useThreadConnection)
 * @param reconnectFn - Function to trigger reconnection (increments reconnectTrigger)
 */
export function useReconnection(isConnected: boolean, reconnectFn: () => void) {
  const attemptRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If connected, reset attempt counter and clear any pending timer
    if (isConnected) {
      if (attemptRef.current > 0) {
        console.log('[useReconnection] Connection restored, resetting attempt counter');
      }
      attemptRef.current = 0;

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    // If disconnected and haven't exhausted attempts, schedule reconnection
    if (attemptRef.current < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAYS_MS[attemptRef.current];
      const attemptNumber = attemptRef.current + 1;

      console.log('[useReconnection] Scheduling reconnection attempt', {
        attemptNumber,
        maxAttempts: MAX_RECONNECT_ATTEMPTS,
        delayMs: delay,
      });

      timerRef.current = setTimeout(() => {
        console.log('[useReconnection] Executing reconnection attempt', {
          attemptNumber,
          maxAttempts: MAX_RECONNECT_ATTEMPTS,
        });

        attemptRef.current = attemptNumber;
        reconnectFn();
      }, delay);
    } else {
      console.log('[useReconnection] Max reconnection attempts exhausted, manual retry required');
    }

    // Cleanup timer on unmount or dependency change
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected, reconnectFn]);

  return {
    attemptCount: attemptRef.current,
    maxAttempts: MAX_RECONNECT_ATTEMPTS,
    isRetrying: !isConnected && attemptRef.current < MAX_RECONNECT_ATTEMPTS,
    isExhausted: !isConnected && attemptRef.current >= MAX_RECONNECT_ATTEMPTS,
  };
}
