/**
 * Stack Component (T045)
 *
 * Opinionated layout primitive for vertical/horizontal spacing.
 * Built on top of Box component with flex layout.
 */

import { ElementType, ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '../../utils/cn';

// Token types
type SpacingToken = '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16';

// Responsive prop support
type ResponsiveValue<T> = T | { base?: T; md?: T; lg?: T; xl?: T };

type StackOwnProps<T extends ElementType> = {
  /** Layout direction */
  direction?: ResponsiveValue<'row' | 'column'>;

  /** Gap between items (token ref) */
  spacing?: ResponsiveValue<SpacingToken>;

  /** Alignment (flexbox align-items) */
  align?: ResponsiveValue<'start' | 'center' | 'end' | 'stretch' | 'baseline'>;

  /** Distribution (flexbox justify-content) */
  justify?: ResponsiveValue<'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'>;

  /** Allow wrapping */
  wrap?: boolean;

  /** Semantic HTML element */
  as?: T;

  /** Additional className */
  className?: string;

  /** Child elements */
  children?: React.ReactNode;

  // Inherit Box props (spacing, colors, etc.)
  p?: ResponsiveValue<SpacingToken>;
  px?: ResponsiveValue<SpacingToken>;
  py?: ResponsiveValue<SpacingToken>;
  pt?: ResponsiveValue<SpacingToken>;
  pr?: ResponsiveValue<SpacingToken>;
  pb?: ResponsiveValue<SpacingToken>;
  pl?: ResponsiveValue<SpacingToken>;
  m?: ResponsiveValue<SpacingToken>;
  mx?: ResponsiveValue<SpacingToken>;
  my?: ResponsiveValue<SpacingToken>;
  mt?: ResponsiveValue<SpacingToken>;
  mr?: ResponsiveValue<SpacingToken>;
  mb?: ResponsiveValue<SpacingToken>;
  ml?: ResponsiveValue<SpacingToken>;
  bg?: ResponsiveValue<string>;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
};

type StackProps<T extends ElementType> = StackOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof StackOwnProps<T>>;

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

export const Stack = forwardRef(
  <T extends ElementType = 'div'>(
    {
      as,
      direction = 'column',
      spacing = '4',
      align,
      justify,
      wrap = false,
      className,
      children,
      // Box props
      p,
      px,
      py,
      pt,
      pr,
      pb,
      pl,
      m,
      mx,
      my,
      mt,
      mr,
      mb,
      ml,
      bg,
      rounded,
      ...rest
    }: StackProps<T>,
    ref: React.ForwardedRef<unknown>,
  ) => {
    const Component = as || 'div';

    // Convert direction to flex-row/flex-col
    const getDirectionClasses = (dir: ResponsiveValue<'row' | 'column'>): string => {
      if (typeof dir === 'string') {
        return dir === 'row' ? 'flex-row' : 'flex-col';
      }

      const classes: string[] = [];
      if (dir.base) classes.push(dir.base === 'row' ? 'flex-row' : 'flex-col');
      if (dir.md) classes.push(dir.md === 'row' ? 'md:flex-row' : 'md:flex-col');
      if (dir.lg) classes.push(dir.lg === 'row' ? 'lg:flex-row' : 'lg:flex-col');
      if (dir.xl) classes.push(dir.xl === 'row' ? 'xl:flex-row' : 'xl:flex-col');
      return classes.join(' ');
    };

    const classes = cn(
      // Base flex
      'flex',

      // Direction
      getDirectionClasses(direction),

      // Spacing
      getResponsiveClasses('gap', spacing),

      // Alignment
      getResponsiveClasses('items', align),

      // Justify
      getResponsiveClasses('justify', justify),

      // Wrapping
      wrap && 'flex-wrap',

      // Inherited Box props
      getResponsiveClasses('p', p),
      getResponsiveClasses('px', px),
      getResponsiveClasses('py', py),
      getResponsiveClasses('pt', pt),
      getResponsiveClasses('pr', pr),
      getResponsiveClasses('pb', pb),
      getResponsiveClasses('pl', pl),
      getResponsiveClasses('m', m),
      getResponsiveClasses('mx', mx),
      getResponsiveClasses('my', my),
      getResponsiveClasses('mt', mt),
      getResponsiveClasses('mr', mr),
      getResponsiveClasses('mb', mb),
      getResponsiveClasses('ml', ml),
      getResponsiveClasses('bg', bg),
      rounded && `rounded-${rounded}`,

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
