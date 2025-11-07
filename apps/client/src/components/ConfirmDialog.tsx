/**
 * ConfirmDialog Component
 * Reusable confirmation dialog for destructive actions
 */

import { useEffect, useRef } from 'react';
import { Box, Stack, Text, Button } from '@workspace/ui';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 bg-transparent backdrop:bg-bg-overlay/80 backdrop:backdrop-blur-sm"
    >
      <Box className="bg-bg-surface/95 backdrop-blur-md rounded-xl p-6 max-w-md shadow-modal border border-border-default">
        <Stack direction="vertical" gap="4">
          <Text as="h2" variant="heading" size="xl">
            {title}
          </Text>
          <Text as="p" variant="body" size="base" className="text-text-secondary">
            {message}
          </Text>
          <Stack direction="horizontal" gap="3" justify="end" className="mt-2">
            <Button variant="secondary" onClick={handleCancel}>
              {cancelLabel}
            </Button>
            <Button variant="danger" onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </dialog>
  );
}
