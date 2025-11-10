import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Badge Component
 *
 * Display count notifications or status dots.
 * Used in Sidebar, Panel, and other components.
 *
 * @example
 * ```tsx
 * <Badge variant="purple" count={5} />
 * <Badge variant="blue" dot />
 * ```
 */

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  /** Numeric count to display */
  count?: number;

  /** Show as dot instead of count */
  dot?: boolean;

  /** Additional CSS classes */
  className?: string;
}

const badgeVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center',
    'font-semibold rounded-full',
    'transition-colors duration-150',
  ],
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        purple: 'bg-accent-primary/20 text-accent-primary',
        pink: 'bg-pink-500/20 text-pink-400',
        blue: 'bg-blue-500/20 text-blue-400',
      },
      size: {
        sm: 'min-w-[18px] h-[18px] px-1.5 text-[10px]',
        md: 'min-w-[24px] h-[24px] px-2 text-xs',
      },
      dot: {
        true: 'w-2 h-2 min-w-0 p-0',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      dot: false,
    },
  },
);

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, size, count, dot = false, className, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeVariants({ variant, size, dot }), className)} {...props}>
        {!dot && count !== undefined ? count : null}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
