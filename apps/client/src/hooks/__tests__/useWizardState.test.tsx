import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useWizardState } from '../useWizardState.js';

const TestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type TestFormData = z.infer<typeof TestSchema>;

describe('useWizardState', () => {
  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.state.completedSteps).toEqual([false, false, false, false]);
      expect(result.current.state.formData).toEqual({});
      expect(result.current.state.validationErrors).toEqual({});
    });

    it('should initialize with initial data', () => {
      const initialData = { name: 'Test' };
      const { result } = renderHook(() => useWizardState<TestFormData>(4, initialData));

      expect(result.current.state.formData).toEqual(initialData);
    });

    it('should set isFirstStep to true initially', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      expect(result.current.isFirstStep).toBe(true);
    });

    it('should set isLastStep to false initially', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      expect(result.current.isLastStep).toBe(false);
    });
  });

  describe('navigation', () => {
    it('should navigate to next step', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goNext();
      });

      expect(result.current.state.currentStep).toBe(1);
      expect(result.current.state.completedSteps[0]).toBe(true);
    });

    it('should navigate back to previous step', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goNext();
        result.current.goBack();
      });

      expect(result.current.state.currentStep).toBe(0);
    });

    it('should not go beyond last step', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goNext(); // step 1
        result.current.goNext(); // step 2
        result.current.goNext(); // step 3
        result.current.goNext(); // attempt step 4 (beyond last)
      });

      expect(result.current.state.currentStep).toBe(3);
    });

    it('should not go before first step', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goBack();
      });

      expect(result.current.state.currentStep).toBe(0);
    });

    it('should update isLastStep when on last step', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goNext(); // step 1
        result.current.goNext(); // step 2
        result.current.goNext(); // step 3 (last step)
      });

      expect(result.current.isLastStep).toBe(true);
    });
  });

  describe('form data management', () => {
    it('should set entire form data', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      const formData = { name: 'John', email: 'john@example.com' };

      act(() => {
        result.current.setFormData(formData);
      });

      expect(result.current.state.formData).toEqual(formData);
    });

    it('should update single field', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4, { name: 'John' }));

      act(() => {
        result.current.updateFormField('email', 'john@example.com');
      });

      expect(result.current.state.formData).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should preserve existing fields when updating', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4, { name: 'John' }));

      act(() => {
        result.current.setFormData({ email: 'john@example.com' });
      });

      // setFormData merges with existing data
      expect(result.current.state.formData).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });
  });

  describe('validation', () => {
    it('should validate successfully with valid data', () => {
      const { result } = renderHook(() =>
        useWizardState<TestFormData>(4, {
          name: 'John',
          email: 'john@example.com',
        }),
      );

      let isValid = false;
      act(() => {
        isValid = result.current.validate(0, TestSchema);
      });

      expect(isValid).toBe(true);
      expect(result.current.state.validationErrors).toEqual({});
    });

    it('should collect validation errors with invalid data', () => {
      const { result } = renderHook(() =>
        useWizardState<TestFormData>(4, {
          name: '',
          email: 'invalid',
        }),
      );

      let isValid = false;
      act(() => {
        isValid = result.current.validate(0, TestSchema);
      });

      expect(isValid).toBe(false);
      expect(result.current.state.validationErrors).toHaveProperty('name');
      expect(result.current.state.validationErrors).toHaveProperty('email');
    });

    it('should clear validation errors on successful validation', () => {
      const { result } = renderHook(() =>
        useWizardState<TestFormData>(4, {
          name: '',
          email: 'invalid',
        }),
      );

      act(() => {
        result.current.validate(0, TestSchema);
      });

      expect(Object.keys(result.current.state.validationErrors).length).toBeGreaterThan(0);

      act(() => {
        result.current.updateFormField('name', 'John');
        result.current.updateFormField('email', 'john@example.com');
      });

      let isValid = false;
      act(() => {
        isValid = result.current.validate(0, TestSchema);
      });

      expect(isValid).toBe(true);
      expect(result.current.state.validationErrors).toEqual({});
    });

    it('should update canGoNext based on validation', () => {
      const { result } = renderHook(() =>
        useWizardState<TestFormData>(4, {
          name: '',
          email: 'invalid',
        }),
      );

      act(() => {
        result.current.validate(0, TestSchema);
      });

      expect(result.current.canGoNext).toBe(false);

      act(() => {
        result.current.updateFormField('name', 'John');
        result.current.updateFormField('email', 'john@example.com');
      });

      let isValid = false;
      act(() => {
        isValid = result.current.validate(0, TestSchema);
      });

      expect(isValid).toBe(true);
      expect(result.current.canGoNext).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goNext();
        result.current.setFormData({ name: 'John', email: 'john@example.com' });
        result.current.validate(0, TestSchema);
        result.current.reset();
      });

      expect(result.current.state.currentStep).toBe(0);
      expect(result.current.state.completedSteps).toEqual([false, false, false, false]);
      expect(result.current.state.formData).toEqual({});
      expect(result.current.state.validationErrors).toEqual({});
    });

    it('should reset to initial data if provided', () => {
      const initialData = { name: 'Default' };
      const { result } = renderHook(() => useWizardState<TestFormData>(4, initialData));

      act(() => {
        result.current.setFormData({ name: 'Changed', email: 'test@example.com' });
        result.current.reset();
      });

      expect(result.current.state.formData).toEqual(initialData);
    });
  });

  describe('completed steps tracking', () => {
    it('should mark step as complete when navigating forward', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goNext();
      });

      expect(result.current.state.completedSteps[0]).toBe(true);
      expect(result.current.state.completedSteps[1]).toBe(false);
    });

    it('should preserve completed status when navigating back', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goNext(); // mark step 0 complete
        result.current.goNext(); // mark step 1 complete
        result.current.goBack(); // back to step 1
      });

      expect(result.current.state.completedSteps[0]).toBe(true);
      expect(result.current.state.completedSteps[1]).toBe(true);
    });

    it('should track multiple completed steps', () => {
      const { result } = renderHook(() => useWizardState<TestFormData>(4));

      act(() => {
        result.current.goNext(); // complete step 0
        result.current.goNext(); // complete step 1
        result.current.goNext(); // complete step 2
      });

      expect(result.current.state.completedSteps[0]).toBe(true);
      expect(result.current.state.completedSteps[1]).toBe(true);
      expect(result.current.state.completedSteps[2]).toBe(true);
      expect(result.current.state.completedSteps[3]).toBe(false);
    });
  });
});
