/**
 * useAgent Hook
 *
 * Fetches a single agent by ID with full configuration.
 * Used when editing or viewing agent details.
 *
 * Features:
 * - Loading state management
 * - Error handling
 * - Automatic fetch on mount
 * - Manual refetch capability
 */

import { useState, useEffect, useCallback } from 'react';
import type { Agent } from '@cerebrobot/chat-shared';
import { getJson } from '../lib/api-client';

export interface UseAgentState {
  agent: Agent | null;
  loading: boolean;
  error: string | null;
}

export interface UseAgentReturn extends UseAgentState {
  refetch: () => Promise<void>;
}

export function useAgent(id: string | null): UseAgentReturn {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!id) {
      setAgent(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getJson<Agent>(`/api/agents/${id}`);
      setAgent(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchAgent();
  }, [fetchAgent]);

  return {
    agent,
    loading,
    error,
    refetch: fetchAgent,
  };
}
