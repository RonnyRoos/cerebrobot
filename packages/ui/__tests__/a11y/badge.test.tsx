import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Badge } from '../../src/components/primitives/badge';

describe('Badge Accessibility', () => {
  it('should have no accessibility violations for count badge', async () => {
    const { container } = render(<Badge count={5} variant="purple" />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for dot badge', async () => {
    const { container } = render(<Badge dot variant="purple" />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for all variants', async () => {
    const { container } = render(
      <div>
        <Badge count={1} variant="default" />
        <Badge count={2} variant="purple" />
        <Badge count={3} variant="pink" />
        <Badge count={4} variant="blue" />
        <Badge dot variant="purple" />
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for different sizes', async () => {
    const { container } = render(
      <div>
        <Badge count={1} size="sm" />
        <Badge count={2} size="md" />
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should render semantic HTML (span element)', () => {
    const { container } = render(<Badge count={5} />);
    const badge = container.firstChild as HTMLElement;
    
    expect(badge.nodeName).toBe('SPAN');
  });
});
