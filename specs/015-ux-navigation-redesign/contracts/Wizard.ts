/**
 * TypeScript Contracts for Wizard Component Family
 * 
 * Location: packages/ui/src/components/wizard/
 * Purpose: Multi-step form wizard (4 steps for agent creation)
 * 
 * Components:
 * - Wizard: Container with step management
 * - WizardStep: Individual step wrapper
 * - WizardProgress: Progress indicator (dots)
 * - WizardNavigation: Back/Next/Complete buttons
 */

import { ReactNode } from 'react';

// ============================================================================
// Wizard Container Component
// ============================================================================

/**
 * Wizard component props
 * 
 * Multi-step form with progress indicator and navigation.
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
 *   <WizardStep title="Memory Settings">
 *     <MemoryConfigForm />
 *   </WizardStep>
 *   <WizardStep title="Autonomy Mode">
 *     <AutonomyConfigForm />
 *   </WizardStep>
 * </Wizard>
 * ```
 */
export interface WizardProps {
  /** 
   * Current step index (0-based).
   * Controlled by parent component.
   */
  currentStep: number;

  /** 
   * Callback when step changes.
   * Called by "Back"/"Next" buttons.
   */
  onStepChange: (step: number) => void;

  /** 
   * Callback when wizard completes.
   * Called by "Complete" button on last step.
   */
  onComplete: () => void;

  /** 
   * Callback when wizard cancelled.
   * Called by "Cancel" button or Esc key.
   */
  onCancel: () => void;

  /** 
   * Step labels (for progress indicator).
   * Length determines total step count.
   */
  steps: string[];

  /** 
   * Children (WizardStep components).
   * One child per step.
   */
  children: ReactNode;

  /** 
   * Disable "Next" button (for validation).
   * @default false
   */
  disableNext?: boolean;

  /** 
   * Custom "Next" button text.
   * @default 'Next'
   */
  nextButtonText?: string;

  /** 
   * Custom "Complete" button text (last step).
   * @default 'Complete'
   */
  completeButtonText?: string;

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// Wizard Step Component
// ============================================================================

/**
 * Wizard step props
 * 
 * Individual step wrapper with title and description.
 * 
 * @example
 * ```tsx
 * <WizardStep 
 *   title="Basic Information" 
 *   description="Configure your agent's name and description"
 * >
 *   <Input label="Name" />
 *   <Textarea label="Description" />
 * </WizardStep>
 * ```
 */
export interface WizardStepProps {
  /** 
   * Step title (large gradient text).
   * Displayed at top of step content.
   */
  title: string;

  /** 
   * Step description (optional, smaller text).
   * Displayed below title.
   */
  description?: string;

  /** 
   * Children (form fields).
   * Rendered inside step container.
   */
  children: ReactNode;

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// Wizard Progress Component
// ============================================================================

/**
 * Wizard progress indicator props
 * 
 * Dots-based progress indicator.
 * Automatically rendered by Wizard component.
 * 
 * @example
 * ```tsx
 * <WizardProgress 
 *   currentStep={1} 
 *   totalSteps={4}
 * />
 * ```
 */
export interface WizardProgressProps {
  /** 
   * Current active step (0-based).
   */
  currentStep: number;

  /** 
   * Total number of steps.
   */
  totalSteps: number;

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// Wizard Navigation Component
// ============================================================================

/**
 * Wizard navigation buttons props
 * 
 * Back/Next/Complete buttons with loading states.
 * Automatically rendered by Wizard component.
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
export interface WizardNavigationProps {
  /** 
   * Current step (0-based).
   */
  currentStep: number;

  /** 
   * Total number of steps.
   */
  totalSteps: number;

  /** 
   * "Back" button click handler.
   * Disabled on first step.
   */
  onBack: () => void;

  /** 
   * "Next" button click handler.
   * Changes to "Complete" on last step.
   */
  onNext: () => void;

  /** 
   * "Cancel" button click handler.
   */
  onCancel: () => void;

  /** 
   * Disable "Next"/"Complete" button.
   * @default false
   */
  disableNext?: boolean;

  /** 
   * Custom "Next" button text.
   * @default 'Next'
   */
  nextButtonText?: string;

  /** 
   * Custom "Complete" button text.
   * @default 'Complete'
   */
  completeButtonText?: string;

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// State Management Contracts
// ============================================================================

/**
 * Wizard state (managed by useWizardState hook)
 * 
 * Used in apps/client/src/hooks/useWizardState.ts
 */
export interface WizardState<T = Record<string, unknown>> {
  /** Current step index (0-based) */
  currentStep: number;

  /** Which steps have been completed */
  completedSteps: boolean[];

  /** Accumulated form data from all steps */
  formData: Partial<T>;

  /** Field-level validation errors */
  validationErrors: Record<string, string>;
}

/**
 * Wizard hook return value
 * 
 * Used by AgentWizard component in apps/client/
 */
export interface UseWizardStateReturn<T = Record<string, unknown>> {
  /** Current step index */
  currentStep: number;

  /** Completed steps array */
  completedSteps: boolean[];

  /** Form data accumulated from all steps */
  formData: Partial<T>;

  /** Validation errors map */
  validationErrors: Record<string, string>;

  /** Advance to next step */
  nextStep: () => void;

  /** Return to previous step */
  previousStep: () => void;

  /** Update form data for current step */
  updateFormData: (stepData: Partial<T>) => void;

  /** Complete wizard (submit data) */
  completeWizard: () => Promise<void>;

  /** Cancel wizard (discard data, show confirmation if dirty) */
  cancelWizard: () => void;

  /** Whether "Next" button should be enabled */
  canGoNext: boolean;
}

// ============================================================================
// Design Token Contracts
// ============================================================================

/**
 * Wizard design tokens
 * 
 * Used in packages/ui/tailwind.config.ts
 */
export interface WizardTokens {
  /** Progress dot size */
  dotSize: string; // '12px'

  /** Gap between dots */
  dotGap: string; // '8px'

  /** Inactive dot color */
  dotInactiveColor: string; // 'hsl(var(--surface))'

  /** Inactive dot border */
  dotInactiveBorder: string; // 'hsl(var(--border))'

  /** Active dot color */
  dotActiveColor: string; // 'hsl(var(--accent-primary))'

  /** Active dot shadow (purple glow) */
  dotActiveShadow: string; // 'var(--shadow-glow-purple)'

  /** Active dot scale */
  dotActiveScale: string; // '1.25'

  /** Completed dot color */
  dotCompletedColor: string; // 'hsl(var(--accent-primary) / 0.5)'

  /** Dot transition duration */
  dotTransitionDuration: string; // '200ms'

  /** Dot transition easing */
  dotTransitionEasing: string; // 'cubic-bezier(0.4, 0, 0.2, 1)'

  /** Maximum wizard width */
  maxWidth: string; // '768px'
}
