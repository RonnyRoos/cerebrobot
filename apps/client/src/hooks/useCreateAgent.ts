/**
 * useCreateAgent Hook
 *
 * Provides agent creation functionality with loading/error states.
 * POSTs agent configuration to /api/agents endpoint.
 *
 * Features:
 * - Loading state management
 * - Error handling with typed errors
 * - Success response with created agent
 * - Automatic state reset
 */

import { useState, useCallback } from 'react';
import type { AgentConfig } from '@cerebrobot/chat-shared';
import { postJson } from '../lib/api-client';

export interface UseCreateAgentState {
  isLoading: boolean;
  error: string | null;
  createdAgent: AgentConfig | null;
}

export interface UseCreateAgentReturn extends UseCreateAgentState {
  createAgent: (config: AgentConfig) => Promise<void>;
  reset: () => void;
}

export function useCreateAgent(): UseCreateAgentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<AgentConfig | null>(null);

  const createAgent = useCallback(async (config: AgentConfig) => {
    setIsLoading(true);
    setError(null);
    setCreatedAgent(null);

    try {
      const createdData = await postJson<AgentConfig>('/api/agents', config);
      setCreatedAgent(createdData);
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
    setCreatedAgent(null);
  }, []);

  return {
    isLoading,
    error,
    createdAgent,
    createAgent,
    reset,
  };
}
