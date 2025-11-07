/**
 * FieldError Component
 *
 * Inline validation error display for form fields.
 * Shows error message with icon in red styling.
 *
 * Features:
 * - Inline field-level errors
 * - Error icon indicator
 * - ARIA live region for screen readers
 * - Role="alert" for critical errors
 * - Conditional rendering (null if no error)
 * - Field association via aria-describedby pattern
 */

import { Stack, Text } from '@workspace/ui';

export interface FieldErrorProps {
  error?: string | null;
  fieldId?: string;
}

export function FieldError({ error, fieldId }: FieldErrorProps) {
  // Don't render if no error
  if (!error || error.trim() === '') {
    return null;
  }

  const errorId = fieldId ? `${fieldId}-error` : undefined;

  return (
    <Stack
      direction="horizontal"
      gap="2"
      align="center"
      role="alert"
      aria-live="polite"
      id={errorId}
      className="mt-1"
    >
      <Text as="span" className="shrink-0 text-base leading-none text-error" aria-hidden="true">
        ⚠
      </Text>
      <Text as="span" className="flex-1 text-sm text-error">
        {error}
      </Text>
    </Stack>
  );
}
