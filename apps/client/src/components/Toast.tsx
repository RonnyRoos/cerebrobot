/**
 * Toast Component
 *
 * Simple toast notification that auto-dismisses after a timeout.
 * Used for success/error feedback (e.g., "Memory created successfully").
 */

import { useEffect } from 'react';
import { Box, Stack, Text, Button } from '@workspace/ui';

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

  // Map toast types to Tailwind classes using design tokens
  const typeStyles = {
    success: 'bg-green-600 border-green-700',
    error: 'bg-destructive border-destructive',
    info: 'bg-blue-600 border-blue-700',
  };

  return (
    <Box
      role="alert"
      aria-live="polite"
      className={`
        fixed top-20 right-4 z-[3000] max-w-sm
        rounded-md border shadow-lg
        animate-slide-in-right
        ${typeStyles[type]}
      `}
    >
      <Stack direction="horizontal" align="center" gap="2" className="p-3">
        <Text as="span" variant="body" className="text-white text-sm font-medium flex-1">
          {message}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-white hover:text-white/80 p-0 h-auto min-h-0 text-xl leading-none opacity-80"
        >
          ×
        </Button>
      </Stack>
    </Box>
  );
}
