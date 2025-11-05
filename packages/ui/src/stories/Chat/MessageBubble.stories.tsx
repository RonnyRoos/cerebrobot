import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { MessageBubble } from '../../chat/message-bubble';

/**
 * MessageBubble Component
 *
 * Displays chat messages with sender-specific styling, timestamps, and markdown support.
 * Part of the Neon Flux design system.
 */
const meta: Meta<typeof MessageBubble> = {
  title: 'Components/Chat/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    timestamp: {
      control: { type: 'date' },
    },
  },
  render: (args) => {
    const timestampObj =
      typeof args.timestamp === 'number' ? new Date(args.timestamp) : args.timestamp;
    return <MessageBubble {...args} timestamp={timestampObj} />;
  },
};

export default meta;

type Story = StoryObj<typeof MessageBubble>;

export const UserMessage: Story = {
  args: {
    sender: 'user',
    content: 'Hello! Can you help me with a TypeScript question?',
    timestamp: new Date(),
  },
};

export const AgentMessage: Story = {
  args: {
    sender: 'agent',
    content: "Of course! I'd be happy to help you with TypeScript. What's your question?",
    timestamp: new Date(),
  },
};

export const MessageWithMarkdown: Story = {
  args: {
    sender: 'agent',
    content: `Here's an example of **markdown** support:

- Bullet points work
- *Italic text* and **bold text**
- [Links](https://example.com) are clickable

You can also use \`inline code\` like this.`,
    timestamp: new Date(),
  },
};

export const MessageWithCodeBlock: Story = {
  args: {
    sender: 'agent',
    content: `Here's a TypeScript example:

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const createUser = (data: Partial<User>): User => {
  return {
    id: crypto.randomUUID(),
    name: data.name || 'Anonymous',
    email: data.email || 'unknown@example.com',
  };
};
\`\`\`

This demonstrates interface definition and type-safe function implementation.`,
    timestamp: new Date(),
  },
};
