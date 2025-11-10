import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Design Tokens Verification
 *
 * This story verifies that all Neon Flux design tokens are correctly applied:
 * - Shadow glows (purple, pink, blue, cyan)
 * - Animations (slide-in, fade-in, pulse-glow)
 * - Gradients (purple-pink, blue-purple)
 */
const meta = {
  title: 'Design System/Tokens',
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shadow Glow Tokens
 *
 * Demonstrates the four glow effects available in the Neon Flux theme.
 */
export const ShadowGlows: Story = {
  render: () => (
    <div className="flex gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 rounded-lg bg-bg-elevated shadow-glow-purple" />
        <span className="text-sm text-text-secondary">shadow-glow-purple</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 rounded-lg bg-bg-elevated shadow-glow-pink" />
        <span className="text-sm text-text-secondary">shadow-glow-pink</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 rounded-lg bg-bg-elevated shadow-glow-blue" />
        <span className="text-sm text-text-secondary">shadow-glow-blue</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 rounded-lg bg-bg-elevated shadow-glow-cyan" />
        <span className="text-sm text-text-secondary">shadow-glow-cyan</span>
      </div>
    </div>
  ),
};

/**
 * Animation Tokens
 *
 * Demonstrates the three animation utilities for panels, wizards, and active states.
 */
export const Animations: Story = {
  render: () => (
    <div className="flex gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 animate-slide-in rounded-lg bg-accent-primary" />
        <span className="text-sm text-text-secondary">animate-slide-in</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 animate-fade-in rounded-lg bg-accent-secondary" />
        <span className="text-sm text-text-secondary">animate-fade-in</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-24 w-24 animate-pulse-glow rounded-lg bg-accent-tertiary" />
        <span className="text-sm text-text-secondary">animate-pulse-glow</span>
      </div>
    </div>
  ),
};

/**
 * Gradient Backgrounds
 *
 * Demonstrates the gradient backgrounds for user and agent message bubbles.
 */
export const Gradients: Story = {
  render: () => (
    <div className="flex gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="h-32 w-48 rounded-lg bg-gradient-purple-pink p-4 backdrop-blur-sm">
          <div className="text-sm font-medium text-white">User Message</div>
          <div className="mt-1 text-xs text-neutral-200">Purple-Pink Gradient</div>
        </div>
        <span className="text-sm text-text-secondary">bg-gradient-purple-pink</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-32 w-48 rounded-lg bg-gradient-blue-purple p-4 backdrop-blur-sm">
          <div className="text-sm font-medium text-white">Agent Message</div>
          <div className="mt-1 text-xs text-neutral-200">Blue-Purple Gradient</div>
        </div>
        <span className="text-sm text-text-secondary">bg-gradient-blue-purple</span>
      </div>
    </div>
  ),
};

/**
 * Combined Effects
 *
 * Demonstrates how tokens combine for glassmorphic Neon Flux effects.
 */
export const CombinedEffects: Story = {
  render: () => (
    <div className="flex gap-8 p-8">
      <div className="flex flex-col gap-4">
        <div className="animate-fade-in rounded-lg bg-gradient-purple-pink p-6 shadow-glow-purple backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white">Purple-Pink Card</h3>
          <p className="mt-2 text-sm text-neutral-200">
            Gradient + Shadow + Blur + Fade-in animation
          </p>
        </div>
        <div className="animate-slide-in rounded-lg bg-gradient-blue-purple p-6 shadow-glow-blue backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white">Blue-Purple Panel</h3>
          <p className="mt-2 text-sm text-neutral-200">
            Gradient + Shadow + Blur + Slide-in animation
          </p>
        </div>
      </div>
    </div>
  ),
};
