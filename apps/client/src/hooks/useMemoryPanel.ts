import { useState, useCallback } from 'react';

/**
 * Memory Panel State for lazy loading and animation management
 *
 * Implements session-based state management for:
 * - Panel open/close state
 * - Animation state tracking
 * - Lazy loading (fetch only when first opened)
 * - Thread-specific memory tracking
 *
 * No localStorage persistence (session state only)
 */
export interface MemoryPanelState {
  /** Whether panel is currently open */
  isOpen: boolean;
  /** Animation state for slide-in/out transitions */
  animationState: 'closed' | 'opening' | 'open' | 'closing';
  /** Current thread ID for memory context */
  threadId: string | null;
  /** Whether memory has been loaded for current thread */
  hasLoaded: boolean;
}

const DEFAULT_STATE: MemoryPanelState = {
  isOpen: false,
  animationState: 'closed',
  threadId: null,
  hasLoaded: false,
};

/**
 * Custom hook for managing memory panel state with lazy loading
 *
 * @returns Memory panel state and control functions
 *
 * @example
 * ```tsx
 * const { state, openPanel, closePanel } = useMemoryPanel();
 *
 * // Open panel for a thread
 * <button onClick={() => openPanel('thread-123')}>🧠 Memory</button>
 *
 * // Lazy load memory only when first opened
 * useEffect(() => {
 *   if (state.isOpen && !state.hasLoaded && state.threadId) {
 *     fetchMemoryGraph(state.threadId);
 *   }
 * }, [state.isOpen, state.hasLoaded, state.threadId]);
 * ```
 */
export function useMemoryPanel() {
  const [state, setState] = useState<MemoryPanelState>(DEFAULT_STATE);

  /**
   * Open memory panel for a specific thread
   * Sets animation state to 'opening' then 'open' after animation
   */
  const openPanel = useCallback((threadId: string) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      animationState: 'opening',
      threadId,
      // Reset hasLoaded if switching to a different thread
      hasLoaded: prev.threadId === threadId ? prev.hasLoaded : false,
    }));

    // Transition to 'open' state after animation completes (300ms)
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        animationState: 'open',
      }));
    }, 300);
  }, []);

  /**
   * Close memory panel with animation
   * Sets animation state to 'closing' then 'closed' after animation
   */
  const closePanel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      animationState: 'closing',
    }));

    // Transition to 'closed' state after animation completes (300ms)
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isOpen: false,
        animationState: 'closed',
      }));
    }, 300);
  }, []);

  /**
   * Mark memory as loaded for current thread
   * Called after successful fetch to prevent re-fetching
   */
  const markAsLoaded = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasLoaded: true,
    }));
  }, []);

  /**
   * Reset panel state (e.g., on navigation away from chat)
   */
  const resetPanel = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    state,
    openPanel,
    closePanel,
    markAsLoaded,
    resetPanel,
  };
}
