/**
 * Box Component (T044)
 *
 * Low-level layout primitive with token-based styling props.
 * Supports polymorphic rendering via `as` prop.
 */

import { ElementType, ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '../../utils/cn';

// Token types (simplified - actual tokens from types.ts)
type SpacingToken = '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | 'auto';
type ColorToken = string; // e.g., 'text-primary', 'bg-surface', 'accent-primary'
type RadiusToken = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ShadowToken =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'glow-purple'
  | 'glow-blue'
  | 'glow-pink'
  | 'glow-cyan';
type BlurToken = 'sm' | 'md' | 'lg';

// Responsive prop support
type ResponsiveValue<T> = T | { base?: T; md?: T; lg?: T; xl?: T };

type BoxOwnProps<T extends ElementType> = {
  as?: T;

  // Spacing (token refs)
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
  gap?: ResponsiveValue<SpacingToken>;

  // Colors (token refs)
  color?: ResponsiveValue<ColorToken>;
  bg?: ResponsiveValue<ColorToken>;
  borderColor?: ColorToken;

  // Border & Radius
  border?: '0' | '1' | '2' | '4' | '8';
  rounded?: RadiusToken;

  // Shadow & Effects
  shadow?: ShadowToken;
  blur?: BlurToken;
  opacity?: '0' | '10' | '20' | '30' | '40' | '50' | '60' | '70' | '80' | '90' | '100';

  // Layout
  display?: ResponsiveValue<'block' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'none'>;
  w?: 'full' | 'screen' | 'auto' | string;
  h?: 'full' | 'screen' | 'auto' | string;
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';

  // Flexbox
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';

  // Other
  className?: string;
  children?: React.ReactNode;
};

type BoxProps<T extends ElementType> = BoxOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof BoxOwnProps<T>>;

/**
 * Convert responsive value to Tailwind classes
 */
function getResponsiveClasses<T extends string>(
  prefix: string,
  value: ResponsiveValue<T> | undefined,
  noHyphen = false,
): string {
  if (!value) return '';
  const separator = noHyphen ? '' : '-';
  if (typeof value === 'string') return `${prefix}${separator}${value}`;

  const classes: string[] = [];
  if (value.base) classes.push(`${prefix}${separator}${value.base}`);
  if (value.md) classes.push(`md:${prefix}${separator}${value.md}`);
  if (value.lg) classes.push(`lg:${prefix}${separator}${value.lg}`);
  if (value.xl) classes.push(`xl:${prefix}${separator}${value.xl}`);
  return classes.join(' ');
}

export const Box = forwardRef(
  <T extends ElementType = 'div'>(
    {
      as,
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
      gap,
      color,
      bg,
      borderColor,
      border,
      rounded,
      shadow,
      blur,
      opacity,
      display,
      w,
      h,
      position,
      justify,
      align,
      className,
      children,
      ...rest
    }: BoxProps<T>,
    ref: React.ForwardedRef<unknown>,
  ) => {
    const Component = as || 'div';

    const classes = cn(
      // Spacing
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
      getResponsiveClasses('gap', gap),

      // Colors
      getResponsiveClasses('text', color),
      getResponsiveClasses('bg', bg),
      borderColor && `border-${borderColor}`,

      // Border & Radius
      border && (border === '1' ? 'border' : `border-${border}`),
      rounded && `rounded-${rounded}`,

      // Shadow & Effects
      shadow && `shadow-${shadow}`,
      blur && `backdrop-blur-${blur}`,
      opacity && `opacity-${opacity}`,

      // Layout
      getResponsiveClasses('', display, true), // display classes don't have prefix (just 'flex', 'block')
      w && (w === 'full' || w === 'screen' || w === 'auto' ? `w-${w}` : w),
      h && (h === 'full' || h === 'screen' || h === 'auto' ? `h-${h}` : h),
      position && position !== 'static' && position,

      // Flexbox
      justify && `justify-${justify}`,
      align && `items-${align}`,

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
