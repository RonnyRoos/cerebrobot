import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../src/components/primitives/badge';

describe('Badge', () => {
  describe('Count Display', () => {
    it('should render count when provided', () => {
      render(<Badge count={5} />);
      const badge = screen.getByText('5');
      expect(badge).toBeDefined();
    });

    it('should render large count numbers', () => {
      render(<Badge count={99} />);
      const badge = screen.getByText('99');
      expect(badge).toBeDefined();
    });

    it('should not render count when dot is true', () => {
      const { container } = render(<Badge count={5} dot />);
      expect(container.textContent).toBe('');
    });
  });

  describe('Dot Mode', () => {
    it('should render as dot when dot prop is true', () => {
      const { container } = render(<Badge dot />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('w-2');
      expect(badge.className).toContain('h-2');
    });

    it('should not render count in dot mode', () => {
      const { container } = render(<Badge dot count={5} />);
      expect(container.textContent).toBe('');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      const { container } = render(<Badge count={1} variant="default" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-muted');
      expect(badge.className).toContain('text-muted-foreground');
    });

    it('should apply purple variant styles', () => {
      const { container } = render(<Badge count={1} variant="purple" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('text-accent-primary');
    });

    it('should apply pink variant styles', () => {
      const { container } = render(<Badge count={1} variant="pink" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('text-pink-400');
    });

    it('should apply blue variant styles', () => {
      const { container } = render(<Badge count={1} variant="blue" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('text-blue-400');
    });
  });

  describe('Sizes', () => {
    it('should apply small size by default', () => {
      const { container } = render(<Badge count={1} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('min-w-[18px]');
      expect(badge.className).toContain('h-[18px]');
    });

    it('should apply small size when specified', () => {
      const { container } = render(<Badge count={1} size="sm" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('min-w-[18px]');
      expect(badge.className).toContain('h-[18px]');
    });

    it('should apply medium size when specified', () => {
      const { container } = render(<Badge count={1} size="md" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('min-w-[24px]');
      expect(badge.className).toContain('h-[24px]');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Badge count={1} className="custom-class" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('custom-class');
    });

    it('should merge custom className with default styles', () => {
      const { container } = render(<Badge count={1} className="custom-class" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('custom-class');
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('rounded-full');
    });
  });

  describe('Rendering', () => {
    it('should render as span element', () => {
      const { container } = render(<Badge count={1} />);
      expect(container.firstChild?.nodeName).toBe('SPAN');
    });

    it('should forward ref to span element', () => {
      const ref = { current: null };
      render(<Badge count={1} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });

    it('should apply base styles', () => {
      const { container } = render(<Badge count={1} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
      expect(badge.className).toContain('justify-center');
      expect(badge.className).toContain('rounded-full');
    });
  });
});
