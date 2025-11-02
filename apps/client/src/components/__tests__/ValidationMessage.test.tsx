/**
 * ValidationMessage Component Tests
 *
 * TDD: Written FIRST before implementation
 * Tests deterministic UI rendering of validation error messages
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationMessage } from '../ValidationMessage.js';

describe('ValidationMessage', () => {
  describe('Empty State', () => {
    it('should not render when no errors are provided', () => {
      const { container } = render(<ValidationMessage errors={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when undefined errors are provided', () => {
      const { container } = render(<ValidationMessage errors={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error Display', () => {
    it('should render a single error message', () => {
      const errors = ['Name is required'];

      render(<ValidationMessage errors={errors} />);

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('should render multiple error messages', () => {
      const errors = [
        'Name is required',
        'Temperature must be between 0 and 2',
        'API key is required',
      ];

      render(<ValidationMessage errors={errors} />);

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Temperature must be between 0 and 2')).toBeInTheDocument();
      expect(screen.getByText('API key is required')).toBeInTheDocument();
    });

    it('should use list markup for multiple errors', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3'];

      render(<ValidationMessage errors={errors} />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for error messages', () => {
      const errors = ['Validation failed'];

      render(<ValidationMessage errors={errors} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should have aria-live="polite" for error updates', () => {
      const errors = ['Field is invalid'];

      const { container } = render(<ValidationMessage errors={errors} />);

      const alertElement = container.querySelector('[aria-live="polite"]');
      expect(alertElement).toBeInTheDocument();
    });
  });

  describe('Severity Levels', () => {
    it('should render error severity by default', () => {
      const errors = ['This is an error'];

      const { container } = render(<ValidationMessage errors={errors} />);

      const errorElement = container.querySelector('[data-severity="error"]');
      expect(errorElement).toBeInTheDocument();
    });

    it('should render warning severity when specified', () => {
      const errors = ['This is a warning'];

      const { container } = render(<ValidationMessage errors={errors} severity="warning" />);

      const warningElement = container.querySelector('[data-severity="warning"]');
      expect(warningElement).toBeInTheDocument();
    });

    it('should apply different styling for warning severity', () => {
      const errors = ['Warning message'];

      const { container } = render(<ValidationMessage errors={errors} severity="warning" />);

      const warningElement = container.querySelector('[data-severity="warning"]');
      expect(warningElement).toHaveClass('validation-warning');
    });
  });
});
