import React, { Children, isValidElement } from 'react';
import { cn } from '../../utils/cn';
import type { WizardProps } from './types';
import { WizardProgress } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';

/**
 * Wizard Component
 *
 * Multi-step form wizard with progress indicator and navigation.
 * Used for agent creation flow (4 steps: Basic Info, LLM, Memory, Autonomy).
 *
 * @example
 * ```tsx
 * <Wizard
 *   currentStep={currentStep}
 *   onStepChange={setCurrentStep}
 *   onComplete={handleCreateAgent}
 *   onCancel={handleCancel}
 *   steps={['Basic Info', 'LLM', 'Memory', 'Autonomy']}
 *   disableNext={hasValidationErrors}
 * >
 *   <WizardStep title="Basic Information">
 *     <BasicInfoForm />
 *   </WizardStep>
 *   <WizardStep title="LLM Configuration">
 *     <LLMConfigForm />
 *   </WizardStep>
 * </Wizard>
 * ```
 */

export const Wizard = React.forwardRef<HTMLDivElement, WizardProps>(
  (
    {
      currentStep,
      onStepChange,
      onComplete,
      onCancel,
      steps,
      children,
      disableNext = false,
      nextButtonText = 'Next',
      completeButtonText = 'Complete',
      className,
      ...props
    },
    ref,
  ) => {
    // Convert children to array for indexing
    const childArray = Children.toArray(children);
    const totalSteps = steps.length;
    const isLastStep = currentStep === totalSteps - 1;

    // Get current step content
    const currentStepContent = childArray[currentStep];

    const handleBack = () => {
      if (currentStep > 0) {
        onStepChange(currentStep - 1);
      }
    };

    const handleNext = () => {
      if (isLastStep) {
        onComplete();
      } else if (currentStep < totalSteps - 1) {
        onStepChange(currentStep + 1);
      }
    };

    return (
      <div
        ref={ref}
        className={cn('w-full max-w-3xl mx-auto', 'flex flex-col gap-8', 'px-4 py-8', className)}
        {...props}
      >
        {/* Progress Indicator */}
        <WizardProgress currentStep={currentStep} totalSteps={totalSteps} />

        {/* Step Content */}
        <div className="flex-1">
          {isValidElement(currentStepContent) ? currentStepContent : null}
        </div>

        {/* Navigation Buttons */}
        <WizardNavigation
          currentStep={currentStep}
          totalSteps={totalSteps}
          onBack={handleBack}
          onNext={handleNext}
          onCancel={onCancel}
          disableNext={disableNext}
          nextButtonText={nextButtonText}
          completeButtonText={completeButtonText}
        />
      </div>
    );
  },
);

Wizard.displayName = 'Wizard';

export type { WizardProps };
