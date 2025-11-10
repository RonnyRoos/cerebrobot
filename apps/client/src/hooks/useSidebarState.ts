import { useState, useEffect } from 'react';

/**
 * Navigation State for sidebar persistence
 *
 * Implements localStorage-backed state management for:
 * - Sidebar expansion state (collapsed/expanded)
 * - Active route tracking
 * - Last visited timestamps
 *
 * Storage Key: 'cerebrobot:navigation-state'
 */
export interface NavigationState {
  /** Current active route path (e.g., '/threads', '/agents') */
  activeRoute: string;
  /** Whether sidebar is expanded (true) or collapsed (false) */
  isSidebarExpanded: boolean;
  /** Timestamp of last route visit (ISO 8601) */
  lastVisited: Record<string, string>;
}

const STORAGE_KEY = 'cerebrobot:navigation-state';

const DEFAULT_STATE: NavigationState = {
  activeRoute: '/threads',
  isSidebarExpanded: false,
  lastVisited: {},
};

/**
 * Custom hook for managing sidebar navigation state with localStorage persistence
 *
 * @returns Navigation state and update functions
 *
 * @example
 * ```tsx
 * const { state, setActiveRoute, toggleSidebar } = useSidebarState();
 *
 * // Track route changes
 * useEffect(() => {
 *   setActiveRoute(location.pathname);
 * }, [location.pathname]);
 *
 * // Toggle sidebar on button click
 * <button onClick={toggleSidebar}>Toggle</button>
 * ```
 */
export function useSidebarState() {
  const [state, setState] = useState<NavigationState>(() => {
    // Load initial state from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NavigationState;
        return {
          ...DEFAULT_STATE,
          ...parsed,
        };
      }
    } catch (error) {
      console.error('Failed to load navigation state from localStorage:', error);
    }
    return DEFAULT_STATE;
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save navigation state to localStorage:', error);
    }
  }, [state]);

  /**
   * Update the active route and record visit timestamp
   */
  const setActiveRoute = (route: string) => {
    setState((prev) => ({
      ...prev,
      activeRoute: route,
      lastVisited: {
        ...prev.lastVisited,
        [route]: new Date().toISOString(),
      },
    }));
  };

  /**
   * Toggle sidebar expansion state
   */
  const toggleSidebar = () => {
    setState((prev) => ({
      ...prev,
      isSidebarExpanded: !prev.isSidebarExpanded,
    }));
  };

  /**
   * Set sidebar expansion state explicitly
   */
  const setSidebarExpanded = (expanded: boolean) => {
    setState((prev) => ({
      ...prev,
      isSidebarExpanded: expanded,
    }));
  };

  return {
    state,
    setActiveRoute,
    toggleSidebar,
    setSidebarExpanded,
  };
}
