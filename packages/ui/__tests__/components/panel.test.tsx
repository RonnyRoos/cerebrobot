import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Panel } from '../../src/components/panel/Panel';
import { PanelHeader } from '../../src/components/panel/PanelHeader';
import { PanelBackdrop } from '../../src/components/panel/PanelBackdrop';

describe('Panel', () => {
  it('should not render when closed', () => {
    const { container } = render(
      <Panel isOpen={false} onClose={vi.fn()}>
        Content
      </Panel>,
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    const { getByRole } = render(
      <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
        Content
      </Panel>,
    );

    expect(getByRole('dialog')).toBeInTheDocument();
  });

  it('should render title in header', () => {
    const { getByText } = render(
      <Panel isOpen={true} onClose={vi.fn()} title="Test Panel">
        Content
      </Panel>,
    );

    expect(getByText('Test Panel')).toBeInTheDocument();
  });

  it('should call onClose when Escape pressed', () => {
    const onClose = vi.fn();
    render(
      <Panel isOpen={true} onClose={onClose}>
        Content
      </Panel>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Panel isOpen={true} onClose={onClose} showBackdrop={true} closeOnBackdropClick={true}>
        Content
      </Panel>,
    );

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should not call onClose when backdrop clicked if closeOnBackdropClick=false', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Panel isOpen={true} onClose={onClose} showBackdrop={true} closeOnBackdropClick={false}>
        Content
      </Panel>,
    );

    const backdrop = container.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('should render at right position by default', () => {
    const { getByRole } = render(
      <Panel isOpen={true} onClose={vi.fn()}>
        Content
      </Panel>,
    );

    const panel = getByRole('dialog');
    // Mobile: full-screen (inset-0), Tablet+: right slide-in (md:right-0)
    expect(panel).toHaveClass('md:right-0');
  });

  it('should render at left position', () => {
    const { getByRole } = render(
      <Panel isOpen={true} onClose={vi.fn()} position="left">
        Content
      </Panel>,
    );

    const panel = getByRole('dialog');
    // Mobile: full-screen (inset-0), Tablet+: left slide-in (md:left-0)
    expect(panel).toHaveClass('md:left-0');
  });

  it('should apply custom width', () => {
    const { getByRole } = render(
      <Panel isOpen={true} onClose={vi.fn()} width="500px">
        Content
      </Panel>,
    );

    const panel = getByRole('dialog');
    // Mobile: full-screen (w-full), Tablet+: custom maxWidth via inline style
    // Check that maxWidth contains the custom width value
    expect(panel.style.maxWidth).toContain('500px');
  });
});

describe('PanelHeader', () => {
  it('should render title', () => {
    const { getByText } = render(<PanelHeader title="Test Title" onClose={vi.fn()} />);

    expect(getByText('Test Title')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(<PanelHeader title="Test" onClose={onClose} />);

    const closeButton = getByLabelText('Close panel');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should have accessible close button', () => {
    const { getByLabelText } = render(<PanelHeader title="Test" onClose={vi.fn()} />);

    const closeButton = getByLabelText('Close panel');
    expect(closeButton).toHaveAttribute('type', 'button');
    expect(closeButton).toHaveAttribute('tabIndex', '0');
  });
});

describe('PanelBackdrop', () => {
  it('should render when visible', () => {
    const { container } = render(<PanelBackdrop isVisible={true} />);

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass('opacity-100');
  });

  it('should be hidden when not visible', () => {
    const { container } = render(<PanelBackdrop isVisible={false} />);

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toHaveClass('opacity-0');
    expect(backdrop).toHaveClass('pointer-events-none');
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<PanelBackdrop isVisible={true} onClick={onClick} />);

    const backdrop = container.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClick).toHaveBeenCalledTimes(1);
    }
  });
});
