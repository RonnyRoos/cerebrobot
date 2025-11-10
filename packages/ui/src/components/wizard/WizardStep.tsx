import React from 'react';
import { cn } from '../../utils/cn';
import type { WizardStepProps } from './types';

/**
 * Wizard Step Component
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

export const WizardStep = React.forwardRef<HTMLDivElement, WizardStepProps>(
  ({ title, description, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-6', className)} {...props}>
        {/* Step Header */}
        <div className="space-y-2">
          <h2
            className={cn(
              'text-3xl font-bold',
              'bg-gradient-to-r from-accent-primary to-accent-secondary',
              'bg-clip-text text-transparent',
            )}
          >
            {title}
          </h2>
          {description && <p className="text-base text-foreground/60">{description}</p>}
        </div>

        {/* Step Content */}
        <div className="space-y-4">{children}</div>
      </div>
    );
  },
);

WizardStep.displayName = 'WizardStep';

export type { WizardStepProps };
