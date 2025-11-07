/**
 * ConfirmDialog Component
 *
 * Simple modal confirmation dialog for destructive actions.
 *
 * Implementation: User Story 3 (T053)
 */

import { Box, Stack, Text, Button } from '@workspace/ui';

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
    <Box
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
    >
      <Box className="bg-background p-6 rounded-lg max-w-md w-[90%] shadow-2xl">
        {/* Title */}
        <Text id="dialog-title" as="h2" variant="heading" size="lg" className="mb-3">
          {title}
        </Text>

        {/* Message */}
        <Text id="dialog-message" variant="caption" className="text-muted mb-6 leading-relaxed">
          {message}
        </Text>

        {/* Actions */}
        <Stack direction="horizontal" gap="3" className="justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : confirmLabel}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
