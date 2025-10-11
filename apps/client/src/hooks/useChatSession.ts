import { useState, useRef } from 'react';

/**
 * useThread Hook
 *
 * Manages thread creation and promise-based thread ID resolution.
 *
 * Phase 4 Update:
 * - Supports reusing existing threadId when resuming conversations
 * - Skips thread creation API call if existingThreadId is provided
 *
 * Error Handling Philosophy:
 * - Throws errors to caller (ChatView decides retry/display strategy)
 * - Allows fine-grained control over thread error handling
 */

interface UseThreadResult {
  threadId: string | null;
  threadPromise: Promise<string> | null;
  createThread: (
    previousThreadId?: string,
    existingThreadId?: string,
    userId?: string,
  ) => Promise<string>;
}

export function useThread(): UseThreadResult {
  const [threadId, setThreadId] = useState<string | null>(null);
  const threadPromiseRef = useRef<Promise<string> | null>(null);

  const createThread = async (
    previousThreadId?: string,
    existingThreadId?: string,
    userId?: string,
  ): Promise<string> => {
    // If existingThreadId is provided, use it directly without API call
    if (existingThreadId) {
      setThreadId(existingThreadId);
      threadPromiseRef.current = Promise.resolve(existingThreadId);
      return existingThreadId;
    }

    // Otherwise, request a new thread from the API
    const promise = requestThread(previousThreadId, userId);
    threadPromiseRef.current = promise;

    try {
      const newThreadId = await promise;
      setThreadId(newThreadId);
      return newThreadId;
    } catch (err) {
      setThreadId(null);
      threadPromiseRef.current = null;
      throw err;
    }
  };

  const requestThread = async (previousThreadId?: string, userId?: string): Promise<string> => {
    // Build request body - include userId if resetting previous thread
    const body: { previousThreadId?: string; userId?: string } = {};
    if (previousThreadId && userId) {
      body.previousThreadId = previousThreadId;
      body.userId = userId;
    }

    try {
      const response = await fetch('/api/thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const context = previousThreadId ? ` (resetting from ${previousThreadId})` : '';
        throw new Error(
          `Failed to establish thread${context}: ${response.status} ${response.statusText}`,
        );
      }

      const payload = (await response.json()) as { threadId: string };
      return payload.threadId;
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`Failed to establish thread: ${String(err)}`);
    }
  };

  return {
    threadId,
    threadPromise: threadPromiseRef.current,
    createThread,
  };
}
