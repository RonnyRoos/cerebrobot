import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe } from 'jest-axe';
import { Textarea } from '../../src/components/textarea';

describe('Textarea Accessibility', () => {
  it('should have no accessibility violations in default state', async () => {
    const { container } = render(<Textarea placeholder="Test textarea" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations in error state with proper ARIA', async () => {
    const { container } = render(
      <div>
        <label htmlFor="error-textarea">Description</label>
        <Textarea
          id="error-textarea"
          variant="error"
          aria-invalid="true"
          aria-describedby="error-message"
        />
        <span id="error-message">Description is required</span>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with required field', async () => {
    const { container } = render(
      <div>
        <label htmlFor="required-textarea">Message</label>
        <Textarea
          id="required-textarea"
          required
          aria-required="true"
        />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations in disabled state', async () => {
    const { container } = render(
      <div>
        <label htmlFor="disabled-textarea">Notes</label>
        <Textarea id="disabled-textarea" disabled />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
