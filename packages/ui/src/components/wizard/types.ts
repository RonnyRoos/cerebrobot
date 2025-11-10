/**
 * TypeScript types for Wizard component family
 */

import { ReactNode } from 'react';

export interface WizardProps {
  /** Current step index (0-based) */
  currentStep: number;

  /** Callback when step changes */
  onStepChange: (step: number) => void;

  /** Callback when wizard completes */
  onComplete: () => void;

  /** Callback when wizard cancelled */
  onCancel: () => void;

  /** Step labels (for progress indicator) */
  steps: string[];

  /** Children (WizardStep components) */
  children: ReactNode;

  /** Disable "Next" button (for validation) */
  disableNext?: boolean;

  /** Custom "Next" button text */
  nextButtonText?: string;

  /** Custom "Complete" button text (last step) */
  completeButtonText?: string;

  /** Additional CSS classes */
  className?: string;
}

export interface WizardStepProps {
  /** Step title */
  title: string;

  /** Step description (optional) */
  description?: string;

  /** Children (form fields) */
  children: ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export interface WizardProgressProps {
  /** Current active step (0-based) */
  currentStep: number;

  /** Total number of steps */
  totalSteps: number;

  /** Additional CSS classes */
  className?: string;
}

export interface WizardNavigationProps {
  /** Current step (0-based) */
  currentStep: number;

  /** Total number of steps */
  totalSteps: number;

  /** "Back" button click handler */
  onBack: () => void;

  /** "Next" button click handler */
  onNext: () => void;

  /** "Cancel" button click handler */
  onCancel: () => void;

  /** Disable "Next"/"Complete" button */
  disableNext?: boolean;

  /** Custom "Next" button text */
  nextButtonText?: string;

  /** Custom "Complete" button text */
  completeButtonText?: string;

  /** Additional CSS classes */
  className?: string;
}
