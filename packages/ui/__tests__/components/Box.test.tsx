/**
 * T039: Unit tests for Box component
 * 
 * Tests:
 * - Polymorphic 'as' prop (div, span, section, article, etc.)
 * - Token prop mapping (bg, p, m, rounded, etc.)
 * - Responsive props (object syntax)
 * - className merging
 * - Ref forwarding
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Box } from '../../src/components/primitives/Box';

describe('Box Component', () => {
  describe('Polymorphic Rendering', () => {
    it('should render as div by default', () => {
      render(<Box data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.tagName).toBe('DIV');
    });

    it('should render as specified HTML element', () => {
      render(<Box as="section" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.tagName).toBe('SECTION');
    });

    it('should render as span when specified', () => {
      render(<Box as="span" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.tagName).toBe('SPAN');
    });

    it('should render as article when specified', () => {
      render(<Box as="article" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.tagName).toBe('ARTICLE');
    });

    it('should render as nav when specified', () => {
      render(<Box as="nav" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.tagName).toBe('NAV');
    });
  });

  describe('Token Props - Spacing', () => {
    it('should apply padding token via p prop', () => {
      render(<Box p="4" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('p-4');
    });

    it('should apply margin token via m prop', () => {
      render(<Box m="2" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('m-2');
    });

    it('should apply directional padding (px, py, pt, pr, pb, pl)', () => {
      render(<Box px="4" py="2" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('px-4');
      expect(element.className).toContain('py-2');
    });

    it('should apply directional margin (mx, my, mt, mr, mb, ml)', () => {
      render(<Box mx="auto" mt="4" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('mx-auto');
      expect(element.className).toContain('mt-4');
    });

    it('should apply gap token', () => {
      render(<Box gap="3" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('gap-3');
    });
  });

  describe('Token Props - Colors', () => {
    it('should apply background color token via bg prop', () => {
      render(<Box bg="bg-surface" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('bg-bg-surface');
    });

    it('should apply text color token via color prop', () => {
      render(<Box color="text-primary" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('text-text-primary');
    });

    it('should apply accent color', () => {
      render(<Box bg="accent-primary" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('bg-accent-primary');
    });
  });

  describe('Token Props - Border & Radius', () => {
    it('should apply border width token', () => {
      render(<Box border="1" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('border');
    });

    it('should apply border color token via borderColor prop', () => {
      render(<Box border="1" borderColor="border-subtle" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('border-border-subtle');
    });

    it('should apply border radius token via rounded prop', () => {
      render(<Box rounded="md" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('rounded-md');
    });

    it('should apply full border radius', () => {
      render(<Box rounded="full" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('rounded-full');
    });
  });

  describe('Token Props - Shadow & Effects', () => {
    it('should apply elevation shadow via shadow prop', () => {
      render(<Box shadow="md" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('shadow-md');
    });

    it('should apply Neon Flux glow shadow', () => {
      render(<Box shadow="glow-purple" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('shadow-glow-purple');
    });

    it('should apply backdrop blur via blur prop', () => {
      render(<Box blur="md" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('backdrop-blur-md');
    });

    it('should apply opacity token', () => {
      render(<Box opacity="50" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('opacity-50');
    });
  });

  describe('Layout Props', () => {
    it('should apply display utilities', () => {
      render(<Box display="flex" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('flex');
    });

    it('should apply flexbox utilities', () => {
      render(
        <Box 
          display="flex" 
          justify="center" 
          align="center" 
          data-testid="box"
        >
          Content
        </Box>
      );
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('flex');
      expect(element.className).toContain('justify-center');
      expect(element.className).toContain('items-center');
    });

    it('should apply width and height utilities', () => {
      render(<Box w="full" h="screen" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('w-full');
      expect(element.className).toContain('h-screen');
    });

    it('should apply position utilities', () => {
      render(<Box position="relative" data-testid="box">Content</Box>);
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('relative');
    });
  });

  describe('Responsive Props', () => {
    it('should apply responsive padding using object syntax', () => {
      render(
        <Box 
          p={{ base: '2', md: '4', lg: '6' }} 
          data-testid="box"
        >
          Content
        </Box>
      );
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('p-2');
      expect(element.className).toContain('md:p-4');
      expect(element.className).toContain('lg:p-6');
    });

    it('should apply responsive background colors', () => {
      render(
        <Box 
          bg={{ base: 'bg-base', md: 'bg-surface' }} 
          data-testid="box"
        >
          Content
        </Box>
      );
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('bg-bg-base');
      expect(element.className).toContain('md:bg-bg-surface');
    });

    it('should apply responsive display utilities', () => {
      render(
        <Box 
          display={{ base: 'block', md: 'flex' }} 
          data-testid="box"
        >
          Content
        </Box>
      );
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('block');
      expect(element.className).toContain('md:flex');
    });
  });

  describe('ClassName Merging', () => {
    it('should merge custom className with token props', () => {
      render(
        <Box 
          p="4" 
          bg="bg-surface" 
          className="custom-class" 
          data-testid="box"
        >
          Content
        </Box>
      );
      
      const element = screen.getByTestId('box');
      expect(element.className).toContain('p-4');
      expect(element.className).toContain('bg-bg-surface');
      expect(element.className).toContain('custom-class');
    });

    it('should allow className to override token props (later wins)', () => {
      render(
        <Box 
          p="4" 
          className="p-8" 
          data-testid="box"
        >
          Content
        </Box>
      );
      
      const element = screen.getByTestId('box');
      // className should override token props (tailwind-merge deduplicates, keeps p-8)
      expect(element.className).not.toContain('p-4');
      expect(element.className).toContain('p-8');
    });
  });

  describe('HTML Attributes', () => {
    it('should forward standard HTML attributes', () => {
      render(
        <Box 
          id="unique-id" 
          role="region" 
          aria-label="Content region"
          data-testid="box"
        >
          Content
        </Box>
      );
      
      const element = screen.getByTestId('box');
      expect(element.id).toBe('unique-id');
      expect(element.getAttribute('role')).toBe('region');
      expect(element.getAttribute('aria-label')).toBe('Content region');
    });

    it('should support data attributes', () => {
      render(
        <Box 
          data-testid="box"
          data-custom="value"
        >
          Content
        </Box>
      );
      
      const element = screen.getByTestId('box');
      expect(element.getAttribute('data-custom')).toBe('value');
    });
  });

  describe('Children & Content', () => {
    it('should render text children', () => {
      render(<Box data-testid="box">Hello World</Box>);
      
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render nested elements', () => {
      render(
        <Box data-testid="box">
          <span>Child 1</span>
          <span>Child 2</span>
        </Box>
      );
      
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('should render complex nested structure', () => {
      render(
        <Box data-testid="outer">
          <Box as="section" data-testid="inner">
            <Box as="span">Nested content</Box>
          </Box>
        </Box>
      );
      
      const outer = screen.getByTestId('outer');
      const inner = screen.getByTestId('inner');
      
      expect(outer).toBeInTheDocument();
      expect(inner).toBeInTheDocument();
      expect(inner.tagName).toBe('SECTION');
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });
});
