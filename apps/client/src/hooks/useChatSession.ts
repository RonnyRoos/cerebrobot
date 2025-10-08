import { useState, useRef } from 'react';

/**
 * useChatSession Hook
 *
 * Manages session creation and promise-based session ID resolution.
 *
 * Error Handling Philosophy:
 * - Throws errors to caller (ChatView decides retry/display strategy)
 * - Allows fine-grained control over session error handling
 */

interface UseChatSessionResult {
  sessionId: string | null;
  sessionPromise: Promise<string> | null;
  createSession: (previousSessionId?: string) => Promise<string>;
}

export function useChatSession(): UseChatSessionResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  const createSession = async (previousSessionId?: string): Promise<string> => {
    const promise = requestSession(previousSessionId);
    sessionPromiseRef.current = promise;

    try {
      const newSessionId = await promise;
      setSessionId(newSessionId);
      return newSessionId;
    } catch (err) {
      setSessionId(null);
      sessionPromiseRef.current = null;
      throw err;
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

  return {
    sessionId,
    sessionPromise: sessionPromiseRef.current,
    createSession,
  };
}
