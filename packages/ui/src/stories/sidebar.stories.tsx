import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar, SidebarItem, SidebarToggle } from '../components/sidebar';
import { useState } from 'react';

const meta = {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default collapsed sidebar with navigation items
 */
export const CollapsedDefault: Story = {
  render: () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div style={{ height: '100vh', position: 'relative' }}>
        <Sidebar isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <div className="flex flex-col h-full p-2">
            <div className="flex-1 space-y-1">
              <SidebarItem icon="💬" label="Threads" active />
              <SidebarItem icon="🤖" label="Agents" />
              <SidebarItem icon="🧠" label="Memory" badge={3} />
              <SidebarItem icon="⚙️" label="Settings" />
            </div>
            <div className="mt-auto">
              <SidebarToggle isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
            </div>
          </div>
        </Sidebar>
        <div className="ml-[48px] p-8">
          <h1 className="text-2xl font-bold">Main Content Area</h1>
          <p className="mt-4 text-muted-foreground">
            Hover over the sidebar to see it expand temporarily, or click the toggle button for
            sticky expansion.
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Expanded sidebar showing labels
 */
export const Expanded: Story = {
  render: () => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
      <div style={{ height: '100vh', position: 'relative' }}>
        <Sidebar isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <div className="flex flex-col h-full p-2">
            <div className="flex-1 space-y-1">
              <SidebarItem icon="💬" label="Threads" active />
              <SidebarItem icon="🤖" label="Agents" />
              <SidebarItem icon="🧠" label="Memory" badge={3} />
              <SidebarItem icon="⚙️" label="Settings" />
            </div>
            <div className="mt-auto">
              <SidebarToggle isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
            </div>
          </div>
        </Sidebar>
        <div className="ml-[280px] p-8">
          <h1 className="text-2xl font-bold">Main Content Area</h1>
          <p className="mt-4 text-muted-foreground">
            Sidebar is expanded, showing all labels. Click the toggle to collapse.
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Sidebar with active item showing badge
 */
export const WithActiveBadge: Story = {
  render: () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeItem, setActiveItem] = useState('memory');

    return (
      <div style={{ height: '100vh', position: 'relative' }}>
        <Sidebar isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)}>
          <div className="flex flex-col h-full p-2">
            <div className="flex-1 space-y-1">
              <SidebarItem
                icon="💬"
                label="Threads"
                active={activeItem === 'threads'}
                onClick={() => setActiveItem('threads')}
              />
              <SidebarItem
                icon="🤖"
                label="Agents"
                active={activeItem === 'agents'}
                onClick={() => setActiveItem('agents')}
              />
              <SidebarItem
                icon="🧠"
                label="Memory"
                badge={12}
                active={activeItem === 'memory'}
                onClick={() => setActiveItem('memory')}
              />
              <SidebarItem
                icon="⚙️"
                label="Settings"
                active={activeItem === 'settings'}
                onClick={() => setActiveItem('settings')}
              />
            </div>
            <div className="mt-auto">
              <SidebarToggle isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
            </div>
          </div>
        </Sidebar>
        <div className="ml-[48px] p-8">
          <h1 className="text-2xl font-bold">Active: {activeItem}</h1>
          <p className="mt-4 text-muted-foreground">
            Click navigation items to change the active state. The Memory item shows a badge with
            count.
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Right-positioned sidebar
 */
export const RightPosition: Story = {
  render: () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div style={{ height: '100vh', position: 'relative' }}>
        <Sidebar
          position="right"
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-col h-full p-2">
            <div className="flex-1 space-y-1">
              <SidebarItem icon="📊" label="Analytics" />
              <SidebarItem icon="📁" label="Files" active />
              <SidebarItem icon="🔔" label="Notifications" badge={5} />
              <SidebarItem icon="👤" label="Profile" />
            </div>
            <div className="mt-auto">
              <SidebarToggle isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
            </div>
          </div>
        </Sidebar>
        <div className="mr-[48px] p-8">
          <h1 className="text-2xl font-bold">Main Content Area</h1>
          <p className="mt-4 text-muted-foreground">
            Sidebar positioned on the right side of the screen.
          </p>
        </div>
      </div>
    );
  },
};
