import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../components/primitives/badge';

/**
 * Badge Component Stories
 *
 * Displays count notifications or status dots.
 * Used in Sidebar, Panel, and navigation components.
 */
const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default badge with count
 */
export const Default: Story = {
  args: {
    count: 5,
    variant: 'default',
    size: 'sm',
  },
};

/**
 * Purple badge (primary accent)
 */
export const Purple: Story = {
  args: {
    count: 3,
    variant: 'purple',
    size: 'sm',
  },
};

/**
 * Pink badge
 */
export const Pink: Story = {
  args: {
    count: 12,
    variant: 'pink',
    size: 'sm',
  },
};

/**
 * Blue badge
 */
export const Blue: Story = {
  args: {
    count: 99,
    variant: 'blue',
    size: 'sm',
  },
};

/**
 * Medium size badge
 */
export const MediumSize: Story = {
  args: {
    count: 7,
    variant: 'purple',
    size: 'md',
  },
};

/**
 * Dot badge (no count)
 */
export const Dot: Story = {
  args: {
    dot: true,
    variant: 'purple',
  },
};

/**
 * All variants showcase
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Small Badges</h3>
        <div className="flex items-center gap-4">
          <Badge count={5} variant="default" size="sm" />
          <Badge count={3} variant="purple" size="sm" />
          <Badge count={12} variant="pink" size="sm" />
          <Badge count={99} variant="blue" size="sm" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Medium Badges</h3>
        <div className="flex items-center gap-4">
          <Badge count={5} variant="default" size="md" />
          <Badge count={3} variant="purple" size="md" />
          <Badge count={12} variant="pink" size="md" />
          <Badge count={99} variant="blue" size="md" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Dot Badges</h3>
        <div className="flex items-center gap-4">
          <Badge dot variant="default" />
          <Badge dot variant="purple" />
          <Badge dot variant="pink" />
          <Badge dot variant="blue" />
        </div>
      </div>
    </div>
  ),
};
