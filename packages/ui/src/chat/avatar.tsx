import { forwardRef, useState, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const avatarVariants = cva('relative flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    variant: {
      user: 'bg-message-user-bg text-message-user-text',
      agent: 'bg-message-agent-bg text-message-agent-text',
    },
    size: {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
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
