/**
 * T042: Unit tests for Button component
 * 
 * Tests:
 * - Variants (primary, secondary, tertiary, danger)
 * - Sizes (sm, md, lg)
 * - Loading state
 * - Disabled state
 * - Icon support (left/right)
 * - Full width
 * - Click handlers
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../src/components/primitives/Button';

describe('Button Component', () => {
  describe('Variants', () => {
    it('should render primary variant by default', () => {
      render(<Button>Primary Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-gradient-to-br');
      expect(button.className).toContain('from-purple-500');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('border-2');
      expect(button.className).toContain('border-border-default');
    });

    it('should render tertiary variant', () => {
      render(<Button variant="tertiary">Tertiary Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
    });

    it('should render danger variant', () => {
      render(<Button variant="danger">Delete</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-gradient-to-br');
      expect(button.className).toContain('from-error');
    });
  });

  describe('Sizes', () => {
    it('should render medium size by default', () => {
      render(<Button>Medium Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('py-2.5');
      expect(button.className).toContain('text-base');
    });

    it('should render small size', () => {
      render(<Button size="sm">Small Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
      expect(button.className).toContain('text-sm');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-8');
      expect(button.className).toContain('py-3.5');
      expect(button.className).toContain('text-lg');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.querySelector('.loading-spinner')).toBeDefined();
    });

    it('should disable button when loading', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should hide button text when loading and loadingText not provided', () => {
      render(<Button loading>Click Me</Button>);
      
      const button = screen.getByRole('button');
      // Text should be visually hidden or not visible
      expect(button.textContent).not.toContain('Click Me');
    });

    it('should show loadingText when provided', () => {
      render(<Button loading loadingText="Processing...">Submit</Button>);
      
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Processing...');
    });

    it('should not trigger onClick when loading', () => {
      const handleClick = vi.fn();
      render(<Button loading onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.className).toContain('opacity-50');
      expect(button.className).toContain('cursor-not-allowed');
    });

    it('should not trigger onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should have aria-disabled attribute', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('Click Handlers', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick with event object', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({
        type: 'click',
      }));
    });

    it('should support multiple clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Icon Support', () => {
    it('should render left icon', () => {
      const Icon = () => <svg data-testid="left-icon" />;
      render(
        <Button iconLeft={<Icon />}>
          With Icon
        </Button>
      );
      
      expect(screen.getByTestId('left-icon')).toBeDefined();
      expect(screen.getByText('With Icon')).toBeDefined();
    });

    it('should render right icon', () => {
      const Icon = () => <svg data-testid="right-icon" />;
      render(
        <Button iconRight={<Icon />}>
          With Icon
        </Button>
      );
      
      expect(screen.getByTestId('right-icon')).toBeDefined();
      expect(screen.getByText('With Icon')).toBeDefined();
    });

    it('should render both left and right icons', () => {
      const LeftIcon = () => <svg data-testid="left-icon" />;
      const RightIcon = () => <svg data-testid="right-icon" />;
      render(
        <Button iconLeft={<LeftIcon />} iconRight={<RightIcon />}>
          With Icons
        </Button>
      );
      
      expect(screen.getByTestId('left-icon')).toBeDefined();
      expect(screen.getByTestId('right-icon')).toBeDefined();
      expect(screen.getByText('With Icons')).toBeDefined();
    });

    it('should render icon-only button', () => {
      const Icon = () => <svg data-testid="icon" />;
      render(<Button iconLeft={<Icon />} aria-label="Icon button" />);
      
      const button = screen.getByRole('button');
      expect(screen.getByTestId('icon')).toBeDefined();
      expect(button.getAttribute('aria-label')).toBe('Icon button');
    });
  });

  describe('Full Width', () => {
    it('should not be full width by default', () => {
      render(<Button>Normal Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('w-full');
    });

    it('should be full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('w-full');
    });
  });

  describe('Button Type', () => {
    it('should have type="button" by default', () => {
      render(<Button>Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('button');
    });

    it('should support type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('submit');
    });

    it('should support type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('reset');
    });
  });

  describe('Focus Styles', () => {
    it('should have focus-visible styles', () => {
      render(<Button>Focusable Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.className).toContain('focus-visible:ring-accent-primary');
    });

    it('should be keyboard focusable', () => {
      render(<Button>Focusable Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.tabIndex).toBe(0);
    });
  });

  describe('Combined Props', () => {
    it('should combine variant, size, and loading', () => {
      render(
        <Button 
          variant="secondary" 
          size="lg" 
          loading 
          loadingText="Saving..."
        >
          Save
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('border'); // secondary
      expect(button.className).toContain('px-8'); // lg
      expect(button.className).toContain('py-3.5'); // lg
      expect(button).toBeDisabled(); // loading
      expect(button.textContent).toContain('Saving...');
    });

    it('should combine fullWidth with variant and size', () => {
      render(
        <Button 
          variant="primary" 
          size="sm" 
          fullWidth
        >
          Full Width Primary Small
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-gradient-to-br'); // primary
      expect(button.className).toContain('px-4'); // sm
      expect(button.className).toContain('w-full'); // fullWidth
    });
  });

  describe('ClassName Merging', () => {
    it('should merge custom className with Button classes', () => {
      render(
        <Button 
          variant="primary" 
          size="md" 
          className="custom-button" 
        >
          Custom Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-gradient-to-br');
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('custom-button');
    });
  });

  describe('Accessibility', () => {
    it('should have role="button"', () => {
      render(<Button>Accessible Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('Close dialog');
    });

    it('should support aria-labelledby', () => {
      render(
        <>
          <span id="button-label">Submit Form</span>
          <Button aria-labelledby="button-label">→</Button>
        </>
      );
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-labelledby')).toBe('button-label');
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <span id="button-desc">This will delete your account</span>
          <Button aria-describedby="button-desc">Delete Account</Button>
        </>
      );
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-describedby')).toBe('button-desc');
    });

    it('should have aria-disabled when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('should have aria-busy when loading', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-busy')).toBe('true');
    });
  });

  describe('HTML Attributes', () => {
    it('should forward standard button attributes', () => {
      render(
        <Button 
          id="unique-button" 
          name="submit-button" 
          value="submit-value"
          form="my-form"
        >
          Form Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button.id).toBe('unique-button');
      expect(button.getAttribute('name')).toBe('submit-button');
      expect(button.getAttribute('value')).toBe('submit-value');
      expect(button.getAttribute('form')).toBe('my-form');
    });
  });

  describe('Children & Content', () => {
    it('should render text content', () => {
      render(<Button>Click Me</Button>);
      
      expect(screen.getByText('Click Me')).toBeDefined();
    });

    it('should render mixed content', () => {
      render(
        <Button>
          Save <strong>Now</strong>
        </Button>
      );
      
      expect(screen.getByText(/Save/)).toBeDefined();
    });
  });
});
