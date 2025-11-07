/**
 * ValidationMessage Component
 *
 * Displays validation error or warning messages with accessibility support.
 * Used for form-level validation feedback.
 *
 * Features:
 * - Supports multiple error messages
 * - Error/warning severity levels
 * - ARIA live region for screen readers
 * - Role="alert" for critical errors
 * - Conditional rendering (null if no errors)
 */

import { Box, Text } from '@workspace/ui';

export interface ValidationMessageProps {
  errors?: string[];
  severity?: 'error' | 'warning';
}

export function ValidationMessage({ errors, severity = 'error' }: ValidationMessageProps) {
  // Don't render if no errors
  if (!errors || errors.length === 0) {
    return null;
  }

  const isSingleError = errors.length === 1;
  const isWarning = severity === 'warning';

  return (
    <Box
      role="alert"
      aria-live="polite"
      data-severity={severity}
      className={`p-3 px-4 rounded mb-4 text-sm leading-relaxed ${
        isWarning
          ? 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900'
          : 'bg-destructive/10 border-l-4 border-destructive text-destructive'
      }`}
    >
      {isSingleError ? (
        <Text as="p" className="m-0">
          {errors[0]}
        </Text>
      ) : (
        <Box as="ul" className="m-0 pl-5 list-disc">
          {errors.map((error, index) => (
            <Text as="li" key={index} className="my-1 first:mt-0 last:mb-0">
              {error}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
