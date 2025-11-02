/**
 * T043: Accessibility tests for Button component
 * 
 * Tests:
 * - axe-core automated accessibility checks
 * - Keyboard navigation (Tab, Enter, Space)
 * - ARIA attributes
 * - Focus management
 * - Screen reader announcements
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/components/primitives/Button';

describe('Button Accessibility', () => {
  describe('Axe-core Automated Checks', () => {
    it('should have no accessibility violations (primary variant)', async () => {
      const { container } = render(<Button>Primary Button</Button>);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations (secondary variant)', async () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations (disabled state)', async () => {
      const { container } = render(<Button disabled>Disabled Button</Button>);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations (loading state)', async () => {
      const { container } = render(<Button loading loadingText="Loading...">Submit</Button>);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations (with icons)', async () => {
      const Icon = () => <svg aria-hidden="true"><path d="M0 0h24v24H0z" /></svg>;
      const { container } = render(
        <Button iconLeft={<Icon />}>
          Button with Icon
        </Button>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations (icon-only with aria-label)', async () => {
      const Icon = () => <svg aria-hidden="true"><path d="M0 0h24v24H0z" /></svg>;
      const { container } = render(
        <Button iconLeft={<Icon />} aria-label="Close dialog" />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation - Tab', () => {
    it('should be focusable via Tab key', async () => {
      const user = userEvent.setup();
      render(<Button>Focusable Button</Button>);
      
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Button disabled>Disabled Button</Button>
          <Button>Next Button</Button>
        </>
      );
      
      const disabledButton = screen.getByText('Disabled Button');
      const nextButton = screen.getByText('Next Button');
      
      await user.tab();
      expect(disabledButton).not.toHaveFocus();
      expect(nextButton).toHaveFocus();
    });

    it('should not be focusable when loading', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Button loading>Loading Button</Button>
          <Button>Next Button</Button>
        </>
      );
      
      const loadingButton = screen.getByRole('button', { name: /Loading/ });
      const nextButton = screen.getByText('Next Button');
      
      await user.tab();
      expect(loadingButton).not.toHaveFocus();
      expect(nextButton).toHaveFocus();
    });

    it('should support Shift+Tab for reverse navigation', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Button>First Button</Button>
          <Button>Second Button</Button>
        </>
      );
      
      const firstButton = screen.getByText('First Button');
      const secondButton = screen.getByText('Second Button');
      
      await user.tab();
      expect(firstButton).toHaveFocus();
      
      await user.tab();
      expect(secondButton).toHaveFocus();
      
      await user.tab({ shift: true });
      expect(firstButton).toHaveFocus();
    });
  });

  describe('Keyboard Navigation - Enter Key', () => {
    it('should trigger onClick with Enter key', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onClick when disabled (Enter)', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus(); // Force focus for testing
      
      await user.keyboard('{Enter}');
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger onClick when loading (Enter)', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button loading onClick={handleClick}>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus(); // Force focus for testing
      
      await user.keyboard('{Enter}');
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation - Space Key', () => {
    it('should trigger onClick with Space key', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onClick when disabled (Space)', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus(); // Force focus for testing
      
      await user.keyboard(' ');
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger onClick when loading (Space)', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button loading onClick={handleClick}>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      button.focus(); // Force focus for testing
      
      await user.keyboard(' ');
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have role="button"', () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });

    it('should have aria-disabled="true" when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('should have aria-busy="true" when loading', () => {
      render(<Button loading>Loading</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-busy')).toBe('true');
    });

    it('should not have aria-busy when not loading', () => {
      render(<Button>Normal</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-busy')).toBeNull();
    });

    it('should support custom aria-label', () => {
      render(<Button aria-label="Close modal">×</Button>);
      
      const button = screen.getByRole('button', { name: 'Close modal' });
      expect(button.getAttribute('aria-label')).toBe('Close modal');
    });

    it('should support aria-labelledby', () => {
      render(
        <>
          <span id="label-id">Submit Form</span>
          <Button aria-labelledby="label-id">→</Button>
        </>
      );
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-labelledby')).toBe('label-id');
    });

    it('should support aria-describedby for additional context', () => {
      render(
        <>
          <span id="desc-id">This action cannot be undone</span>
          <Button aria-describedby="desc-id">Delete Account</Button>
        </>
      );
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-describedby')).toBe('desc-id');
    });

    it('should have aria-pressed for toggle buttons', () => {
      render(<Button aria-pressed="true">Active</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicator (ring)', () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:ring-2');
    });

    it('should have high-contrast focus indicator', () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:ring-accent-primary');
      expect(button.className).toContain('focus-visible:ring-offset-2');
    });

    it('should maintain focus after click', async () => {
      const user = userEvent.setup();
      render(<Button>Click Me</Button>);
      
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(button).toHaveFocus();
    });

    it('should support focus() method', () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button') as HTMLButtonElement;
      button.focus();
      
      expect(button).toHaveFocus();
    });

    it('should support blur() method', () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button') as HTMLButtonElement;
      button.focus();
      expect(button).toHaveFocus();
      
      button.blur();
      expect(button).not.toHaveFocus();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce button text', () => {
      render(<Button>Save Changes</Button>);
      
      const button = screen.getByRole('button', { name: 'Save Changes' });
      expect(button).toBeDefined();
    });

    it('should announce loading state with loadingText', () => {
      render(<Button loading loadingText="Saving...">Save</Button>);
      
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Saving...');
      expect(button.getAttribute('aria-busy')).toBe('true');
    });

    it('should announce disabled state', () => {
      render(<Button disabled>Submit</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('should hide decorative icons from screen readers', () => {
      const Icon = () => <svg aria-hidden="true" data-testid="icon" />;
      render(
        <Button iconLeft={<Icon />}>
          Button with Icon
        </Button>
      );
      
      const icon = screen.getByTestId('icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('should provide accessible name for icon-only buttons', () => {
      const Icon = () => <svg aria-hidden="true" />;
      render(
        <Button iconLeft={<Icon />} aria-label="Close dialog" />
      );
      
      const button = screen.getByRole('button', { name: 'Close dialog' });
      expect(button).toBeDefined();
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient contrast for primary variant', () => {
      // This test validates that the button uses design system tokens
      // which already meet WCAG AA standards (tested in T033)
      render(<Button variant="primary">Primary</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-accent-primary');
      expect(button.className).toContain('text-white');
    });

    it('should have sufficient contrast for secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('border-border-subtle');
      expect(button.className).toContain('text-text-primary');
    });

    it('should have visible disabled state with reduced opacity', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('opacity-50');
    });
  });

  describe('Interactive State Feedback', () => {
    it('should provide hover feedback', () => {
      render(<Button>Hover Me</Button>);
      
      const button = screen.getByRole('button');
      // Verify hover classes exist (Tailwind will apply them on actual hover)
      expect(button.className).toContain('hover:shadow-glow-purple');
    });

    it('should provide active/pressed feedback', () => {
      render(<Button>Press Me</Button>);
      
      const button = screen.getByRole('button');
      // Verify active classes exist
      expect(button.className).toContain('active:scale-98');
    });

    it('should provide transition for smooth state changes', () => {
      render(<Button>Animated</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('transition-all');
      expect(button.className).toContain('duration-200');
    });
  });

  describe('Semantic HTML', () => {
    it('should use <button> element', () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should have type="button" by default', () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('button');
    });

    it('should support type="submit" for forms', () => {
      render(<Button type="submit">Submit</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('submit');
    });

    it('should support type="reset" for forms', () => {
      render(<Button type="reset">Reset</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('reset');
    });
  });
});
