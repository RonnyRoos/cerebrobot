import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AgentWizardModal } from '../AgentWizardModal.js';

describe('AgentWizardModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AgentWizardModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Basic Information')).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<AgentWizardModal {...defaultProps} />);

      expect(screen.getAllByText('Basic Information').length).toBeGreaterThan(0);
    });

    it('should render navigation buttons', () => {
      render(<AgentWizardModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /next/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
    });

    it('should not render back button on first step', () => {
      render(<AgentWizardModal {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /back/i })).toBeNull();
    });
  });

  describe('cancel behavior', () => {
    it('should close modal when cancel is clicked with no form data', async () => {
      const user = userEvent.setup();
      render(<AgentWizardModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('form fields', () => {
    it('should render name field', () => {
      render(<AgentWizardModal {...defaultProps} />);

      expect(screen.getByLabelText('Name')).toBeTruthy();
    });

    it('should render system prompt field', () => {
      render(<AgentWizardModal {...defaultProps} />);

      expect(screen.getByLabelText('System Prompt')).toBeTruthy();
    });

    it('should render persona tag field', () => {
      render(<AgentWizardModal {...defaultProps} />);

      expect(screen.getByLabelText('Persona Tag')).toBeTruthy();
    });
  });

  describe('glassmorphic styling', () => {
    it('should apply Neon Flux design system classes', () => {
      const { container } = render(<AgentWizardModal {...defaultProps} />);

      const backdrop = container.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeTruthy();

      const surface = container.querySelector('.bg-surface\\/95');
      expect(surface).toBeTruthy();
    });
  });
});
