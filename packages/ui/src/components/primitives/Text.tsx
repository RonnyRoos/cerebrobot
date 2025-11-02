/**
 * Text Component (T046)
 *
 * Typography primitive with semantic variants and token-based styling.
 */

import { ElementType, ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '../../utils/cn';

// Token types
type FontSizeToken = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
type FontWeightToken = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
type ColorToken = string;

// Responsive prop support
type ResponsiveValue<T> = T | { base?: T; md?: T; lg?: T; xl?: T };

type TextOwnProps<T extends ElementType> = {
  /** Typographic variant (maps to token presets) */
  variant?: 'body' | 'label' | 'caption' | 'code';

  /** Font size override (token ref) */
  size?: ResponsiveValue<FontSizeToken>;

  /** Font weight override (token ref) */
  weight?: FontWeightToken;

  /** Text color (token ref) */
  color?: ColorToken;

  /** Text alignment */
  align?: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>;

  /** Truncation behavior */
  truncate?: boolean;

  /** Line clamp (multi-line truncation) */
  lineClamp?: number;

  /** Semantic HTML element */
  as?: T;

  /** Additional className */
  className?: string;

  /** Child content */
  children?: React.ReactNode;
};

type TextProps<T extends ElementType> = TextOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps<T>>;

/**
 * Convert responsive value to Tailwind classes
 */
function getResponsiveClasses<T extends string>(
  prefix: string,
  value: ResponsiveValue<T> | undefined,
): string {
  if (!value) return '';
  if (typeof value === 'string') return `${prefix}-${value}`;

  const classes: string[] = [];
  if (value.base) classes.push(`${prefix}-${value.base}`);
  if (value.md) classes.push(`md:${prefix}-${value.md}`);
  if (value.lg) classes.push(`lg:${prefix}-${value.lg}`);
  if (value.xl) classes.push(`xl:${prefix}-${value.xl}`);
  return classes.join(' ');
}

/**
 * Get variant preset styles
 */
function getVariantClasses(variant: TextOwnProps<ElementType>['variant']): string {
  switch (variant) {
    case 'label':
      return 'text-sm font-medium';
    case 'caption':
      return 'text-xs text-text-secondary';
    case 'code':
      return 'font-mono text-sm';
    case 'body':
    default:
      return 'text-base font-normal';
  }
}

export const Text = forwardRef(
  <T extends ElementType = 'p'>(
    {
      as,
      variant = 'body',
      size,
      weight,
      color,
      align,
      truncate,
      lineClamp,
      className,
      children,
      ...rest
    }: TextProps<T>,
    ref: React.ForwardedRef<unknown>,
  ) => {
    const Component = as || 'p';

    const classes = cn(
      // Variant preset (base styles)
      getVariantClasses(variant),

      // Size override (if provided, overrides variant size)
      getResponsiveClasses('text', size),

      // Weight override
      weight && `font-${weight}`,

      // Color (default to text-primary if not provided and variant doesn't set one)
      color ? `text-${color}` : variant !== 'caption' ? 'text-text-primary' : '',

      // Alignment
      getResponsiveClasses('text', align),

      // Truncation
      truncate && 'truncate',
      lineClamp && `line-clamp-${lineClamp}`,

      // Custom className
      className,
    );

    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Component ref={ref as any} className={classes} {...rest}>
        {children}
      </Component>
    );
  },
);
