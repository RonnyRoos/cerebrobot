import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMemoryPanel } from '../useMemoryPanel';

describe('useMemoryPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default closed state', () => {
      const { result } = renderHook(() => useMemoryPanel());

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.animationState).toBe('closed');
      expect(result.current.state.threadId).toBe(null);
      expect(result.current.state.hasLoaded).toBe(false);
    });
  });

  describe('openPanel', () => {
    it('should open panel for a thread', () => {
      const { result } = renderHook(() => useMemoryPanel());

      act(() => {
        result.current.openPanel('thread-123');
      });

      expect(result.current.state.isOpen).toBe(true);
      expect(result.current.state.animationState).toBe('opening');
      expect(result.current.state.threadId).toBe('thread-123');
      expect(result.current.state.hasLoaded).toBe(false);
    });

    it('should transition to open state after animation (300ms)', () => {
      const { result } = renderHook(() => useMemoryPanel());

      act(() => {
        result.current.openPanel('thread-123');
      });

      expect(result.current.state.animationState).toBe('opening');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.state.animationState).toBe('open');
    });

    it('should reset hasLoaded when switching to different thread', () => {
      const { result } = renderHook(() => useMemoryPanel());

      act(() => {
        result.current.openPanel('thread-123');
      });

      act(() => {
        result.current.markAsLoaded();
      });

      expect(result.current.state.hasLoaded).toBe(true);

      // Switch to different thread
      act(() => {
        result.current.openPanel('thread-456');
      });

      expect(result.current.state.threadId).toBe('thread-456');
      expect(result.current.state.hasLoaded).toBe(false);
    });

    it('should preserve hasLoaded when reopening same thread', () => {
      const { result } = renderHook(() => useMemoryPanel());

      act(() => {
        result.current.openPanel('thread-123');
      });

      act(() => {
        result.current.markAsLoaded();
      });

      expect(result.current.state.hasLoaded).toBe(true);

      // Close panel
      act(() => {
        result.current.closePanel();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Reopen same thread
      act(() => {
        result.current.openPanel('thread-123');
      });

      expect(result.current.state.threadId).toBe('thread-123');
      expect(result.current.state.hasLoaded).toBe(true);
    });
  });

  describe('closePanel', () => {
    it('should close panel with animation', () => {
      const { result } = renderHook(() => useMemoryPanel());

      act(() => {
        result.current.openPanel('thread-123');
      });

      act(() => {
        result.current.closePanel();
      });

      expect(result.current.state.isOpen).toBe(true); // Still open during animation
      expect(result.current.state.animationState).toBe('closing');
    });

    it('should transition to closed state after animation (300ms)', () => {
      const { result } = renderHook(() => useMemoryPanel());

      act(() => {
        result.current.openPanel('thread-123');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.closePanel();
      });

      expect(result.current.state.animationState).toBe('closing');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.animationState).toBe('closed');
    });
  });

  describe('markAsLoaded', () => {
    it('should mark memory as loaded', () => {
      const { result } = renderHook(() => useMemoryPanel());

      act(() => {
        result.current.openPanel('thread-123');
      });

      expect(result.current.state.hasLoaded).toBe(false);

      act(() => {
        result.current.markAsLoaded();
      });

      expect(result.current.state.hasLoaded).toBe(true);
    });
  });

  describe('resetPanel', () => {
    it('should reset panel to default state', () => {
      const { result } = renderHook(() => useMemoryPanel());

      act(() => {
        result.current.openPanel('thread-123');
      });

      act(() => {
        result.current.markAsLoaded();
      });

      act(() => {
        result.current.resetPanel();
      });

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.animationState).toBe('closed');
      expect(result.current.state.threadId).toBe(null);
      expect(result.current.state.hasLoaded).toBe(false);
    });
  });

  describe('Lazy Loading Pattern', () => {
    it('should enable lazy loading pattern (fetch only when first opened)', () => {
      const { result } = renderHook(() => useMemoryPanel());

      // Initially closed, hasLoaded false
      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.hasLoaded).toBe(false);

      // Open panel - should trigger fetch
      act(() => {
        result.current.openPanel('thread-123');
      });

      expect(result.current.state.isOpen).toBe(true);
      expect(result.current.state.hasLoaded).toBe(false); // Not loaded yet

      // Simulate fetch completion
      act(() => {
        result.current.markAsLoaded();
      });

      expect(result.current.state.hasLoaded).toBe(true);

      // Close panel
      act(() => {
        result.current.closePanel();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Reopen panel - should NOT trigger fetch (hasLoaded still true)
      act(() => {
        result.current.openPanel('thread-123');
      });

      expect(result.current.state.isOpen).toBe(true);
      expect(result.current.state.hasLoaded).toBe(true); // Still loaded
    });
  });
});
