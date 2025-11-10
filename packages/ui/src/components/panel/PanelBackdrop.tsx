import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { PanelBackdropProps } from './types';

/**
 * Panel Backdrop Component
 *
 * Dimmed backdrop overlay with blur effect.
 * Automatically rendered by Panel if showBackdrop=true.
 *
 * @example
 * ```tsx
 * <PanelBackdrop
 *   isVisible={isPanelOpen}
 *   onClick={handleBackdropClick}
 * />
 * ```
 */

const backdropVariants = cva(
  [
    'fixed inset-0 z-40',
    'transition-opacity duration-150',
    // Glassmorphic backdrop
    'bg-black/40 backdrop-blur-sm',
  ],
  {
    variants: {
      isVisible: {
        true: 'opacity-100',
        false: 'opacity-0 pointer-events-none',
      },
    },
    defaultVariants: {
      isVisible: false,
    },
  },
);

export const PanelBackdrop = React.forwardRef<HTMLDivElement, PanelBackdropProps>(
  ({ isVisible, onClick, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(backdropVariants({ isVisible }), className)}
        onClick={onClick}
        {...props}
      />
    );
  },
);

PanelBackdrop.displayName = 'PanelBackdrop';

export type { PanelBackdropProps };
