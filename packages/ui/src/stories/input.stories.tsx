import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../components/input';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your name...',
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
    <div style={{ width: '300px' }}>
      <Input {...args} />
      <p
        id="error-message"
        style={{
          marginTop: '8px',
          fontSize: '0.875rem',
          color: 'hsl(var(--destructive))',
        }}
      >
        This field is required
      </p>
    </div>
  ),
};

export const SmallSize: Story = {
  args: {
    size: 'sm',
    placeholder: 'Small input',
  },
};

export const DefaultSize: Story = {
  args: {
    size: 'default',
    placeholder: 'Default input',
  },
};

export const LargeSize: Story = {
  args: {
    size: 'lg',
    placeholder: 'Large input',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
    value: 'Cannot edit this',
  },
};

export const FormIntegration: Story = {
  render: () => (
    <div style={{ width: '400px' }}>
      <form>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="name"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'hsl(var(--foreground))',
            }}
          >
            Full Name <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
          </label>
          <Input id="name" placeholder="John Doe" required aria-required="true" />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'hsl(var(--foreground))',
            }}
          >
            Email
          </label>
          <Input id="email" type="email" placeholder="john@example.com" />
        </div>

        <div>
          <label
            htmlFor="password"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'hsl(var(--foreground))',
            }}
          >
            Password <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            required
            aria-required="true"
          />
          <p
            style={{
              marginTop: '8px',
              fontSize: '0.75rem',
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            Must be at least 8 characters
          </p>
        </div>
      </form>
    </div>
  ),
};
