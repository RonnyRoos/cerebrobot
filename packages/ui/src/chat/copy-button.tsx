import {
  forwardRef,
  useState,
  useEffect,
  type ElementRef,
  type ComponentPropsWithoutRef,
} from 'react';
import { cn } from '../utils/cn';

/**
 * Copy state machine states
 */
type CopyState = 'idle' | 'copying' | 'copied' | 'error';

/**
 * Props for the CopyButton component
 */
export interface CopyButtonProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'onClick' | 'onCopy' | 'onError'> {
  /**
   * Text to copy to clipboard when button is clicked.
   */
  text: string;

  /**
   * Duration to show success/error feedback before resetting (in milliseconds).
   * @default 2000
   */
  feedbackDuration?: number;

  /**
   * Icon to show in idle state.
   * If undefined, shows "Copy" text.
   */
  icon?: React.ReactNode;

  /**
   * Icon to show in success state.
   * If undefined, shows "Copied!" text.
   */
  successIcon?: React.ReactNode;

  /**
   * Callback when copy succeeds.
   */
  onCopy?: (text: string) => void;

  /**
   * Callback when copy fails.
   */
  onError?: (error: Error) => void;
}

/**
 * Element ref type for the CopyButton component
 */
export type CopyButtonElement = ElementRef<'button'>;

/**
 * CopyButton Component
 *
 * A button that copies text to the clipboard with visual feedback.
 * Uses modern navigator.clipboard API with fallback to execCommand.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CopyButton text="Hello, world!" />
 *
 * // With custom feedback duration
 * <CopyButton text="Code snippet" feedbackDuration={3000} />
 *
 * // With callbacks
 * <CopyButton
 *   text="Important data"
 *   onCopy={(text) => console.log('Copied:', text)}
 *   onError={(err) => console.error('Copy failed:', err)}
 * />
 * ```
 */
export const CopyButton = forwardRef<CopyButtonElement, CopyButtonProps>(
  (
    { text, feedbackDuration = 2000, icon, successIcon, onCopy, onError, className, ...props },
    ref,
  ) => {
    const [state, setState] = useState<CopyState>('idle');

    // Reset to idle after feedback duration
    useEffect(() => {
      if (state === 'copied' || state === 'error') {
        const timeoutId = setTimeout(() => {
          setState('idle');
        }, feedbackDuration);

        return () => clearTimeout(timeoutId);
      }
    }, [state, feedbackDuration]);

    const handleClick = async () => {
      if (state !== 'idle') return;

      setState('copying');

      try {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback to execCommand for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          const success = document.execCommand('copy');
          document.body.removeChild(textArea);

          if (!success) {
            throw new Error('execCommand copy failed');
          }
        }

        setState('copied');
        onCopy?.(text);
      } catch (error) {
        setState('error');
        onError?.(error as Error);
      }
    };

    const getButtonContent = () => {
      switch (state) {
        case 'copying':
          return icon ?? 'Copying...';
        case 'copied':
          return successIcon ?? '✓ Copied!';
        case 'error':
          return 'Failed';
        case 'idle':
        default:
          return icon ?? 'Copy';
      }
    };

    const getButtonStyles = () => {
      switch (state) {
        case 'copied':
          return 'text-copy-button-success';
        case 'error':
          return 'text-red-500';
        case 'copying':
        case 'idle':
        default:
          return 'text-copy-button hover:text-copy-button-success';
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={state === 'copying'}
        className={cn(
          'px-2 py-1 text-xs font-medium rounded transition-colors',
          getButtonStyles(),
          state === 'copying' && 'cursor-wait',
          className,
        )}
        aria-label={state === 'copied' ? 'Copied to clipboard' : 'Copy to clipboard'}
        {...props}
      >
        {getButtonContent()}
      </button>
    );
  },
);

CopyButton.displayName = 'CopyButton';
