/**
 * Toast Component
 *
 * Simple toast notification that auto-dismisses after a timeout.
 * Used for success/error feedback (e.g., "Memory created successfully").
 */

import { useEffect } from 'react';

interface ToastProps {
  /** Message to display */
  message: string;

  /** Toast type */
  type?: 'success' | 'error' | 'info';

  /** Auto-dismiss timeout in milliseconds (default: 3000) */
  timeout?: number;

  /** Callback when toast dismisses */
  onDismiss: () => void;
}

export function Toast({
  message,
  type = 'success',
  timeout = 3000,
  onDismiss,
}: ToastProps): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDismiss, timeout);
    return () => clearTimeout(timer);
  }, [timeout, onDismiss]);

  const colors = {
    success: { bg: '#10b981', border: '#059669' },
    error: { bg: '#ef4444', border: '#dc2626' },
    info: { bg: '#3b82f6', border: '#2563eb' },
  };

  const color = colors[type];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '5rem',
        right: '1rem',
        backgroundColor: color.bg,
        color: 'white',
        padding: '0.75rem 1rem',
        borderRadius: '0.375rem',
        border: `1px solid ${color.border}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 3000,
        maxWidth: '20rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: '0',
          fontSize: '1.25rem',
          lineHeight: '1',
          opacity: 0.8,
        }}
      >
        ×
      </button>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
