import { useState, useEffect } from 'react';
import type { Message } from '@cerebrobot/chat-shared';

interface UseThreadHistoryResult {
  messages: Message[];
  error: Error | null;
}

/**
 * React hook for fetching thread message history
 *
 * KISS Principle: No loading state - messages appear when ready (empty array initially).
 * This follows the spec's "no loading indicators" requirement.
 *
 * @param threadId - Thread ID to fetch history for (null if new thread)
 * @param userId - User ID for authorization
 * @returns Message history and error state
 */
export function useThreadHistory(
  threadId: string | null,
  userId: string | null,
): UseThreadHistoryResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when threadId changes
    setMessages([]);
    setError(null);

    // Don't fetch if threadId or userId is null
    if (!threadId || !userId) {
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/threads/${threadId}/messages?userId=${userId}`);

        if (!response.ok) {
          // 404 is expected for new threads with no messages yet
          if (response.status === 404) {
            setMessages([]); // Empty history for new thread
            return;
          }
          throw new Error(
            `Failed to fetch thread history: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        // Validate response structure
        if (!data.messages || !Array.isArray(data.messages)) {
          throw new Error('Invalid response format: missing messages array');
        }

        setMessages(data.messages);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error fetching thread history'));
        setMessages([]); // Clear messages on error
      }
    };

    void fetchHistory();
  }, [threadId, userId]);

  return {
    messages,
    error,
  };
}
