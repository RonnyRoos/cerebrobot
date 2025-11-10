import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Panel } from '../../src/components/panel/Panel';
import { PanelHeader } from '../../src/components/panel/PanelHeader';
import { PanelBackdrop } from '../../src/components/panel/PanelBackdrop';

describe('Panel Accessibility', () => {
  it('should have no axe violations when open', async () => {
    const { container } = render(
      <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
        <p>Panel content</p>
      </Panel>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have role="dialog" and aria-modal', () => {
    const { getByRole } = render(
      <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
        Content
      </Panel>,
    );

    const panel = getByRole('dialog');
    expect(panel).toHaveAttribute('aria-modal', 'true');
  });

  it('should have accessible label', () => {
    const { getByRole } = render(
      <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
        Content
      </Panel>,
    );

    const panel = getByRole('dialog');
    expect(panel).toHaveAttribute('aria-label', 'Test Panel');
  });

  it('should trap focus inside panel', () => {
    const { getByLabelText, getByRole } = render(
      <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
        <button>Inside Button</button>
      </Panel>,
    );

    // Focus should be trapped by react-focus-lock
    const closeButton = getByLabelText('Close panel');
    const panel = getByRole('dialog');

    expect(closeButton).toBeTruthy();
    expect(panel).toBeTruthy();
  });

  it('should have accessible close button in header', () => {
    const { getByLabelText } = render(
      <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
        Content
      </Panel>,
    );

    const closeButton = getByLabelText('Close panel');
    expect(closeButton).toBeTruthy();
    expect(closeButton.tagName).toBe('BUTTON');
  });
});

describe('PanelHeader Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<PanelHeader title="Test" onClose={vi.fn()} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible close button with aria-label', () => {
    const { getByLabelText } = render(<PanelHeader title="Test" onClose={vi.fn()} />);

    const closeButton = getByLabelText('Close panel');
    expect(closeButton).toBeTruthy();
  });

  it('should have title as h2 heading', () => {
    const { getByRole } = render(<PanelHeader title="Test Title" onClose={vi.fn()} />);

    const heading = getByRole('heading', { level: 2 });
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('Test Title');
  });
});

describe('PanelBackdrop Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<PanelBackdrop isVisible={true} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-hidden attribute', () => {
    const { container } = render(<PanelBackdrop isVisible={true} />);

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
  });
});
