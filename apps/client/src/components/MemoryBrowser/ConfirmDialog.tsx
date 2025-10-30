/**
 * ConfirmDialog Component
 *
 * Simple modal confirmation dialog for destructive actions.
 *
 * Implementation: User Story 3 (T053)
 */

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Dialog title */
  title: string;

  /** Dialog message */
  message: string;

  /** Label for confirm button */
  confirmLabel?: string;

  /** Label for cancel button */
  cancelLabel?: string;

  /** Callback when user confirms */
  onConfirm: () => void;

  /** Callback when user cancels */
  onCancel: () => void;

  /** Whether confirm action is in progress */
  isProcessing?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isProcessing = false,
}: ConfirmDialogProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Title */}
        <h2
          id="dialog-title"
          style={{
            margin: 0,
            marginBottom: '0.75rem',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          id="dialog-message"
          style={{
            margin: 0,
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: '#6b7280',
            lineHeight: '1.5',
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            {isProcessing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
