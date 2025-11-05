import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '../components/primitives/Box';

/**
 * Component Primitives
 *
 * Foundational components that can be composed to build more complex UI.
 * All primitives use design tokens for consistent styling.
 */

// Box Component
const BoxMeta: Meta<typeof Box> = {
  title: 'Components/Primitives/Box',
  component: Box,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default BoxMeta;

export const BasicBox: StoryObj<typeof Box> = {
  args: {
    children: 'Basic Box',
    p: 4,
    bg: 'bg-surface',
    border: true,
    rounded: 'lg',
  },
};

export const PolymorphicBox: StoryObj<typeof Box> = {
  args: {
    as: 'article',
    children: 'This box renders as an <article> element',
    p: 6,
    bg: 'bg-elevated',
    border: true,
    rounded: 'xl',
  },
};
