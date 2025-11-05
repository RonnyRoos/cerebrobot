import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe } from 'jest-axe';
import { Input } from '../../src/components/input';

describe('Input Accessibility', () => {
  it('should have no accessibility violations in default state', async () => {
    const { container } = render(<Input placeholder="Test input" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations in error state with proper ARIA', async () => {
    const { container } = render(
      <div>
        <label htmlFor="error-input">Name</label>
        <Input
          id="error-input"
          variant="error"
          aria-invalid="true"
          aria-describedby="error-message"
        />
        <span id="error-message">This field is required</span>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations with required field', async () => {
    const { container } = render(
      <div>
        <label htmlFor="required-input">Email</label>
        <Input
          id="required-input"
          type="email"
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
        <label htmlFor="disabled-input">Username</label>
        <Input id="disabled-input" disabled />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
