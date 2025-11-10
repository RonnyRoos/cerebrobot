import { useState, useCallback, useEffect } from 'react';

/**
 * Agent filter state
 * Used to persist agent filtering across sessions via localStorage
 */
export interface AgentFilter {
  agentId: string;
  agentName: string;
}

/**
 * Result from useAgentFilter hook
 */
export interface UseAgentFilterResult {
  /**
   * Current agent filter (null if showing all threads)
   */
  filter: AgentFilter | null;

  /**
   * Set agent filter (enters agent-filtered mode)
   */
  setFilter: (agentId: string, agentName: string) => void;

  /**
   * Clear agent filter (returns to all threads mode)
   */
  clearFilter: () => void;
}

const STORAGE_KEY = 'cerebrobot:agent-filter';

/**
 * Custom hook for managing agent filter with localStorage persistence
 *
 * Features:
 * - Persists filter across browser sessions via localStorage
 * - Auto-clears filter if referenced agent is deleted
 * - Provides setFilter/clearFilter methods for UI controls
 *
 * Usage:
 * ```tsx
 * const { filter, setFilter, clearFilter } = useAgentFilter();
 *
 * // Enter agent-filtered mode
 * setFilter('agent-123', 'My Agent');
 *
 * // Clear filter (return to all threads)
 * clearFilter();
 *
 * // Check if filtered
 * if (filter) {
 *   console.log(`Filtered to: ${filter.agentName}`);
 * }
 * ```
 *
 * @param availableAgentIds - List of currently available agent IDs (for validation)
 * @returns Agent filter state and control methods
 */
export function useAgentFilter(availableAgentIds: string[] = []): UseAgentFilterResult {
  // Initialize from localStorage
  const [filter, setFilterState] = useState<AgentFilter | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as AgentFilter;
      }
    } catch {
      // Ignore parse errors - return null
    }
    return null;
  });

  // Auto-clear filter if agent is deleted
  useEffect(() => {
    if (filter && availableAgentIds.length > 0 && !availableAgentIds.includes(filter.agentId)) {
      setFilterState(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  }, [filter, availableAgentIds]);

  // Set filter and persist to localStorage
  const setFilter = useCallback((agentId: string, agentName: string) => {
    const newFilter: AgentFilter = { agentId, agentName };
    setFilterState(newFilter);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilter));
    } catch {
      // Ignore storage errors (quota exceeded, private browsing, etc.)
    }
  }, []);

  // Clear filter and remove from localStorage
  const clearFilter = useCallback(() => {
    setFilterState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    filter,
    setFilter,
    clearFilter,
  };
}
