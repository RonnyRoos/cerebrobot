import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '../components/primitives/Box';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import { Button } from '../components/primitives/Button';

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

// Stack Component
export const StackMeta: Meta<typeof Stack> = {
  title: 'Components/Primitives/Stack',
  component: Stack,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const VerticalStack: StoryObj<typeof Stack> = {
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

export const HorizontalStack: StoryObj<typeof Stack> = {
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

// Text Component
export const TextMeta: Meta<typeof Text> = {
  title: 'Components/Primitives/Text',
  component: Text,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const BodyText: StoryObj<typeof Text> = {
  args: {
    variant: 'body',
    children: 'This is body text using the design system typography tokens.',
  },
};

export const HeadingText: StoryObj<typeof Text> = {
  args: {
    variant: 'heading',
    children: 'This is a heading',
  },
};

export const CaptionText: StoryObj<typeof Text> = {
  args: {
    variant: 'caption',
    children: 'This is caption text (smaller, secondary)',
  },
};

export const TruncatedText: StoryObj<typeof Text> = {
  args: {
    truncate: true,
    children:
      'This is a very long text that will be truncated with an ellipsis when it exceeds the container width',
    style: { maxWidth: '200px' },
  },
};

// Button Component
export const ButtonMeta: Meta<typeof Button> = {
  title: 'Components/Primitives/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const PrimaryButton: StoryObj<typeof Button> = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const SecondaryButton: StoryObj<typeof Button> = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const GhostButton: StoryObj<typeof Button> = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const SmallButton: StoryObj<typeof Button> = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small Button',
  },
};

export const LargeButton: StoryObj<typeof Button> = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Large Button',
  },
};

export const LoadingButton: StoryObj<typeof Button> = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading...',
  },
};

export const DisabledButton: StoryObj<typeof Button> = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled Button',
  },
};
