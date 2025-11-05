import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeBlock } from '../../chat/code-block';

/**
 * CodeBlock Component
 *
 * Displays syntax-highlighted code blocks with copy functionality.
 * Supports multiple programming languages via Prism.js.
 */
const meta: Meta<typeof CodeBlock> = {
  title: 'Components/Chat/CodeBlock',
  component: CodeBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof CodeBlock>;

export const TypeScriptCode: Story = {
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

export const PythonCode: Story = {
  args: {
    language: 'python',
    code: `def fibonacci(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)`,
  },
};

export const JSONCode: Story = {
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

export const JavaScriptCode: Story = {
  args: {
    language: 'javascript',
    code: `const greet = (name) => {
  console.log(\`Hello, \${name}!\`);
};

greet('World');`,
  },
};
