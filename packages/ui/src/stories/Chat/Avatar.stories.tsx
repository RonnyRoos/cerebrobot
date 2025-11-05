import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '../../chat/avatar';

/**
 * Avatar Component
 *
 * Displays user or agent avatars with appropriate styling and icons.
 */
const meta: Meta<typeof Avatar> = {
  title: 'Components/Chat/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Avatar>;

export const UserAvatar: Story = {
  args: {
    variant: 'user',
  },
};

export const AgentAvatar: Story = {
  args: {
    variant: 'agent',
  },
};
