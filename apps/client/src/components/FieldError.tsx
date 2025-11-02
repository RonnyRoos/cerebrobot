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

import './FieldError.css';

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
    <div className="field-error" role="alert" aria-live="polite" id={errorId}>
      <span className="field-error-icon" aria-hidden="true">
        ⚠
      </span>
      <span className="field-error-text">{error}</span>
    </div>
  );
}
