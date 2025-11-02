/**
 * useUpdateAgent Hook
 *
 * Provides agent update functionality with loading/error states.
 * PUTs agent configuration to /api/agents/:id endpoint.
 *
 * Features:
 * - Loading state management
 * - Error handling with typed errors
 * - Success response with updated agent
 * - Automatic state reset
 */

import { useState, useCallback } from 'react';
import type { AgentConfig, Agent } from '@cerebrobot/chat-shared';

export interface UseUpdateAgentState {
  isLoading: boolean;
  error: string | null;
  updatedAgent: Agent | null;
}

export interface UseUpdateAgentReturn extends UseUpdateAgentState {
  updateAgent: (id: string, config: AgentConfig) => Promise<void>;
  reset: () => void;
}

export function useUpdateAgent(): UseUpdateAgentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAgent, setUpdatedAgent] = useState<Agent | null>(null);

  const updateAgent = useCallback(async (id: string, config: AgentConfig) => {
    setIsLoading(true);
    setError(null);
    setUpdatedAgent(null);

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent');
      }

      const updatedData = (await response.json()) as Agent;
      setUpdatedAgent(updatedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setUpdatedAgent(null);
  }, []);

  return {
    isLoading,
    error,
    updatedAgent,
    updateAgent,
    reset,
  };
}
