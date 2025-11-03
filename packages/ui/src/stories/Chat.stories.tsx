import type { Meta, StoryObj } from '@storybook/react';
import { MessageBubble } from '../chat/message-bubble';
import { CodeBlock } from '../chat/code-block';
import { Avatar } from '../chat/avatar';
import { TypingIndicator } from '../chat/typing-indicator';
import { Timestamp } from '../chat/timestamp';

/**
 * Chat Components
 *
 * Components designed specifically for chat interfaces.
 * All components use the Neon Flux design tokens for consistent theming.
 */

// MessageBubble Component
const MessageBubbleMeta: Meta<typeof MessageBubble> = {
  title: 'Components/Chat/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default MessageBubbleMeta;

export const UserMessage: StoryObj<typeof MessageBubble> = {
  args: {
    role: 'user',
    content: 'Hello! Can you help me with a TypeScript question?',
    timestamp: new Date().toISOString(),
  },
};

export const AgentMessage: StoryObj<typeof MessageBubble> = {
  args: {
    role: 'agent',
    content: "Of course! I'd be happy to help you with TypeScript. What's your question?",
    timestamp: new Date().toISOString(),
  },
};

export const MessageWithMarkdown: StoryObj<typeof MessageBubble> = {
  args: {
    role: 'agent',
    content: `Here's an example of **markdown** support:

- Bullet points work
- *Italic text* and **bold text**
- [Links](https://example.com) are clickable

You can also use \`inline code\` like this.`,
    timestamp: new Date().toISOString(),
  },
};

export const MessageWithCodeBlock: StoryObj<typeof MessageBubble> = {
  args: {
    role: 'agent',
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
    timestamp: new Date().toISOString(),
  },
};

// CodeBlock Component
export const CodeBlockMeta: Meta<typeof CodeBlock> = {
  title: 'Components/Chat/CodeBlock',
  component: CodeBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export const TypeScriptCode: StoryObj<typeof CodeBlock> = {
  args: {
    language: 'typescript',
    code: `interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
}

const agents: Agent[] = [];`,
  },
};

export const PythonCode: StoryObj<typeof CodeBlock> = {
  args: {
    language: 'python',
    code: `def fibonacci(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)`,
  },
};

export const JSONCode: StoryObj<typeof CodeBlock> = {
  args: {
    language: 'json',
    code: `{
  "name": "cerebrobot",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  }
}`,
  },
};

// Avatar Component
export const AvatarMeta: Meta<typeof Avatar> = {
  title: 'Components/Chat/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const UserAvatar: StoryObj<typeof Avatar> = {
  args: {
    role: 'user',
  },
};

export const AgentAvatar: StoryObj<typeof Avatar> = {
  args: {
    role: 'agent',
  },
};

// TypingIndicator Component
export const TypingIndicatorMeta: Meta<typeof TypingIndicator> = {
  title: 'Components/Chat/TypingIndicator',
  component: TypingIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const DefaultTypingIndicator: StoryObj<typeof TypingIndicator> = {
  args: {},
};

// Timestamp Component
export const TimestampMeta: Meta<typeof Timestamp> = {
  title: 'Components/Chat/Timestamp',
  component: Timestamp,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const RecentTimestamp: StoryObj<typeof Timestamp> = {
  args: {
    value: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
};

export const OldTimestamp: StoryObj<typeof Timestamp> = {
  args: {
    value: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
};
