import { useState, useCallback } from 'react';
import type { ZodSchema } from 'zod';

/**
 * WizardState - Generic wizard state management
 *
 * Tracks current step, completed steps, form data, and validation errors.
 * Provides methods for navigation, data updates, and validation.
 *
 * @template T - Form data type (e.g., AgentConfig)
 */
export interface WizardState<T> {
  currentStep: number;
  completedSteps: boolean[];
  formData: Partial<T>;
  validationErrors: Record<string, string>;
}

export interface UseWizardStateReturn<T> {
  state: WizardState<T>;
  goNext: () => void;
  goBack: () => void;
  setFormData: (data: Partial<T>) => void;
  updateFormField: <K extends keyof T>(field: K, value: T[K]) => void;
  validate: (stepIndex: number, schema: ZodSchema) => boolean;
  reset: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
}

/**
 * useWizardState - Hook for managing multi-step wizard state
 *
 * Features:
 * - Step-by-step navigation with validation
 * - Form data persistence across steps
 * - Field-level validation errors
 * - Reset on cancel
 *
 * @param totalSteps - Total number of steps in wizard
 * @param initialData - Optional initial form data
 * @returns Wizard state and control methods
 */
export function useWizardState<T extends Record<string, unknown>>(
  totalSteps: number,
  initialData?: Partial<T>,
): UseWizardStateReturn<T> {
  const [state, setState] = useState<WizardState<T>>({
    currentStep: 0,
    completedSteps: Array(totalSteps).fill(false),
    formData: initialData || ({} as Partial<T>),
    validationErrors: {},
  });

  // Navigate to next step (mark current step as complete)
  const goNext = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= totalSteps - 1) return prev; // Already at last step

      const newCompletedSteps = [...prev.completedSteps];
      newCompletedSteps[prev.currentStep] = true;

      return {
        ...prev,
        currentStep: prev.currentStep + 1,
        completedSteps: newCompletedSteps,
      };
    });
  }, [totalSteps]);

  // Navigate to previous step (preserve data)
  const goBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  // Update entire form data object
  const setFormData = useCallback((data: Partial<T>) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  // Update a single form field
  const updateFormField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
    }));
  }, []);

  // Validate current step against schema
  const validate = useCallback(
    (stepIndex: number, schema: ZodSchema): boolean => {
      const result = schema.safeParse(state.formData);

      if (result.success) {
        // Clear validation errors for this step
        setState((prev) => ({
          ...prev,
          validationErrors: {},
        }));
        return true;
      }

      // Extract field-level errors
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path.join('.');
        errors[field] = issue.message;
      });

      setState((prev) => ({
        ...prev,
        validationErrors: errors,
      }));

      return false;
    },
    [state.formData],
  );

  // Reset wizard to initial state
  const reset = useCallback(() => {
    setState({
      currentStep: 0,
      completedSteps: Array(totalSteps).fill(false),
      formData: initialData || ({} as Partial<T>),
      validationErrors: {},
    });
  }, [totalSteps, initialData]);

  // Computed properties
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === totalSteps - 1;
  const canGoNext = Object.keys(state.validationErrors).length === 0;

  return {
    state,
    goNext,
    goBack,
    setFormData,
    updateFormField,
    validate,
    reset,
    isFirstStep,
    isLastStep,
    canGoNext,
  };
}
