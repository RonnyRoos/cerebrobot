import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Wizard } from '../../src/components/wizard/Wizard';
import { WizardStep } from '../../src/components/wizard/WizardStep';
import { WizardProgress } from '../../src/components/wizard/WizardProgress';
import { WizardNavigation } from '../../src/components/wizard/WizardNavigation';

describe('Wizard', () => {
  it('should render current step based on currentStep prop', () => {
    const { getByText, queryByText } = render(
      <Wizard
        currentStep={0}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2']}
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
        <WizardStep title="Step 2">Content 2</WizardStep>
      </Wizard>,
    );

    expect(getByText('Step 1')).toBeInTheDocument();
    expect(getByText('Content 1')).toBeInTheDocument();
    expect(queryByText('Step 2')).not.toBeInTheDocument();
    expect(queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('should render second step when currentStep=1', () => {
    const { getByText, queryByText } = render(
      <Wizard
        currentStep={1}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2']}
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
        <WizardStep title="Step 2">Content 2</WizardStep>
      </Wizard>,
    );

    expect(queryByText('Step 1')).not.toBeInTheDocument();
    expect(queryByText('Content 1')).not.toBeInTheDocument();
    expect(getByText('Step 2')).toBeInTheDocument();
    expect(getByText('Content 2')).toBeInTheDocument();
  });

  it('should call onStepChange with incremented step when Next clicked', () => {
    const onStepChange = vi.fn();
    const { getByText } = render(
      <Wizard
        currentStep={0}
        onStepChange={onStepChange}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2']}
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
        <WizardStep title="Step 2">Content 2</WizardStep>
      </Wizard>,
    );

    const nextButton = getByText('Next');
    fireEvent.click(nextButton);

    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('should call onStepChange with decremented step when Back clicked', () => {
    const onStepChange = vi.fn();
    const { getByText } = render(
      <Wizard
        currentStep={1}
        onStepChange={onStepChange}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2']}
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
        <WizardStep title="Step 2">Content 2</WizardStep>
      </Wizard>,
    );

    const backButton = getByText('Back');
    fireEvent.click(backButton);

    expect(onStepChange).toHaveBeenCalledWith(0);
  });

  it('should call onComplete when Complete clicked on last step', () => {
    const onComplete = vi.fn();
    const { getByText } = render(
      <Wizard
        currentStep={1}
        onStepChange={vi.fn()}
        onComplete={onComplete}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2']}
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
        <WizardStep title="Step 2">Content 2</WizardStep>
      </Wizard>,
    );

    const completeButton = getByText('Complete');
    fireEvent.click(completeButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel clicked', () => {
    const onCancel = vi.fn();
    const { getByText } = render(
      <Wizard
        currentStep={0}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={onCancel}
        steps={['Step 1']}
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
      </Wizard>,
    );

    const cancelButton = getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should use custom nextButtonText when provided', () => {
    const { getByText } = render(
      <Wizard
        currentStep={0}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2']}
        nextButtonText="Continue"
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
        <WizardStep title="Step 2">Content 2</WizardStep>
      </Wizard>,
    );

    expect(getByText('Continue')).toBeInTheDocument();
  });

  it('should use custom completeButtonText when provided', () => {
    const { getByText } = render(
      <Wizard
        currentStep={1}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2']}
        completeButtonText="Finish"
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
        <WizardStep title="Step 2">Content 2</WizardStep>
      </Wizard>,
    );

    expect(getByText('Finish')).toBeInTheDocument();
  });

  it('should disable Next button when disableNext=true', () => {
    const { getByText } = render(
      <Wizard
        currentStep={0}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        steps={['Step 1', 'Step 2']}
        disableNext={true}
      >
        <WizardStep title="Step 1">Content 1</WizardStep>
        <WizardStep title="Step 2">Content 2</WizardStep>
      </Wizard>,
    );

    const nextButton = getByText('Next') as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });
});

describe('WizardStep', () => {
  it('should render title with gradient', () => {
    const { getByText } = render(<WizardStep title="Test Title">Content</WizardStep>);

    const title = getByText('Test Title');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H2');
  });

  it('should render description when provided', () => {
    const { getByText } = render(
      <WizardStep title="Test Title" description="Test Description">
        Content
      </WizardStep>,
    );

    expect(getByText('Test Description')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const { container } = render(<WizardStep title="Test Title">Content</WizardStep>);

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('should render children', () => {
    const { getByText } = render(
      <WizardStep title="Test Title">
        <div>Child Content</div>
      </WizardStep>,
    );

    expect(getByText('Child Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <WizardStep title="Test Title" className="custom-class">
        Content
      </WizardStep>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });
});

describe('WizardProgress', () => {
  it('should render correct number of dots', () => {
    const { container } = render(<WizardProgress currentStep={0} totalSteps={3} />);

    const dots = container.querySelectorAll('[aria-label*="Step"]');
    // First is the main progressbar, rest are the dots
    expect(dots.length).toBe(4); // 1 progressbar + 3 dots
  });

  it('should have progressbar role', () => {
    const { getByRole } = render(<WizardProgress currentStep={0} totalSteps={3} />);

    const progressbar = getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
  });

  it('should set aria-valuenow to current step + 1', () => {
    const { getByRole } = render(<WizardProgress currentStep={2} totalSteps={5} />);

    const progressbar = getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('3');
  });

  it('should set aria-valuemin to 1', () => {
    const { getByRole } = render(<WizardProgress currentStep={0} totalSteps={3} />);

    const progressbar = getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuemin')).toBe('1');
  });

  it('should set aria-valuemax to total steps', () => {
    const { getByRole } = render(<WizardProgress currentStep={0} totalSteps={4} />);

    const progressbar = getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('4');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <WizardProgress currentStep={0} totalSteps={3} className="custom-class" />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });
});

describe('WizardNavigation', () => {
  it('should always render Cancel button', () => {
    const { getByText } = render(
      <WizardNavigation
        currentStep={0}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(getByText('Cancel')).toBeInTheDocument();
  });

  it('should hide Back button on first step', () => {
    const { queryByText } = render(
      <WizardNavigation
        currentStep={0}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(queryByText('Back')).not.toBeInTheDocument();
  });

  it('should show Back button on second step', () => {
    const { getByText } = render(
      <WizardNavigation
        currentStep={1}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(getByText('Back')).toBeInTheDocument();
  });

  it('should render Next button on non-last steps', () => {
    const { getByText } = render(
      <WizardNavigation
        currentStep={0}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(getByText('Next')).toBeInTheDocument();
  });

  it('should render Complete button on last step', () => {
    const { getByText } = render(
      <WizardNavigation
        currentStep={2}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(getByText('Complete')).toBeInTheDocument();
  });

  it('should call onBack when Back clicked', () => {
    const onBack = vi.fn();
    const { getByText } = render(
      <WizardNavigation
        currentStep={1}
        totalSteps={3}
        onBack={onBack}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(getByText('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should call onNext when Next clicked', () => {
    const onNext = vi.fn();
    const { getByText } = render(
      <WizardNavigation
        currentStep={0}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={onNext}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(getByText('Next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel clicked', () => {
    const onCancel = vi.fn();
    const { getByText } = render(
      <WizardNavigation
        currentStep={0}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should disable Next button when disableNext=true', () => {
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
  });

  it('should use custom nextButtonText when provided', () => {
    const { getByText } = render(
      <WizardNavigation
        currentStep={0}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
        nextButtonText="Continue"
      />,
    );

    expect(getByText('Continue')).toBeInTheDocument();
  });

  it('should use custom completeButtonText when provided', () => {
    const { getByText } = render(
      <WizardNavigation
        currentStep={2}
        totalSteps={3}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
        completeButtonText="Finish"
      />,
    );

    expect(getByText('Finish')).toBeInTheDocument();
  });
});
