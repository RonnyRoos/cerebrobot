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
  createThread: (previousThreadId?: string, existingThreadId?: string) => Promise<string>;
}

export function useThread(): UseThreadResult {
  const [threadId, setThreadId] = useState<string | null>(null);
  const threadPromiseRef = useRef<Promise<string> | null>(null);

  const createThread = async (
    previousThreadId?: string,
    existingThreadId?: string,
  ): Promise<string> => {
    // If existingThreadId is provided, use it directly without API call
    if (existingThreadId) {
      setThreadId(existingThreadId);
      threadPromiseRef.current = Promise.resolve(existingThreadId);
      return existingThreadId;
    }

    // Otherwise, request a new thread from the API
    const promise = requestThread(previousThreadId);
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

  const requestThread = async (previousThreadId?: string): Promise<string> => {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(previousThreadId ? { previousThreadId } : {}),
    });

    if (!response.ok) {
      throw new Error('Failed to establish thread');
    }

    const payload = (await response.json()) as { threadId: string };
    return payload.threadId;
  };

  return {
    threadId,
    threadPromise: threadPromiseRef.current,
    createThread,
  };
}
