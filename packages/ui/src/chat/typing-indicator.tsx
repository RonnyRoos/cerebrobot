import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

/**
 * Typing indicator variants using class-variance-authority
 */
const typingIndicatorVariants = cva(
  'inline-flex items-center gap-1.5 px-5 py-4 rounded-2xl backdrop-blur-md bg-message-agent-bg/15 border border-message-agent-bg/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  {
    variants: {
      variant: {
        dots: 'gap-1.5',
        pulse: 'gap-0',
      },
    },
    defaultVariants: {
      variant: 'dots',
    },
  },
);

/**
 * Props for the TypingIndicator component
 */
export interface TypingIndicatorProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children'>,
    VariantProps<typeof typingIndicatorVariants> {
  /**
   * Visual style of the typing indicator.
   * - 'dots': Three bouncing dots animation
   * - 'pulse': Single pulsing circle animation
   * @default 'dots'
   */
  variant?: 'dots' | 'pulse';

  /**
   * Accessible label for screen readers.
   * @default 'Agent is typing'
   */
  ariaLabel?: string;
}

/**
 * Element ref type for the TypingIndicator component
 */
export type TypingIndicatorElement = ElementRef<'div'>;

/**
 * TypingIndicator Component
 *
 * Displays an animated indicator to show when the agent is processing a response.
 * Uses CSS-only animations for smooth 60fps performance without JavaScript overhead.
 *
 * @example
 * ```tsx
 * // Bouncing dots (default)
 * <TypingIndicator />
 *
 * // Pulsing circle
 * <TypingIndicator variant="pulse" />
 *
 * // Custom accessibility label
 * <TypingIndicator ariaLabel="AI assistant is thinking" />
 * ```
 */
export const TypingIndicator = forwardRef<TypingIndicatorElement, TypingIndicatorProps>(
  ({ variant = 'dots', ariaLabel = 'Agent is typing', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className={cn(typingIndicatorVariants({ variant }), className)}
        {...props}
      >
        {variant === 'dots' ? (
          <>
            <span className="typing-dot" aria-hidden="true" />
            <span className="typing-dot typing-dot-delay-1" aria-hidden="true" />
            <span className="typing-dot typing-dot-delay-2" aria-hidden="true" />
          </>
        ) : (
          <span className="typing-pulse" aria-hidden="true" />
        )}
      </div>
    );
  },
);

TypingIndicator.displayName = 'TypingIndicator';
