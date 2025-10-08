import { useEffect, useState, useRef } from 'react';

/**
 * useUserId Hook
 *
 * Manages userId persistence in localStorage with UserSetup UI coordination.
 *
 * Error Handling Philosophy:
 * - localStorage operations are synchronous and rarely fail
 * - No explicit error state; failures are transparent (falls back to UserSetup)
 */

const USER_ID_KEY = 'cerebrobot_userId';

interface UseUserIdResult {
  userId: string | null;
  showUserSetup: boolean;
  handleUserIdReady: (newUserId: string) => void;
}

export function useUserId(onUserIdReady?: (userId: string) => void): UseUserIdResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [showUserSetup, setShowUserSetup] = useState(false);
  const onUserIdReadyRef = useRef(onUserIdReady);

  // Keep ref up to date
  useEffect(() => {
    onUserIdReadyRef.current = onUserIdReady;
  });

  useEffect(() => {
    // Check for existing userId in localStorage (runs once on mount)
    const existingUserId = localStorage.getItem(USER_ID_KEY);
    if (existingUserId) {
      setUserId(existingUserId);
      onUserIdReadyRef.current?.(existingUserId);
    } else {
      setShowUserSetup(true);
    }
  }, []); // Empty deps - only run on mount

  const handleUserIdReady = (newUserId: string) => {
    localStorage.setItem(USER_ID_KEY, newUserId);
    setUserId(newUserId);
    setShowUserSetup(false);
    onUserIdReadyRef.current?.(newUserId);
  };

  return {
    userId,
    showUserSetup,
    handleUserIdReady,
  };
}
