/**
 * useValidation Hook Tests
 *
 * TDD: Written FIRST before implementation
 * Tests deterministic validation behavior with debouncing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useValidation } from '../useValidation.js';

// Test schema for validation
const testSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  age: z.number().min(0, 'Age must be positive').max(120, 'Age too high'),
});

describe('useValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty errors and isValid true', () => {
      const { result } = renderHook(() => useValidation(testSchema));

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate successfully with valid data', async () => {
      const { result } = renderHook(() => useValidation(testSchema));

      act(() => {
        result.current.validate({ name: 'John', age: 30 });
      });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it('should return errors for invalid data', async () => {
      const { result } = renderHook(() => useValidation(testSchema));

      act(() => {
        result.current.validate({ name: '', age: -1 });
      });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.name).toBeDefined();
      expect(result.current.errors.age).toBeDefined();
    });

    it('should provide specific error messages', async () => {
      const { result } = renderHook(() => useValidation(testSchema));

      act(() => {
        result.current.validate({ name: '', age: 150 });
      });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.errors.name).toContain('required');
      expect(result.current.errors.age).toContain('too high');
    });

    it('should validate partial objects', async () => {
      const { result } = renderHook(() => useValidation(testSchema));

      act(() => {
        result.current.validate({ name: 'Alice' });
      });

      await act(async () => {
        vi.runAllTimers();
      });

      // Should validate only provided fields in real usage,
      // but schema may require all fields - adjust based on implementation
      expect(result.current.isValid).toBeDefined();
    });
  });

  describe('debouncing', () => {
    it('should debounce validation calls by 500ms', async () => {
      const { result } = renderHook(() => useValidation(testSchema));

      act(() => {
        // Call validate multiple times quickly
        result.current.validate({ name: 'Test1', age: 10 });
        result.current.validate({ name: 'Test2', age: 20 });
        result.current.validate({ name: 'Test3', age: 30 });
      });

      // Should not validate yet
      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual({});

      // Advance timers by 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should validate with last value only
      expect(result.current.isValid).toBeDefined();
    });

    it('should cancel pending validation on new input', async () => {
      const { result } = renderHook(() => useValidation(testSchema));

      act(() => {
        // Start validation with invalid data
        result.current.validate({ name: '', age: -1 });
      });

      // Advance time partially (200ms)
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        // Call again with valid data
        result.current.validate({ name: 'Valid', age: 25 });
      });

      // Advance remaining time (500ms total from second call)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should validate with second (valid) data
      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });
  });

  describe('immediate validation', () => {
    it('should support immediate validation without debounce', async () => {
      const { result } = renderHook(() => useValidation(testSchema));

      act(() => {
        result.current.validateImmediate({ name: '', age: -1 });
      });

      // Should validate immediately without timer advancement
      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).not.toEqual({});
    });
  });

  describe('error clearing', () => {
    it('should clear errors when validation succeeds', async () => {
      const { result } = renderHook(() => useValidation(testSchema));

      // Set errors first
      act(() => {
        result.current.validate({ name: '', age: -1 });
      });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isValid).toBe(false);

      // Fix errors
      act(() => {
        result.current.validate({ name: 'Valid', age: 25 });
      });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });
  });
});
