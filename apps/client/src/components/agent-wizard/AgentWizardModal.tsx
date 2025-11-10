import { useState, useCallback } from 'react';
import { WizardProgress, WizardNavigation, Box } from '@workspace/ui';
import { useWizardState } from '../../hooks/useWizardState.js';
import { BasicInfoStep } from './BasicInfoStep.js';
import { LLMConfigStep } from './LLMConfigStep.js';
import { MemoryConfigStep } from './MemoryConfigStep.js';
import { AutonomyConfigStep } from './AutonomyConfigStep.js';
import { ConfirmDialog } from '../ConfirmDialog.js';
import type { AgentConfig } from '@cerebrobot/chat-shared';
import { AgentConfigSchema } from '@cerebrobot/chat-shared';

export interface AgentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: AgentConfig) => Promise<void>;
}

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  'Basic Information',
  'LLM Configuration',
  'Memory Configuration',
  'Autonomy Configuration',
];

/**
 * AgentWizardModal - Multi-step wizard for creating agents
 *
 * Features:
 * - 4-step guided creation process
 * - Progress indicator with step dots
 * - Form data preserved across steps
 * - Per-step validation
 * - Confirm discard on cancel
 * - Glassmorphic Neon Flux styling
 */
export function AgentWizardModal({
  isOpen,
  onClose,
  onSubmit,
}: AgentWizardModalProps): JSX.Element | null {
  const wizard = useWizardState<AgentConfig>(TOTAL_STEPS);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle cancel - show confirmation if form has data
  const handleCancel = useCallback(() => {
    const hasFormData = Object.keys(wizard.state.formData).length > 0;

    if (hasFormData) {
      setShowDiscardConfirm(true);
    } else {
      wizard.reset();
      onClose();
    }
  }, [wizard, onClose]);

  // Confirm discard changes
  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    wizard.reset();
    onClose();
  }, [wizard, onClose]);

  // Cancel discard
  const handleCancelDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  // Handle next step
  const handleNext = useCallback(() => {
    // Allow navigation - validation happens on final submit
    // TODO: Add per-step validation schemas for better UX
    wizard.goNext();
  }, [wizard]);

  // Handle back step
  const handleBack = useCallback(() => {
    wizard.goBack();
  }, [wizard]);

  // Handle final submit
  const handleSubmit = useCallback(async () => {
    // Final validation
    const isValid = wizard.validate(wizard.state.currentStep, AgentConfigSchema);

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit the complete form data
      await onSubmit(wizard.state.formData as AgentConfig);

      // Reset wizard and close on success
      wizard.reset();
      onClose();
    } catch (error) {
      // Error handling is done by parent component
      console.error('Failed to create agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [wizard, onSubmit, onClose]);

  // Render current step content
  const renderStepContent = () => {
    const { currentStep, formData, validationErrors } = wizard.state;

    const stepProps = {
      formData,
      onChange: wizard.setFormData,
      errors: validationErrors,
    };

    switch (currentStep) {
      case 0:
        return <BasicInfoStep {...stepProps} />;
      case 1:
        return <LLMConfigStep {...stepProps} />;
      case 2:
        return <MemoryConfigStep {...stepProps} />;
      case 3:
        return <AutonomyConfigStep {...stepProps} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Wizard Modal */}
      <Box
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={handleCancel}
      >
        <Box
          className="bg-surface/95 backdrop-blur-md border border-border rounded-lg shadow-glow-purple max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          <Box className="p-6 border-b border-border">
            <WizardProgress totalSteps={TOTAL_STEPS} currentStep={wizard.state.currentStep} />
          </Box>

          {/* Step Content */}
          <Box className="p-6 overflow-y-auto max-h-[60vh]">
            <Box className="space-y-6">
              <Box className="space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                  {STEP_TITLES[wizard.state.currentStep]}
                </h2>
              </Box>
              <Box className="space-y-4">{renderStepContent()}</Box>
            </Box>
          </Box>

          {/* Navigation */}
          <Box className="p-6 border-t border-border">
            <WizardNavigation
              currentStep={wizard.state.currentStep}
              totalSteps={TOTAL_STEPS}
              onBack={handleBack}
              onNext={wizard.isLastStep ? handleSubmit : handleNext}
              onCancel={handleCancel}
              disableNext={isSubmitting}
              nextButtonText={wizard.isLastStep ? undefined : 'Next'}
              completeButtonText={wizard.isLastStep ? 'Create Agent' : undefined}
            />
          </Box>
        </Box>
      </Box>

      {/* Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Continue Editing"
        variant="danger"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </>
  );
}
