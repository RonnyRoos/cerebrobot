import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSidebarState } from '../useSidebarState';

describe('useSidebarState', () => {
  const STORAGE_KEY = 'cerebrobot:navigation-state';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with default state when localStorage is empty', () => {
      const { result } = renderHook(() => useSidebarState());

      expect(result.current.state).toEqual({
        activeRoute: '/threads',
        isSidebarExpanded: false,
        lastVisited: {},
      });
    });

    it('should restore state from localStorage on mount', () => {
      const savedState = {
        activeRoute: '/agents',
        isSidebarExpanded: true,
        lastVisited: { '/agents': '2025-01-01T00:00:00.000Z' },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));

      const { result } = renderHook(() => useSidebarState());

      expect(result.current.state).toEqual(savedState);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, 'invalid-json');

      const { result } = renderHook(() => useSidebarState());

      expect(result.current.state).toEqual({
        activeRoute: '/threads',
        isSidebarExpanded: false,
        lastVisited: {},
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setActiveRoute', () => {
    it('should update active route', () => {
      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.setActiveRoute('/agents');
      });

      expect(result.current.state.activeRoute).toBe('/agents');
    });

    it('should record visit timestamp when route changes', () => {
      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.setActiveRoute('/agents');
      });

      expect(result.current.state.lastVisited['/agents']).toBeDefined();
      expect(typeof result.current.state.lastVisited['/agents']).toBe('string');
      // Verify it's a valid ISO 8601 timestamp
      expect(new Date(result.current.state.lastVisited['/agents']).toISOString()).toBe(
        result.current.state.lastVisited['/agents'],
      );
    });

    it('should update timestamp on repeated visits', async () => {
      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.setActiveRoute('/agents');
      });

      const firstVisit = result.current.state.lastVisited['/agents'];

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      act(() => {
        result.current.setActiveRoute('/agents');
      });

      const secondVisit = result.current.state.lastVisited['/agents'];
      expect(secondVisit).not.toBe(firstVisit);
    });

    it('should preserve timestamps for other routes', () => {
      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.setActiveRoute('/threads');
      });

      const threadsTimestamp = result.current.state.lastVisited['/threads'];

      act(() => {
        result.current.setActiveRoute('/agents');
      });

      expect(result.current.state.lastVisited['/threads']).toBe(threadsTimestamp);
      expect(result.current.state.lastVisited['/agents']).toBeDefined();
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar from collapsed to expanded', () => {
      const { result } = renderHook(() => useSidebarState());

      expect(result.current.state.isSidebarExpanded).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.state.isSidebarExpanded).toBe(true);
    });

    it('should toggle sidebar from expanded to collapsed', () => {
      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.state.isSidebarExpanded).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.state.isSidebarExpanded).toBe(false);
    });
  });

  describe('setSidebarExpanded', () => {
    it('should set sidebar to expanded when true', () => {
      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.setSidebarExpanded(true);
      });

      expect(result.current.state.isSidebarExpanded).toBe(true);
    });

    it('should set sidebar to collapsed when false', () => {
      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.setSidebarExpanded(true);
      });

      act(() => {
        result.current.setSidebarExpanded(false);
      });

      expect(result.current.state.isSidebarExpanded).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should persist state to localStorage when state changes', () => {
      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.setActiveRoute('/agents');
        result.current.toggleSidebar();
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.activeRoute).toBe('/agents');
      expect(parsed.isSidebarExpanded).toBe(true);
    });

    it('should handle localStorage.setItem errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useSidebarState());

      act(() => {
        result.current.setActiveRoute('/agents');
      });

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      setItemSpy.mockRestore();
    });
  });
});
