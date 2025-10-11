import { useState, useEffect, useCallback, useRef } from 'react';
import type { ThreadMetadata } from '@cerebrobot/chat-shared';
import { getJson } from '../lib/api-client.js';

interface UseThreadsResult {
  threads: ThreadMetadata[];
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * React hook for fetching and managing conversation threads
 *
 * KISS Principle: No loading state - threads appear when ready (empty array initially).
 * This follows the spec's "no loading indicators" requirement.
 *
 * @param userId - User ID to fetch threads for (null if not authenticated)
 * @param agentId - Optional agent ID to filter threads by specific agent
 * @returns Thread list, error state, and manual refresh function
 */
export function useThreads(userId: string | null, agentId?: string | null): UseThreadsResult {
  const [threads, setThreads] = useState<ThreadMetadata[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchThreads = useCallback(async () => {
    if (!userId) {
      setThreads([]);
      setError(null);
      return;
    }

    // Cancel any in-flight request AFTER we know we're making a new one
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setError(null);
      const params = new URLSearchParams({ userId });
      if (agentId) {
        params.append('agentId', agentId);
      }

      const data = await getJson<{ threads: ThreadMetadata[] }>(`/api/threads?${params}`);

      // Validate response structure
      if (!data.threads || !Array.isArray(data.threads)) {
        throw new Error('Invalid response format: missing threads array');
      }

      setThreads(data.threads);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err : new Error('Unknown error fetching threads'));
      setThreads([]); // Clear threads on error
    }
  }, [userId, agentId]);

  // Auto-fetch when userId changes
  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  // Cleanup: abort any in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    threads,
    error,
    refresh: fetchThreads,
  };
}
