/**
 * useAgents Hook
 * Fetches and manages agent list from API
 */

import { useState, useEffect } from 'react';
import type { AgentListItem } from '@cerebrobot/chat-shared';

interface UseAgentsResult {
  agents: AgentListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAgents(): UseAgentsResult {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/agents');

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }

      const data = (await response.json()) as { agents: AgentListItem[] };
      setAgents(data.agents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAgents();
  }, []);

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents,
  };
}
