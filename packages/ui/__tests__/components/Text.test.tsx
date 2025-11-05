/**
 * T041: Unit tests for Text component
 * 
 * Tests:
 * - Variants (body, label, caption, code)
 * - Font sizes (xs to 4xl)
 * - Font weights (400 to 800)
 * - Truncation (single/multi-line)
 * - Semantic HTML (p, span, label, code, strong, em)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from '../../src/components/primitives/Text';

describe('Text Component', () => {
  describe('Variants', () => {
    it('should render body variant by default', () => {
      render(<Text data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-base');
      expect(element.className).toContain('font-normal');
    });

    it('should render label variant', () => {
      render(<Text variant="label" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-sm');
      expect(element.className).toContain('font-medium');
    });

    it('should render caption variant', () => {
      render(<Text variant="caption" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-xs');
      expect(element.className).toContain('text-text-secondary');
    });

    it('should render code variant', () => {
      render(<Text variant="code" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('font-mono');
      expect(element.className).toContain('text-sm');
    });
  });

  describe('Font Sizes', () => {
    it('should apply xs font size', () => {
      render(<Text size="xs" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-xs');
    });

    it('should apply sm font size', () => {
      render(<Text size="sm" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-sm');
    });

    it('should apply base font size', () => {
      render(<Text size="base" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-base');
    });

    it('should apply lg font size', () => {
      render(<Text size="lg" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-lg');
    });

    it('should apply xl font size', () => {
      render(<Text size="xl" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-xl');
    });

    it('should apply 2xl font size', () => {
      render(<Text size="2xl" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-2xl');
    });

    it('should apply 3xl font size', () => {
      render(<Text size="3xl" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-3xl');
    });

    it('should apply 4xl font size', () => {
      render(<Text size="4xl" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-4xl');
    });

    it('should support responsive font sizes', () => {
      render(
        <Text 
          size={{ base: 'sm', md: 'base', lg: 'lg' }} 
          data-testid="text"
        >
          Content
        </Text>
      );
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-sm');
      expect(element.className).toContain('md:text-base');
      expect(element.className).toContain('lg:text-lg');
    });
  });

  describe('Font Weights', () => {
    it('should apply font-normal (400)', () => {
      render(<Text weight="normal" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('font-normal');
    });

    it('should apply font-medium (500)', () => {
      render(<Text weight="medium" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('font-medium');
    });

    it('should apply font-semibold (600)', () => {
      render(<Text weight="semibold" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('font-semibold');
    });

    it('should apply font-bold (700)', () => {
      render(<Text weight="bold" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('font-bold');
    });

    it('should apply font-extrabold (800)', () => {
      render(<Text weight="extrabold" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('font-extrabold');
    });
  });

  describe('Text Colors', () => {
    it('should apply primary text color by default', () => {
      render(<Text data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-text-primary');
    });

    it('should apply secondary text color', () => {
      render(<Text color="text-secondary" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-text-secondary');
    });

    it('should apply muted text color', () => {
      render(<Text color="text-muted" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-text-muted');
    });

    it('should apply accent color', () => {
      render(<Text color="accent-primary" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-accent-primary');
    });
  });

  describe('Truncation', () => {
    it('should not truncate by default', () => {
      render(<Text data-testid="text">Long content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).not.toContain('truncate');
      expect(element.className).not.toContain('line-clamp');
    });

    it('should truncate with ellipsis (single line)', () => {
      render(<Text truncate data-testid="text">Very long content that should be truncated</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('truncate');
    });

    it('should truncate with line clamp (multi-line)', () => {
      render(<Text lineClamp={3} data-testid="text">Very long multi-line content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('line-clamp-3');
    });

    it('should support different line clamp values', () => {
      const { rerender } = render(
        <Text lineClamp={2} data-testid="text">Content</Text>
      );
      
      let element = screen.getByTestId('text');
      expect(element.className).toContain('line-clamp-2');
      
      rerender(<Text lineClamp={4} data-testid="text">Content</Text>);
      element = screen.getByTestId('text');
      expect(element.className).toContain('line-clamp-4');
    });
  });

  describe('Text Alignment', () => {
    it('should apply text-left', () => {
      render(<Text align="left" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-left');
    });

    it('should apply text-center', () => {
      render(<Text align="center" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-center');
    });

    it('should apply text-right', () => {
      render(<Text align="right" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-right');
    });

    it('should apply text-justify', () => {
      render(<Text align="justify" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-justify');
    });

    it('should support responsive alignment', () => {
      render(
        <Text 
          align={{ base: 'left', md: 'center' }} 
          data-testid="text"
        >
          Content
        </Text>
      );
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-left');
      expect(element.className).toContain('md:text-center');
    });
  });

  describe('Semantic HTML Elements', () => {
    it('should render as p by default', () => {
      render(<Text data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('P');
    });

    it('should render as span when specified', () => {
      render(<Text as="span" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('SPAN');
    });

    it('should render as label for form labels', () => {
      render(<Text as="label" data-testid="text">Label</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('LABEL');
    });

    it('should render as code for inline code', () => {
      render(<Text as="code" data-testid="text">const x = 1;</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('CODE');
    });

    it('should render as strong for emphasis', () => {
      render(<Text as="strong" data-testid="text">Important</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('STRONG');
    });

    it('should render as em for italics', () => {
      render(<Text as="em" data-testid="text">Emphasized</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('EM');
    });

    it('should render as div when specified', () => {
      render(<Text as="div" data-testid="text">Content</Text>);
      
      const element = screen.getByTestId('text');
      expect(element.tagName).toBe('DIV');
    });
  });

  describe('Combined Props', () => {
    it('should combine size, weight, and color', () => {
      render(
        <Text 
          size="lg" 
          weight="bold" 
          color="accent-primary" 
          data-testid="text"
        >
          Headline
        </Text>
      );
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-lg');
      expect(element.className).toContain('font-bold');
      expect(element.className).toContain('text-accent-primary');
    });

    it('should combine variant with size override', () => {
      render(
        <Text 
          variant="label" 
          size="lg" 
          data-testid="text"
        >
          Large Label
        </Text>
      );
      
      const element = screen.getByTestId('text');
      // Size override should take precedence
      expect(element.className).toContain('text-lg');
      expect(element.className).toContain('font-medium'); // from variant
    });
  });

  describe('ClassName Merging', () => {
    it('should merge custom className with Text classes', () => {
      render(
        <Text 
          size="lg" 
          weight="bold" 
          className="custom-text" 
          data-testid="text"
        >
          Content
        </Text>
      );
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('text-lg');
      expect(element.className).toContain('font-bold');
      expect(element.className).toContain('custom-text');
    });
  });

  describe('HTML Attributes', () => {
    it('should forward standard HTML attributes', () => {
      render(
        <Text 
          id="unique-text" 
          role="heading" 
          aria-level={2}
          data-testid="text"
        >
          Content
        </Text>
      );
      
      const element = screen.getByTestId('text');
      expect(element.id).toBe('unique-text');
      expect(element.getAttribute('role')).toBe('heading');
      expect(element.getAttribute('aria-level')).toBe('2');
    });

    it('should support htmlFor on label elements', () => {
      render(
        <Text 
          as="label" 
          htmlFor="input-id" 
          data-testid="text"
        >
          Field Label
        </Text>
      );
      
      const element = screen.getByTestId('text') as HTMLLabelElement;
      expect(element.tagName).toBe('LABEL');
      expect(element.htmlFor).toBe('input-id');
    });
  });

  describe('Children & Content', () => {
    it('should render text content', () => {
      render(<Text data-testid="text">Simple text</Text>);
      
      expect(screen.getByText('Simple text')).toBeDefined();
    });

    it('should render mixed content with elements', () => {
      render(
        <Text data-testid="text">
          Text with <strong>bold</strong> and <em>italic</em>
        </Text>
      );
      
      expect(screen.getByText(/Text with/)).toBeDefined();
    });

    it('should render code variant with monospace content', () => {
      render(
        <Text variant="code" data-testid="text">
          const foo = "bar";
        </Text>
      );
      
      const element = screen.getByTestId('text');
      expect(element.className).toContain('font-mono');
      expect(screen.getByText(/const foo/)).toBeDefined();
    });
  });
});
