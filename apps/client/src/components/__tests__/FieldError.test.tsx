/**
 * FieldError Component Tests
 *
 * TDD: Written FIRST before implementation
 * Tests deterministic UI rendering of inline field validation errors
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldError } from '../FieldError.js';

describe('FieldError', () => {
  describe('Empty State', () => {
    it('should not render when no error is provided', () => {
      const { container } = render(<FieldError error={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when error is null', () => {
      const { container } = render(<FieldError error={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when error is empty string', () => {
      const { container } = render(<FieldError error="" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error Display', () => {
    it('should render error message text', () => {
      render(<FieldError error="This field is required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should render with Tailwind error styling classes', () => {
      const { container } = render(<FieldError error="Invalid input" />);

      // Check for text-error class on error message
      const errorElement = container.querySelector('.text-error');
      expect(errorElement).toBeInTheDocument();
    });

    it('should display error icon (⚠)', () => {
      render(<FieldError error="Validation failed" />);

      // Check for warning triangle icon
      expect(screen.getByText('⚠')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for error messages', () => {
      render(<FieldError error="Field is invalid" />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should have aria-live="polite" for dynamic updates', () => {
      const { container } = render(<FieldError error="Error message" />);

      const errorElement = container.querySelector('[aria-live="polite"]');
      expect(errorElement).toBeInTheDocument();
    });

    it('should link to field via aria-describedby when fieldId provided', () => {
      const { container } = render(<FieldError error="Invalid value" fieldId="agent-name" />);

      const errorElement = container.querySelector('#agent-name-error');
      expect(errorElement).toBeInTheDocument();
    });
  });

  describe('Field Association', () => {
    it('should generate id from fieldId for aria-describedby', () => {
      const { container } = render(<FieldError error="Validation error" fieldId="temperature" />);

      expect(container.querySelector('#temperature-error')).toBeInTheDocument();
    });

    it('should work without fieldId', () => {
      const { container } = render(<FieldError error="Generic error" />);

      // Should render but without specific id
      expect(screen.getByText('Generic error')).toBeInTheDocument();
      expect(container.querySelector('[id]')).not.toBeInTheDocument();
    });
  });
});
