import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAgentFilter } from '../useAgentFilter';

describe('useAgentFilter', () => {
  const STORAGE_KEY = 'cerebrobot:agent-filter';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with null filter when localStorage is empty', () => {
      const { result } = renderHook(() => useAgentFilter());

      expect(result.current.filter).toBeNull();
    });

    it('should restore filter from localStorage on mount', () => {
      const savedFilter = { agentId: 'agent-123', agentName: 'Test Agent' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilter));

      const { result } = renderHook(() => useAgentFilter());

      expect(result.current.filter).toEqual(savedFilter);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json');

      const { result } = renderHook(() => useAgentFilter());

      expect(result.current.filter).toBeNull();
    });
  });

  describe('setFilter', () => {
    it('should set filter and persist to localStorage', () => {
      const { result } = renderHook(() => useAgentFilter());

      act(() => {
        result.current.setFilter('agent-456', 'My Agent');
      });

      expect(result.current.filter).toEqual({
        agentId: 'agent-456',
        agentName: 'My Agent',
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBe(JSON.stringify({ agentId: 'agent-456', agentName: 'My Agent' }));
    });

    it('should update filter when called multiple times', () => {
      const { result } = renderHook(() => useAgentFilter());

      act(() => {
        result.current.setFilter('agent-1', 'Agent One');
      });

      expect(result.current.filter?.agentId).toBe('agent-1');

      act(() => {
        result.current.setFilter('agent-2', 'Agent Two');
      });

      expect(result.current.filter?.agentId).toBe('agent-2');
      expect(result.current.filter?.agentName).toBe('Agent Two');
    });

    it('should handle localStorage.setItem errors gracefully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useAgentFilter());

      // Should not throw
      act(() => {
        result.current.setFilter('agent-789', 'Another Agent');
      });

      // Filter should still be set in memory
      expect(result.current.filter).toEqual({
        agentId: 'agent-789',
        agentName: 'Another Agent',
      });

      setItemSpy.mockRestore();
    });
  });

  describe('clearFilter', () => {
    it('should clear filter and remove from localStorage', () => {
      const { result } = renderHook(() => useAgentFilter());

      // Set a filter first
      act(() => {
        result.current.setFilter('agent-123', 'Test Agent');
      });

      expect(result.current.filter).not.toBeNull();

      // Clear the filter
      act(() => {
        result.current.clearFilter();
      });

      expect(result.current.filter).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should handle localStorage.removeItem errors gracefully', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useAgentFilter());

      act(() => {
        result.current.setFilter('agent-123', 'Test Agent');
      });

      // Should not throw
      act(() => {
        result.current.clearFilter();
      });

      // Filter should still be cleared in memory
      expect(result.current.filter).toBeNull();

      removeItemSpy.mockRestore();
    });
  });

  describe('auto-clear on agent deletion', () => {
    it('should clear filter if agent is deleted', () => {
      const savedFilter = { agentId: 'agent-123', agentName: 'Test Agent' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilter));

      const { result, rerender } = renderHook(
        ({ availableAgentIds }) => useAgentFilter(availableAgentIds),
        {
          initialProps: { availableAgentIds: ['agent-123', 'agent-456'] },
        },
      );

      // Filter should be loaded
      expect(result.current.filter).toEqual(savedFilter);

      // Rerender with agent-123 removed
      rerender({ availableAgentIds: ['agent-456'] });

      // Filter should be auto-cleared
      expect(result.current.filter).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should keep filter if agent still exists', () => {
      const savedFilter = { agentId: 'agent-123', agentName: 'Test Agent' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilter));

      const { result, rerender } = renderHook(
        ({ availableAgentIds }) => useAgentFilter(availableAgentIds),
        {
          initialProps: { availableAgentIds: ['agent-123', 'agent-456'] },
        },
      );

      expect(result.current.filter).toEqual(savedFilter);

      // Rerender with agent-123 still present
      rerender({ availableAgentIds: ['agent-123', 'agent-789'] });

      // Filter should remain
      expect(result.current.filter).toEqual(savedFilter);
    });

    it('should not auto-clear if availableAgentIds is empty array', () => {
      const savedFilter = { agentId: 'agent-123', agentName: 'Test Agent' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilter));

      const { result } = renderHook(() => useAgentFilter([]));

      // Filter should remain (no agents loaded yet)
      expect(result.current.filter).toEqual(savedFilter);
    });

    it('should handle storage removal errors during auto-clear', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const savedFilter = { agentId: 'agent-123', agentName: 'Test Agent' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilter));

      const { result } = renderHook(() => useAgentFilter(['agent-456']));

      // Should not throw, filter cleared in memory
      expect(result.current.filter).toBeNull();

      removeItemSpy.mockRestore();
    });
  });

  describe('persistence across re-renders', () => {
    it('should maintain filter across component re-renders', () => {
      const { result, rerender } = renderHook(() => useAgentFilter());

      act(() => {
        result.current.setFilter('agent-123', 'Test Agent');
      });

      expect(result.current.filter?.agentId).toBe('agent-123');

      // Rerender
      rerender();

      // Filter should persist
      expect(result.current.filter?.agentId).toBe('agent-123');
    });
  });
});
