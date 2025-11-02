/**
 * useValidation Hook
 *
 * Provides debounced validation for form data using Zod schemas.
 * Returns validation state (errors, isValid) and validate functions.
 *
 * Features:
 * - Debounced validation (500ms default)
 * - Immediate validation option
 * - Type-safe with Zod schemas
 * - Field-level error messages
 * - Automatic error clearing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';

export interface ValidationState<T> {
  errors: Record<string, string>;
  isValid: boolean;
  validate: (data: Partial<T>) => void;
  validateImmediate: (data: Partial<T>) => void;
}

export function useValidation<T extends z.ZodType>(
  schema: T,
  debounceMs = 500,
): ValidationState<z.infer<T>> {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performValidation = useCallback(
    (data: Partial<z.infer<T>>) => {
      const result = schema.safeParse(data);

      if (result.success) {
        setErrors({});
        setIsValid(true);
      } else {
        const fieldErrors: Record<string, string> = {};

        result.error.issues.forEach((issue) => {
          const path = issue.path.join('.');
          if (path) {
            fieldErrors[path] = issue.message;
          }
        });

        setErrors(fieldErrors);
        setIsValid(false);
      }
    },
    [schema],
  );

  const validate = useCallback(
    (data: Partial<z.infer<T>>) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        performValidation(data);
      }, debounceMs);
    },
    [performValidation, debounceMs],
  );

  const validateImmediate = useCallback(
    (data: Partial<z.infer<T>>) => {
      // Clear pending validation
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      performValidation(data);
    },
    [performValidation],
  );

  return {
    errors,
    isValid,
    validate,
    validateImmediate,
  };
}
