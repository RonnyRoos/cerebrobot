/**
 * Button Component (T047)
 *
 * Interactive button primitive with theme-aware variants and states.
 * Uses CVA for variant management and includes loading, disabled states.
 */

import { ElementType, ComponentPropsWithoutRef, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Button variants using CVA
 */
const buttonVariants = cva(
  // Base styles (always applied)
  [
    'inline-flex items-center justify-center gap-2',
    'font-semibold transition-all duration-200',
    'rounded-xl',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[0.98]',
    'backdrop-blur-sm',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-br from-purple-500 to-pink-500',
          'text-white',
          'shadow-lg shadow-purple-500/30',
          'hover:shadow-glow-purple hover:shadow-xl',
          'border border-purple-500/30',
        ],
        secondary: [
          'bg-transparent',
          'text-text-primary',
          'border-2 border-border-default',
          'hover:bg-bg-surface hover:border-purple-500/50',
          'hover:shadow-glow-purple hover:shadow-md',
          'backdrop-blur-md',
        ],
        tertiary: [
          'bg-transparent',
          'text-text-primary',
          'hover:bg-bg-surface',
          'border border-transparent',
          'hover:border-border-subtle',
        ],
        danger: [
          'bg-gradient-to-br from-error to-pink-500',
          'text-white',
          'shadow-lg shadow-error/30',
          'hover:shadow-xl hover:shadow-error/40',
          'border border-error/30',
        ],
      },
      size: {
        sm: 'px-4 py-2 text-sm rounded-lg',
        md: 'px-6 py-2.5 text-base rounded-xl',
        lg: 'px-8 py-3.5 text-lg rounded-xl',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

type ButtonOwnProps<T extends ElementType> = {
  /** Visual variant (theme-aware) */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Full-width button */
  fullWidth?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Loading state (shows spinner, disables interaction) */
  loading?: boolean;

  /** Loading text (shown instead of children when loading) */
  loadingText?: string;

  /** Icon before text */
  iconLeft?: React.ReactNode;

  /** Icon after text */
  iconRight?: React.ReactNode;

  /** Semantic HTML element */
  as?: T;

  /** Additional className */
  className?: string;

  /** Child content */
  children?: React.ReactNode;
};

type ButtonProps<T extends ElementType> = ButtonOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof ButtonOwnProps<T>> &
  VariantProps<typeof buttonVariants>;

/**
 * Simple loading spinner SVG
 */
function LoadingSpinner() {
  return (
    <svg
      className="loading-spinner animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export const Button = forwardRef(
  <T extends ElementType = 'button'>(
    {
      as,
      variant = 'primary',
      size = 'md',
      fullWidth,
      disabled,
      loading,
      loadingText,
      iconLeft,
      iconRight,
      className,
      children,
      ...rest
    }: ButtonProps<T>,
    ref: React.ForwardedRef<unknown>,
  ) => {
    const Component = as || 'button';

    // Determine if button should be disabled (loading or explicitly disabled)
    const isDisabled = disabled || loading;

    // Determine button type (default to 'button' for <button> elements)
    const buttonType = Component === 'button' && !('type' in rest) ? 'button' : undefined;

    const classes = cn(buttonVariants({ variant, size, fullWidth }), className);

    return (
      <Component
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as any}
        type={buttonType}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        className={classes}
        {...rest}
        tabIndex={isDisabled ? -1 : rest.tabIndex ?? 0}
      >
        {/* Left icon or loading spinner */}
        {loading ? <LoadingSpinner /> : iconLeft}

        {/* Content: loading text or children */}
        {loading && loadingText ? loadingText : loading ? 'Loading...' : children}

        {/* Right icon (hidden when loading) */}
        {!loading && iconRight}
      </Component>
    );
  },
);
