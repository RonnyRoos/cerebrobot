import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Wizard } from '../../src/components/wizard/Wizard';
import { WizardStep } from '../../src/components/wizard/WizardStep';
import { WizardProgress } from '../../src/components/wizard/WizardProgress';
import { WizardNavigation } from '../../src/components/wizard/WizardNavigation';

describe('Wizard Accessibility', () => {
  it('should have no axe violations on first step', async () => {
    const { container } = render(
      <Wizard
        currentStep={0}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2', 'Step 3']}
      >
        <WizardStep title="Basic Information">
          <p>Step 1 content</p>
        </WizardStep>
        <WizardStep title="Configuration">
          <p>Step 2 content</p>
        </WizardStep>
        <WizardStep title="Review">
          <p>Step 3 content</p>
        </WizardStep>
      </Wizard>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no axe violations on middle step', async () => {
    const { container } = render(
      <Wizard
        currentStep={1}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2', 'Step 3']}
      >
        <WizardStep title="Basic Information">
          <p>Step 1 content</p>
        </WizardStep>
        <WizardStep title="Configuration">
          <p>Step 2 content</p>
        </WizardStep>
        <WizardStep title="Review">
          <p>Step 3 content</p>
        </WizardStep>
      </Wizard>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no axe violations on last step', async () => {
    const { container } = render(
      <Wizard
        currentStep={2}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2', 'Step 3']}
      >
        <WizardStep title="Basic Information">
          <p>Step 1 content</p>
        </WizardStep>
        <WizardStep title="Configuration">
          <p>Step 2 content</p>
        </WizardStep>
        <WizardStep title="Review">
          <p>Step 3 content</p>
        </WizardStep>
      </Wizard>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('WizardProgress Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<WizardProgress currentStep={1} totalSteps={4} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have progressbar role with correct ARIA attributes', () => {
    const { getByRole } = render(<WizardProgress currentStep={2} totalSteps={5} />);

    const progressbar = getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '3');
    expect(progressbar).toHaveAttribute('aria-valuemin', '1');
    expect(progressbar).toHaveAttribute('aria-valuemax', '5');
    expect(progressbar).toHaveAttribute('aria-label', 'Step 3 of 5');
  });

  it('should have accessible labels for each dot', () => {
    const { container } = render(<WizardProgress currentStep={1} totalSteps={3} />);

    const dots = container.querySelectorAll('div[aria-label*="Step"]');
    // First element is the progressbar itself, then 3 dots
    expect(dots.length).toBe(4); // 1 progressbar + 3 dots

    const dotLabels = Array.from(dots)
      .slice(1)
      .map((dot) => dot.getAttribute('aria-label'));
    expect(dotLabels).toContain('Step 1 completed');
    expect(dotLabels).toContain('Step 2 current');
    expect(dotLabels).toContain('Step 3');
  });
});

describe('WizardNavigation Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(
      <WizardNavigation
        currentStep={0}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible button labels', () => {
    const { getByText } = render(
      <WizardNavigation
        currentStep={1}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const cancelButton = getByText('Cancel');
    const backButton = getByText('Back');
    const nextButton = getByText('Next');

    expect(cancelButton.tagName).toBe('BUTTON');
    expect(backButton.tagName).toBe('BUTTON');
    expect(nextButton.tagName).toBe('BUTTON');
  });

  it('should indicate disabled state properly', () => {
    const { getByText } = render(
      <WizardNavigation
        currentStep={0}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
        disableNext={true}
      />,
    );

    const nextButton = getByText('Next') as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
    expect(nextButton).toHaveAttribute('disabled');
  });
});

describe('WizardStep Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(
      <WizardStep title="Test Title" description="Test description">
        <p>Content</p>
      </WizardStep>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should use heading for title with proper level', () => {
    const { getByRole } = render(<WizardStep title="Test Title">Content</WizardStep>);

    const heading = getByRole('heading', { level: 2 });
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('Test Title');
  });
});
