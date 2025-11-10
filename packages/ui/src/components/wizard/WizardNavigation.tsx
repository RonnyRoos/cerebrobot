import React from 'react';
import { cn } from '../../utils/cn';
import type { WizardNavigationProps } from './types';
import { Button } from '../primitives';

/**
 * Wizard Navigation Component
 *
 * Back/Next/Complete buttons with loading states.
 * Automatically rendered by Wizard component.
 *
 * Layout:
 * - Cancel (left, secondary)
 * - Back (left, secondary, disabled on first step)
 * - Next/Complete (right, primary)
 *
 * @example
 * ```tsx
 * <WizardNavigation
 *   currentStep={1}
 *   totalSteps={4}
 *   onBack={() => setStep(0)}
 *   onNext={() => setStep(2)}
 *   onCancel={handleCancel}
 *   disableNext={hasErrors}
 * />
 * ```
 */

export const WizardNavigation = React.forwardRef<HTMLDivElement, WizardNavigationProps>(
  (
    {
      currentStep,
      totalSteps,
      onBack,
      onNext,
      onCancel,
      disableNext = false,
      nextButtonText = 'Next',
      completeButtonText = 'Complete',
      className,
      ...props
    },
    ref,
  ) => {
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === totalSteps - 1;

    return (
      <nav
        ref={ref}
        aria-label="Wizard navigation"
        className={cn('flex items-center justify-between gap-4', className)}
        {...props}
      >
        {/* Left: Cancel + Back */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel} aria-label="Cancel wizard">
            Cancel
          </Button>

          {!isFirstStep && (
            <Button variant="secondary" onClick={onBack} aria-label="Go to previous step">
              Back
            </Button>
          )}
        </div>

        {/* Right: Next/Complete */}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={disableNext}
          aria-label={isLastStep ? 'Complete wizard' : 'Go to next step'}
        >
          {isLastStep ? completeButtonText : nextButtonText}
        </Button>
      </nav>
    );
  },
);

WizardNavigation.displayName = 'WizardNavigation';

export type { WizardNavigationProps };
