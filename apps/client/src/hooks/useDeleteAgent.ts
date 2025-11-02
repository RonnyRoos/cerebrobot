/**
 * useDeleteAgent Hook
 * Handles DELETE /api/agents/:id with loading and error states
 */

import { useState } from 'react';

interface UseDeleteAgentReturn {
  isLoading: boolean;
  error: string | null;
  deleteAgent: (id: string) => Promise<boolean>;
  reset: () => void;
}

export function useDeleteAgent(): UseDeleteAgentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAgent = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Try to extract error message from response
        let errorMessage = `Failed to delete agent (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore JSON parse errors, use default message
        }

        setError(errorMessage);
        setIsLoading(false);
        return false;
      }

      // Successful deletion (204 No Content)
      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const reset = () => {
    setError(null);
    setIsLoading(false);
  };

  return {
    isLoading,
    error,
    deleteAgent,
    reset,
  };
}
