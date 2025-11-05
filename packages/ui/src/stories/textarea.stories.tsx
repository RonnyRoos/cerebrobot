import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from '../components/textarea';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error'],
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    placeholder: 'Invalid input',
    'aria-invalid': true,
    'aria-describedby': 'error-message',
  },
  render: (args) => (
    <div style={{ width: '400px' }}>
      <Textarea {...args} />
      <p
        id="error-message"
        style={{
          marginTop: '8px',
          fontSize: '0.875rem',
          color: 'hsl(var(--destructive))',
        }}
      >
        Message must be at least 10 characters
      </p>
    </div>
  ),
};

export const WithRows: Story = {
  args: {
    placeholder: 'Enter detailed description...',
    rows: 6,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled textarea',
    value: 'This textarea is disabled',
  },
};

export const FormIntegration: Story = {
  render: () => (
    <div style={{ width: '500px' }}>
      <form>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="description"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'hsl(var(--foreground))',
            }}
          >
            Agent Description <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
          </label>
          <Textarea
            id="description"
            placeholder="Describe what this agent does..."
            required
            aria-required="true"
            rows={4}
          />
          <p
            style={{
              marginTop: '8px',
              fontSize: '0.75rem',
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            Provide a clear description of the agent's purpose and capabilities
          </p>
        </div>

        <div>
          <label
            htmlFor="notes"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'hsl(var(--foreground))',
            }}
          >
            Notes
          </label>
          <Textarea id="notes" placeholder="Optional notes..." rows={3} />
        </div>
      </form>
    </div>
  ),
};
