import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../src/components/select';

expect.extend(toHaveNoViolations);

describe('Select Accessibility', () => {
  it('should not have accessibility violations in default state', async () => {
    const { container } = render(
      <div>
        <label htmlFor="select-default">Choose an option</label>
        <Select>
          <SelectTrigger id="select-default">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have accessibility violations with error variant', async () => {
    const { container } = render(
      <div>
        <label htmlFor="select-error">Choose option</label>
        <Select>
          <SelectTrigger id="select-error" variant="error" aria-invalid="true" aria-describedby="error-msg">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
        <p id="error-msg">This field has an error</p>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have accessibility violations when disabled', async () => {
    const { container } = render(
      <div>
        <label htmlFor="select-disabled">Choose option</label>
        <Select disabled>
          <SelectTrigger id="select-disabled">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have accessibility violations with required field', async () => {
    const { container } = render(
      <div>
        <label htmlFor="select-required">Choose option *</label>
        <Select required>
          <SelectTrigger id="select-required" aria-required="true">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
