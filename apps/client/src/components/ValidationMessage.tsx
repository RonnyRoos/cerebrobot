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

import './ValidationMessage.css';

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
  const severityClass = severity === 'warning' ? 'validation-warning' : 'validation-error';

  return (
    <div
      className={`validation-message ${severityClass}`}
      role="alert"
      aria-live="polite"
      data-severity={severity}
    >
      {isSingleError ? (
        <p className="validation-message-text">{errors[0]}</p>
      ) : (
        <ul className="validation-message-list">
          {errors.map((error, index) => (
            <li key={index} className="validation-message-item">
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
