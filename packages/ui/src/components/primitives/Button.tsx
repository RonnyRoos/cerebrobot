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
    'font-medium transition-all duration-200',
    'rounded-lg',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-98',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-accent-primary text-white',
          'hover:bg-opacity-90 hover:shadow-glow-purple',
          'shadow-md',
        ],
        secondary: [
          'border border-border-subtle',
          'bg-transparent text-text-primary',
          'hover:bg-bg-surface',
        ],
        tertiary: ['bg-transparent text-text-primary', 'hover:bg-bg-surface'],
        danger: ['bg-red-600 text-white', 'hover:bg-red-700', 'shadow-md'],
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
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
