/**
 * useMemories Hook (Phase 2 Skeleton)
 *
 * React hook for memory CRUD operations and state management.
 * Implementations will be added in user story tasks.
 */

import { useState, useCallback } from 'react';
import type {
  MemoryEntry,
  MemorySearchResult,
  MemoryStatsResponse,
  MemoryUpdatedEvent,
  MemoryDeletedEvent,
} from '@cerebrobot/chat-shared';
import { memoryApi } from '../lib/memoryApi.js';

interface UseMemoriesResult {
  /** Current list of memories */
  memories: MemoryEntry[];

  /** Search results (when search is active) */
  searchResults: MemorySearchResult[] | null;

  /** Memory capacity stats */
  stats: MemoryStatsResponse | null;

  /** Error state */
  error: Error | null;

  /** Fetch memories for a thread (US1: T020) */
  fetchMemories: (threadId: string) => Promise<void>;

  /** Search memories (US2: T034) */
  searchMemories: (threadId: string, query: string) => Promise<void>;

  /** Clear search results */
  clearSearch: () => void;

  /** Create memory (US4: T065) */
  createMemory: (threadId: string, content: string) => Promise<void>;

  /** Update memory (US3: T051) */
  updateMemory: (memoryId: string, content: string) => Promise<void>;

  /** Delete memory (US3: T051) */
  deleteMemory: (memoryId: string) => Promise<void>;

  /** Handle memory.updated WebSocket event (US3: T052) */
  handleMemoryUpdated: (event: MemoryUpdatedEvent) => void;

  /** Handle memory.deleted WebSocket event (US3: T052) */
  handleMemoryDeleted: (event: MemoryDeletedEvent) => void;

  /** Fetch capacity stats (US5: T077) */
  fetchStats: (threadId: string) => Promise<void>;
}

/**
 * React hook for memory operations (skeleton for Phase 2)
 *
 * Implementations will be added in user story tasks:
 * - US1: fetchMemories (T020)
 * - US2: searchMemories (T034)
 * - US3: updateMemory, deleteMemory (T051)
 * - US4: createMemory (T065)
 * - US5: fetchStats (T077)
 *
 * KISS Principle: No loading states - data appears when ready.
 * Follows project pattern from useThreads.ts.
 */
export function useMemories(): UseMemoriesResult {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [stats, setStats] = useState<MemoryStatsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchMemories = useCallback(async (threadId: string) => {
    try {
      setError(null);
      const response = await memoryApi.getMemories({ threadId });
      setMemories(response.memories);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch memories'));
      setMemories([]);
    }
  }, []);

  const searchMemories = useCallback(async (threadId: string, query: string) => {
    try {
      setError(null);
      const response = await memoryApi.searchMemories({ threadId, query });
      setSearchResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to search memories'));
      setSearchResults([]);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults(null);
  }, []);

  const createMemory = useCallback(
    async (threadId: string, content: string) => {
      try {
        setError(null);
        await memoryApi.createMemory({ threadId, request: { content } });
        // Refresh memory list after creation
        await fetchMemories(threadId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create memory'));
      }
    },
    [fetchMemories],
  );

  const updateMemory = useCallback(async (memoryId: string, content: string) => {
    try {
      setError(null);
      await memoryApi.updateMemory({ memoryId, request: { content } });
      // Note: UI updates via WebSocket event (memory.updated)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update memory'));
      throw err; // Re-throw so the caller can handle it
    }
  }, []);

  const deleteMemory = useCallback(async (memoryId: string) => {
    try {
      setError(null);
      await memoryApi.deleteMemory(memoryId);
      // Note: UI updates via WebSocket event (memory.deleted)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete memory'));
      throw err; // Re-throw so the caller can handle it
    }
  }, []);

  const fetchStats = useCallback(async (threadId: string) => {
    try {
      setError(null);
      const response = await memoryApi.getMemoryStats(threadId);
      setStats(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch memory stats'));
      setStats(null);
    }
  }, []);

  /**
   * Handle memory.updated WebSocket event (T052)
   * Updates the memory in the local state when edited via API or by another client
   */
  const handleMemoryUpdated = useCallback((event: MemoryUpdatedEvent) => {
    setMemories((current) => {
      const index = current.findIndex((m) => m.id === event.memory.id);
      if (index === -1) return current; // Memory not in current list
      const updated = [...current];
      updated[index] = event.memory;
      return updated;
    });

    // Also update search results if they exist
    setSearchResults((current) => {
      if (!current) return null;
      const index = current.findIndex((r) => r.id === event.memory.id);
      if (index === -1) return current;
      const updated = [...current];
      // Preserve similarity score when updating search result
      updated[index] = { ...event.memory, similarity: updated[index].similarity };
      return updated;
    });
  }, []);

  /**
   * Handle memory.deleted WebSocket event (T052)
   * Removes the memory from local state when deleted via API or by another client
   */
  const handleMemoryDeleted = useCallback((event: MemoryDeletedEvent) => {
    setMemories((current) => current.filter((m) => m.id !== event.memoryId));

    // Also remove from search results if they exist
    setSearchResults((current) => {
      if (!current) return null;
      return current.filter((r) => r.id !== event.memoryId);
    });
  }, []);

  return {
    memories,
    searchResults,
    stats,
    error,
    fetchMemories,
    searchMemories,
    clearSearch,
    createMemory,
    updateMemory,
    deleteMemory,
    handleMemoryUpdated,
    handleMemoryDeleted,
    fetchStats,
  };
}
