import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../components/primitives/Text';

/**
 * Text Component
 *
 * Typography primitive with semantic variants and design token integration.
 * Supports truncation, custom elements, and accessible text rendering.
 */
const meta: Meta<typeof Text> = {
  title: 'Components/Primitives/Text',
  component: Text,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Text>;

export const Body: Story = {
  args: {
    variant: 'body',
    children: 'This is body text using the design system typography tokens.',
  },
};

export const Heading: Story = {
  args: {
    variant: 'heading',
    children: 'This is a heading',
  },
};

export const Caption: Story = {
  args: {
    variant: 'caption',
    children: 'This is caption text (smaller, secondary)',
  },
};

export const Truncated: Story = {
  args: {
    truncate: true,
    children:
      'This is a very long text that will be truncated with an ellipsis when it exceeds the container width',
    style: { maxWidth: '200px' },
  },
};

export const CustomElement: Story = {
  args: {
    as: 'span',
    variant: 'body',
    children: 'This renders as a span element',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Text variant="heading">Heading Text</Text>
      <Text variant="body">Body Text</Text>
      <Text variant="caption">Caption Text</Text>
    </div>
  ),
};
