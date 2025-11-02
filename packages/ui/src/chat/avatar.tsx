import { forwardRef, useState, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const avatarVariants = cva('relative flex shrink-0 overflow-hidden rounded-xl', {
  variants: {
    variant: {
      user: 'bg-gradient-to-br from-[#a855f7] to-[#ec4899] text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]',
      agent:
        'bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    },
    size: {
      sm: 'h-8 w-8 text-xs',
      md: 'h-11 w-11 text-sm font-bold',
      lg: 'h-12 w-12 text-base font-bold',
    },
  },
  defaultVariants: {
    variant: 'agent',
    size: 'md',
  },
});

export interface AvatarProps
  extends ComponentPropsWithoutRef<'div'>,
    VariantProps<typeof avatarVariants> {
  /**
   * Avatar type (user or agent).
   */
  variant?: 'user' | 'agent';

  /**
   * Image URL for avatar. If null or fails to load, shows initials fallback.
   */
  src?: string | null;

  /**
   * Initials to display when image is unavailable.
   * Usually 1-2 characters (e.g., "AI", "U").
   */
  initials?: string;

  /**
   * Size of avatar.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Alt text for image accessibility.
   */
  alt?: string;

  /**
   * Override default Tailwind classes.
   */
  className?: string;
}

export type AvatarElement = ElementRef<'div'>;

export const Avatar = forwardRef<AvatarElement, AvatarProps>(
  ({ variant, src, initials, size, alt, className, ...props }, ref) => {
    const [imageError, setImageError] = useState(false);

    const showImage = src && !imageError;

    return (
      <div ref={ref} className={cn(avatarVariants({ variant, size }), className)} {...props}>
        {showImage ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-medium">
            {initials || (variant === 'agent' ? 'AI' : 'U')}
          </div>
        )}
      </div>
    );
  },
);

Avatar.displayName = 'Avatar';
