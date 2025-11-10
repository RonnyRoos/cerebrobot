import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Panel } from '../components/panel/Panel';
import { Button } from '../components/primitives';

const meta = {
  title: 'Navigation/Panel',
  component: Panel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Closed panel - click button to open
 */
export const Closed: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="min-h-screen bg-background p-8">
        <Button onClick={() => setIsOpen(true)}>Open Panel</Button>

        <Panel isOpen={isOpen} onClose={() => setIsOpen(false)} title="Panel Title">
          <div className="space-y-4">
            <p className="text-foreground">This is the panel content.</p>
            <p className="text-foreground/60">
              Click the backdrop, press Escape, or click the X button to close.
            </p>
          </div>
        </Panel>
      </div>
    );
  },
};

/**
 * Opening animation - panel slides in from right
 */
export const Opening: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="min-h-screen bg-background p-8">
        <Button onClick={() => setIsOpen(true)}>Trigger Opening Animation</Button>

        <Panel isOpen={isOpen} onClose={() => setIsOpen(false)} title="Opening Panel">
          <div className="space-y-4">
            <p className="text-foreground">Watch the slide-in animation (200ms ease-out).</p>
            <p className="text-foreground/60">
              Panel slides from translateX(100%) to translateX(0).
            </p>
          </div>
        </Panel>
      </div>
    );
  },
};

/**
 * Open panel - default state with backdrop
 */
export const Open: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="min-h-screen bg-background p-8">
        <Button onClick={() => setIsOpen(!isOpen)} variant="secondary">
          Toggle Panel
        </Button>

        <Panel isOpen={isOpen} onClose={() => setIsOpen(false)} title="Memory Graph">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Memory Entities</h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <p className="text-sm font-medium text-foreground">User Profile</p>
                  <p className="text-xs text-foreground/60 mt-1">Created 2 hours ago</p>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <p className="text-sm font-medium text-foreground">Project Context</p>
                  <p className="text-xs text-foreground/60 mt-1">Created 5 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    );
  },
};

/**
 * Panel with backdrop (default behavior)
 */
export const WithBackdrop: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="min-h-screen bg-background p-8">
        <Button onClick={() => setIsOpen(!isOpen)} variant="secondary">
          Toggle Panel
        </Button>

        <Panel
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Settings"
          showBackdrop={true}
          closeOnBackdropClick={true}
        >
          <div className="space-y-4">
            <p className="text-foreground">
              Click the backdrop (dimmed area outside panel) to close.
            </p>
            <p className="text-foreground/60">
              Backdrop has bg-black/40 with backdrop-blur-sm for glassmorphic effect.
            </p>
          </div>
        </Panel>
      </div>
    );
  },
};

/**
 * Left position - panel slides in from left
 */
export const LeftPosition: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div className="min-h-screen bg-background p-8">
        <Button onClick={() => setIsOpen(!isOpen)} variant="secondary">
          Toggle Left Panel
        </Button>

        <Panel
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Navigation"
          position="left"
          width="300px"
        >
          <div className="space-y-2">
            <button className="w-full text-left p-3 rounded-lg hover:bg-surface text-foreground">
              Home
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-surface text-foreground">
              Agents
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-surface text-foreground">
              Memory
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-surface text-foreground">
              Settings
            </button>
          </div>
        </Panel>
      </div>
    );
  },
};
