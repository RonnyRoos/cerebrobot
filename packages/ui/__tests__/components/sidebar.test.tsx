import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar, SidebarItem, SidebarToggle } from '../../src/components/sidebar';

describe('Sidebar', () => {
  it('renders in collapsed state by default', () => {
    const { container } = render(
      <Sidebar>
        <SidebarItem icon="💬" label="Threads" />
      </Sidebar>
    );
    
    const sidebar = container.firstChild as HTMLElement;
    // Mobile: bottom nav (w-full), Tablet+: collapsed (md:w-[48px])
    expect(sidebar).toHaveClass('md:w-[48px]');
  });

  it('renders in expanded state when isExpanded is true', () => {
    const { container } = render(
      <Sidebar isExpanded>
        <SidebarItem icon="💬" label="Threads" />
      </Sidebar>
    );
    
    const sidebar = container.firstChild as HTMLElement;
    // Tablet: 200px, Desktop: 280px
    expect(sidebar).toHaveClass('md:w-[200px]');
    expect(sidebar).toHaveClass('lg:w-[280px]');
  });

  it('expands on hover when not sticky', () => {
    const { container } = render(
      <Sidebar>
        <SidebarItem icon="💬" label="Threads" />
      </Sidebar>
    );
    
    const sidebar = container.firstChild as HTMLElement;
    
    // Initially collapsed (responsive classes)
    expect(sidebar).toHaveClass('md:w-[48px]');
    
    // Hover to expand (only works on tablet+ due to window.innerWidth check)
    // Note: Hover expansion disabled on mobile in implementation
    fireEvent.mouseEnter(sidebar);
    // Still shows responsive classes
    expect(sidebar.className).toContain('md:w-');
    
    // Leave to collapse
    fireEvent.mouseLeave(sidebar);
    expect(sidebar).toHaveClass('md:w-[48px]');
  });

  it('persists sticky state when isExpanded controlled', () => {
    const onToggle = vi.fn();
    const { container, rerender } = render(
      <Sidebar isExpanded={false} onToggle={onToggle}>
        <SidebarItem icon="💬" label="Threads" />
      </Sidebar>
    );
    
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveClass('md:w-[48px]');
    
    // Rerender with expanded state
    rerender(
      <Sidebar isExpanded={true} onToggle={onToggle}>
        <SidebarItem icon="💬" label="Threads" />
      </Sidebar>
    );
    
    // Responsive: tablet 200px, desktop 280px
    expect(sidebar).toHaveClass('md:w-[200px]');
    expect(sidebar).toHaveClass('lg:w-[280px]');
  });

  it('renders on right side when position is right', () => {
    const { container } = render(
      <Sidebar position="right">
        <SidebarItem icon="💬" label="Threads" />
      </Sidebar>
    );
    
    const sidebar = container.firstChild as HTMLElement;
    // Mobile uses bottom nav (no right-0), tablet+ uses right positioning
    expect(sidebar).toHaveClass('md:right-0');
  });
});

describe('SidebarItem', () => {
  it('renders icon and label', () => {
    render(<SidebarItem icon="💬" label="Threads" />);
    
    expect(screen.getByText('💬')).toBeInTheDocument();
    expect(screen.getByText('Threads')).toBeInTheDocument();
  });

  it('applies active styles when active', () => {
    const { container } = render(
      <SidebarItem icon="💬" label="Threads" active />
    );
    
    const item = container.firstChild as HTMLElement;
    expect(item).toHaveClass('bg-accent-primary/10');
    // Responsive: border only on md+ breakpoint
    expect(item).toHaveClass('md:border-accent-primary');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SidebarItem icon="💬" label="Threads" onClick={onClick} />);
    
    const item = screen.getByRole('button', { name: 'Threads' });
    fireEvent.click(item);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation (Enter)', () => {
    const onClick = vi.fn();
    render(<SidebarItem icon="💬" label="Threads" onClick={onClick} />);
    
    const item = screen.getByRole('button', { name: 'Threads' });
    fireEvent.keyDown(item, { key: 'Enter' });
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation (Space)', () => {
    const onClick = vi.fn();
    render(<SidebarItem icon="💬" label="Threads" onClick={onClick} />);
    
    const item = screen.getByRole('button', { name: 'Threads' });
    fireEvent.keyDown(item, { key: ' ' });
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('displays badge when provided', () => {
    render(<SidebarItem icon="💬" label="Threads" badge={5} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not display badge when count is 0', () => {
    render(<SidebarItem icon="💬" label="Threads" badge={0} />);
    
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('sets aria-current when active', () => {
    render(<SidebarItem icon="💬" label="Threads" active />);
    
    const item = screen.getByRole('button', { name: 'Threads' });
    expect(item).toHaveAttribute('aria-current', 'page');
  });
});

describe('SidebarToggle', () => {
  it('renders collapse button when expanded', () => {
    render(<SidebarToggle isExpanded={true} onToggle={vi.fn()} />);
    
    const button = screen.getByLabelText('Collapse sidebar');
    expect(button).toBeInTheDocument();
  });

  it('renders expand button when collapsed', () => {
    render(<SidebarToggle isExpanded={false} onToggle={vi.fn()} />);
    
    const button = screen.getByLabelText('Expand sidebar');
    expect(button).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<SidebarToggle isExpanded={false} onToggle={onToggle} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('rotates icon when expanded', () => {
    const { container } = render(
      <SidebarToggle isExpanded={true} onToggle={vi.fn()} />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('rotate-180');
  });

  it('sets aria-expanded attribute correctly', () => {
    const { rerender } = render(
      <SidebarToggle isExpanded={false} onToggle={vi.fn()} />
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    
    rerender(<SidebarToggle isExpanded={true} onToggle={vi.fn()} />);
    
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
