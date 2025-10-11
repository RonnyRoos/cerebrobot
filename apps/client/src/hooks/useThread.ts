import { useState, useRef } from 'react';
import { ThreadCreateResponseSchema } from '@cerebrobot/chat-shared';
import { postJson } from '../lib/api-client.js';

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
    agentId: string,
    previousThreadId?: string,
    existingThreadId?: string,
    userId?: string,
  ) => Promise<string>;
}

export function useThread(): UseThreadResult {
  const [threadId, setThreadId] = useState<string | null>(null);
  const threadPromiseRef = useRef<Promise<string> | null>(null);

  const createThread = async (
    agentId: string,
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
    const promise = requestThread(agentId, previousThreadId, userId);
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

  const requestThread = async (
    agentId: string,
    previousThreadId?: string,
    userId?: string,
  ): Promise<string> => {
    // Build request body - agentId is required
    const body: { agentId: string; previousThreadId?: string; userId?: string } = { agentId };
    if (previousThreadId && userId) {
      body.previousThreadId = previousThreadId;
      body.userId = userId;
    }

    try {
      const json = await postJson('/api/thread', body);
      const payload = ThreadCreateResponseSchema.parse(json);
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
