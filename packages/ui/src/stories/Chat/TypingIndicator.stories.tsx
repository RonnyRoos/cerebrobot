import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypingIndicator } from '../../chat/typing-indicator';

/**
 * TypingIndicator Component
 *
 * Animated indicator showing that the agent is typing a response.
 * Features pulsing dots with Neon Flux styling.
 */
const meta: Meta<typeof TypingIndicator> = {
  title: 'Components/Chat/TypingIndicator',
  component: TypingIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TypingIndicator>;

export const Default: Story = {
  args: {},
};
