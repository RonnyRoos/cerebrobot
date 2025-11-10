import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Sidebar, SidebarItem, SidebarToggle } from '../../src/components/sidebar';

describe('Sidebar Accessibility', () => {
  it('should have no accessibility violations in collapsed state', async () => {
    const { container } = render(
      <Sidebar>
        <div className="flex flex-col h-full p-2">
          <div className="flex-1 space-y-1">
            <SidebarItem icon="💬" label="Threads" active />
            <SidebarItem icon="🤖" label="Agents" />
            <SidebarItem icon="🧠" label="Memory" badge={3} />
          </div>
          <SidebarToggle isExpanded={false} onToggle={() => {}} />
        </div>
      </Sidebar>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in expanded state', async () => {
    const { container } = render(
      <Sidebar isExpanded>
        <div className="flex flex-col h-full p-2">
          <div className="flex-1 space-y-1">
            <SidebarItem icon="💬" label="Threads" active />
            <SidebarItem icon="🤖" label="Agents" />
            <SidebarItem icon="🧠" label="Memory" badge={3} />
          </div>
          <SidebarToggle isExpanded={true} onToggle={() => {}} />
        </div>
      </Sidebar>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels on interactive elements', async () => {
    const { container, getByLabelText } = render(
      <Sidebar>
        <div className="flex flex-col h-full p-2">
          <SidebarItem icon="💬" label="Threads" />
          <SidebarItem icon="🤖" label="Agents" />
          <SidebarToggle isExpanded={false} onToggle={() => {}} />
        </div>
      </Sidebar>
    );

    // Check SidebarItem labels
    expect(getByLabelText('Threads')).toBeDefined();
    expect(getByLabelText('Agents')).toBeDefined();
    
    // Check SidebarToggle label
    expect(getByLabelText('Expand sidebar')).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support Tab navigation', async () => {
    const { container, getAllByRole } = render(
      <Sidebar>
        <div className="flex flex-col h-full p-2">
          <SidebarItem icon="💬" label="Threads" />
          <SidebarItem icon="🤖" label="Agents" />
          <SidebarItem icon="🧠" label="Memory" />
          <SidebarToggle isExpanded={false} onToggle={() => {}} />
        </div>
      </Sidebar>
    );

    const buttons = getAllByRole('button');
    
    // Should have 4 buttons (3 items + 1 toggle)
    expect(buttons).toHaveLength(4);
    
    // All buttons should be focusable (tabIndex 0)
    buttons.forEach(button => {
      expect(button.tabIndex).toBe(0);
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have aria-current on active navigation item', async () => {
    const { container, getByRole } = render(
      <Sidebar>
        <div className="flex flex-col h-full p-2">
          <SidebarItem icon="💬" label="Threads" active />
          <SidebarItem icon="🤖" label="Agents" />
        </div>
      </Sidebar>
    );

    const activeItem = getByRole('button', { name: 'Threads' });
    expect(activeItem.getAttribute('aria-current')).toBe('page');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
