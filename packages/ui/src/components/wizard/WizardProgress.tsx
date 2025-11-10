import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { WizardProgressProps } from './types';

/**
 * Wizard Progress Component
 *
 * Dots-based progress indicator.
 * Automatically rendered by Wizard component.
 *
 * Design:
 * - Inactive: Gray border, transparent fill
 * - Active: Purple fill with glow, scale(1.25)
 * - Completed: Purple fill (no glow)
 *
 * @example
 * ```tsx
 * <WizardProgress
 *   currentStep={1}
 *   totalSteps={4}
 * />
 * ```
 */

const dotVariants = cva(['w-3 h-3 rounded-full', 'transition-all duration-200', 'border-2'], {
  variants: {
    state: {
      inactive: ['bg-transparent', 'border-border', 'scale-100'],
      active: ['bg-accent-primary', 'border-accent-primary', 'shadow-glow-purple', 'scale-125'],
      completed: ['bg-accent-primary/50', 'border-accent-primary/50', 'scale-100'],
    },
  },
  defaultVariants: {
    state: 'inactive',
  },
});

export const WizardProgress = React.forwardRef<HTMLDivElement, WizardProgressProps>(
  ({ currentStep, totalSteps, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center gap-2', className)}
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
        {...props}
      >
        {Array.from({ length: totalSteps }, (_, index) => {
          const state =
            index < currentStep ? 'completed' : index === currentStep ? 'active' : 'inactive';

          return (
            <div
              key={index}
              className={cn(dotVariants({ state }))}
              aria-label={`Step ${index + 1}${index < currentStep ? ' completed' : index === currentStep ? ' current' : ''}`}
            />
          );
        })}
      </div>
    );
  },
);

WizardProgress.displayName = 'WizardProgress';

export type { WizardProgressProps };
