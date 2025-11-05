import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { Stack } from '../components/primitives/Stack';
import { Box } from '../components/primitives/Box';

/**
 * Stack Component
 *
 * Layout primitive for arranging children in vertical or horizontal stacks with consistent spacing.
 * Supports flexbox alignment and gap control via design tokens.
 */
const meta: Meta<typeof Stack> = {
  title: 'Components/Primitives/Stack',
  component: Stack,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Stack>;

export const Vertical: Story = {
  args: {
    direction: 'vertical',
    spacing: 4,
    children: (
      <>
        <Box p={4} bg="bg-surface" border rounded="lg">
          Item 1
        </Box>
        <Box p={4} bg="bg-surface" border rounded="lg">
          Item 2
        </Box>
        <Box p={4} bg="bg-surface" border rounded="lg">
          Item 3
        </Box>
      </>
    ),
  },
};

export const Horizontal: Story = {
  args: {
    direction: 'horizontal',
    spacing: 4,
    align: 'center',
    children: (
      <>
        <Box p={4} bg="bg-surface" border rounded="lg">
          Item 1
        </Box>
        <Box p={4} bg="bg-surface" border rounded="lg">
          Item 2
        </Box>
        <Box p={4} bg="bg-surface" border rounded="lg">
          Item 3
        </Box>
      </>
    ),
  },
};

export const WithGap: Story = {
  args: {
    direction: 'vertical',
    spacing: 8,
    children: (
      <>
        <Box p={6} bg="bg-surface" border rounded="xl">
          Large Gap Item 1
        </Box>
        <Box p={6} bg="bg-surface" border rounded="xl">
          Large Gap Item 2
        </Box>
      </>
    ),
  },
};

export const Centered: Story = {
  args: {
    direction: 'vertical',
    spacing: 4,
    align: 'center',
    justify: 'center',
    children: (
      <>
        <Box p={4} bg="bg-surface" border rounded="lg">
          Centered Item 1
        </Box>
        <Box p={4} bg="bg-surface" border rounded="lg">
          Centered Item 2
        </Box>
      </>
    ),
  },
};
