import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyButton } from '../../chat/copy-button';

/**
 * CopyButton Component
 *
 * Button that copies text to clipboard with visual feedback.
 * Used in CodeBlock component for quick code copying.
 */
const meta: Meta<typeof CopyButton> = {
  title: 'Components/Chat/CopyButton',
  component: CopyButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {
  args: {
    text: 'Hello, world!',
  },
};

export const CodeSnippet: Story = {
  args: {
    text: `const greet = (name: string) => {
  console.log(\`Hello, \${name}!\`);
};`,
  },
};

export const LongText: Story = {
  args: {
    text: `This is a longer piece of text that demonstrates the copy functionality. 
It can be multiple lines and the button will copy all of it to the clipboard 
when clicked. The user will see visual feedback indicating success.`,
  },
};

export const CustomFeedbackDuration: Story = {
  args: {
    text: 'Quick feedback (1 second)',
    feedbackDuration: 1000,
  },
};
