/**
 * T040: Unit tests for Stack component
 * 
 * Tests:
 * - Direction (row, column)
 * - Spacing between children (gap token)
 * - Alignment (justify, align)
 * - Wrapping behavior
 * - Responsive props
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack } from '../../src/components/primitives/Stack';

describe('Stack Component', () => {
  describe('Direction', () => {
    it('should render as column by default', () => {
      render(<Stack data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('flex-col');
    });

    it('should render as row when direction is "row"', () => {
      render(<Stack direction="row" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('flex-row');
    });

    it('should render as column when direction is "column"', () => {
      render(<Stack direction="column" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('flex-col');
    });

    it('should support responsive direction', () => {
      render(
        <Stack 
          direction={{ base: 'column', md: 'row' }} 
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('flex-col');
      expect(element.className).toContain('md:flex-row');
    });
  });

  describe('Spacing (Gap)', () => {
    it('should apply gap token between children', () => {
      render(<Stack spacing="4" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('gap-4');
    });

    it('should apply small gap', () => {
      render(<Stack spacing="2" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('gap-2');
    });

    it('should apply large gap', () => {
      render(<Stack spacing="8" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('gap-8');
    });

    it('should support responsive spacing', () => {
      render(
        <Stack 
          spacing={{ base: '2', md: '4', lg: '6' }} 
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('gap-2');
      expect(element.className).toContain('md:gap-4');
      expect(element.className).toContain('lg:gap-6');
    });
  });

  describe('Alignment - Justify Content', () => {
    it('should apply justify-start', () => {
      render(<Stack justify="start" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('justify-start');
    });

    it('should apply justify-center', () => {
      render(<Stack justify="center" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('justify-center');
    });

    it('should apply justify-end', () => {
      render(<Stack justify="end" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('justify-end');
    });

    it('should apply justify-between', () => {
      render(<Stack justify="between" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('justify-between');
    });

    it('should apply justify-around', () => {
      render(<Stack justify="around" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('justify-around');
    });

    it('should support responsive justify', () => {
      render(
        <Stack 
          justify={{ base: 'start', md: 'center' }} 
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('justify-start');
      expect(element.className).toContain('md:justify-center');
    });
  });

  describe('Alignment - Align Items', () => {
    it('should apply items-start', () => {
      render(<Stack align="start" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('items-start');
    });

    it('should apply items-center', () => {
      render(<Stack align="center" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('items-center');
    });

    it('should apply items-end', () => {
      render(<Stack align="end" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('items-end');
    });

    it('should apply items-stretch', () => {
      render(<Stack align="stretch" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('items-stretch');
    });

    it('should support responsive align', () => {
      render(
        <Stack 
          align={{ base: 'start', md: 'center' }} 
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('items-start');
      expect(element.className).toContain('md:items-center');
    });
  });

  describe('Wrapping', () => {
    it('should not wrap by default', () => {
      render(<Stack data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).not.toContain('flex-wrap');
    });

    it('should wrap when wrap is true', () => {
      render(<Stack wrap data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('flex-wrap');
    });

    it('should not wrap when wrap is false', () => {
      render(<Stack wrap={false} data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).not.toContain('flex-wrap');
    });
  });

  describe('Combined Layout Props', () => {
    it('should combine direction, spacing, justify, and align', () => {
      render(
        <Stack 
          direction="row" 
          spacing="4" 
          justify="center" 
          align="center"
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('flex-row');
      expect(element.className).toContain('gap-4');
      expect(element.className).toContain('justify-center');
      expect(element.className).toContain('items-center');
    });

    it('should combine responsive props', () => {
      render(
        <Stack 
          direction={{ base: 'column', md: 'row' }}
          spacing={{ base: '2', md: '4' }}
          justify={{ base: 'start', md: 'between' }}
          align={{ base: 'stretch', md: 'center' }}
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      
      // Base (mobile)
      expect(element.className).toContain('flex-col');
      expect(element.className).toContain('gap-2');
      expect(element.className).toContain('justify-start');
      expect(element.className).toContain('items-stretch');
      
      // md (tablet+)
      expect(element.className).toContain('md:flex-row');
      expect(element.className).toContain('md:gap-4');
      expect(element.className).toContain('md:justify-between');
      expect(element.className).toContain('md:items-center');
    });
  });

  describe('Token Props Inheritance', () => {
    it('should inherit Box token props (padding)', () => {
      render(<Stack p="4" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('p-4');
    });

    it('should inherit Box token props (background)', () => {
      render(<Stack bg="bg-surface" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('bg-bg-surface');
    });

    it('should inherit Box token props (border radius)', () => {
      render(<Stack rounded="md" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('rounded-md');
    });

    it('should combine Stack-specific and Box props', () => {
      render(
        <Stack 
          direction="row" 
          spacing="4" 
          p="6" 
          bg="bg-surface" 
          rounded="lg"
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      
      // Stack props
      expect(element.className).toContain('flex-row');
      expect(element.className).toContain('gap-4');
      
      // Box props
      expect(element.className).toContain('p-6');
      expect(element.className).toContain('bg-bg-surface');
      expect(element.className).toContain('rounded-lg');
    });
  });

  describe('Polymorphic Rendering', () => {
    it('should render as div by default', () => {
      render(<Stack data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.tagName).toBe('DIV');
    });

    it('should render as nav when specified', () => {
      render(<Stack as="nav" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.tagName).toBe('NAV');
    });

    it('should render as ul for list layouts', () => {
      render(<Stack as="ul" data-testid="stack">Content</Stack>);
      
      const element = screen.getByTestId('stack');
      expect(element.tagName).toBe('UL');
    });
  });

  describe('Children Rendering', () => {
    it('should render multiple children with spacing', () => {
      render(
        <Stack spacing="4" data-testid="stack">
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </Stack>
      );
      
      expect(screen.getByText('Child 1')).toBeDefined();
      expect(screen.getByText('Child 2')).toBeDefined();
      expect(screen.getByText('Child 3')).toBeDefined();
    });

    it('should work with single child', () => {
      render(
        <Stack spacing="4" data-testid="stack">
          <div>Only child</div>
        </Stack>
      );
      
      expect(screen.getByText('Only child')).toBeDefined();
    });
  });

  describe('ClassName Merging', () => {
    it('should merge custom className with Stack classes', () => {
      render(
        <Stack 
          direction="row" 
          spacing="4" 
          className="custom-stack" 
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      expect(element.className).toContain('flex-row');
      expect(element.className).toContain('gap-4');
      expect(element.className).toContain('custom-stack');
    });
  });

  describe('HTML Attributes', () => {
    it('should forward standard HTML attributes', () => {
      render(
        <Stack 
          id="unique-stack" 
          role="list" 
          aria-label="Navigation stack"
          data-testid="stack"
        >
          Content
        </Stack>
      );
      
      const element = screen.getByTestId('stack');
      expect(element.id).toBe('unique-stack');
      expect(element.getAttribute('role')).toBe('list');
      expect(element.getAttribute('aria-label')).toBe('Navigation stack');
    });
  });
});
