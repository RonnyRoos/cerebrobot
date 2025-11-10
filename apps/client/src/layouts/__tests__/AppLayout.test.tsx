import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AppLayout } from '../AppLayout';

// Mock the hooks and components
vi.mock('../../hooks/useSidebarState', () => ({
  useSidebarState: () => ({
    state: {
      activeRoute: '/threads',
      isSidebarExpanded: false,
      lastVisited: {},
    },
    setActiveRoute: vi.fn(),
    toggleSidebar: vi.fn(),
    setSidebarExpanded: vi.fn(),
  }),
}));

vi.mock('../../components/navigation/NavigationItems', () => ({
  NavigationItems: ({ activeRoute }: { activeRoute: string }) => (
    <div data-testid="navigation-items">Navigation: {activeRoute}</div>
  ),
}));

describe('AppLayout', () => {
  const renderWithRouter = (children: React.ReactNode) => {
    return render(<BrowserRouter>{children}</BrowserRouter>);
  };

  it('should render sidebar with navigation items', () => {
    renderWithRouter(
      <AppLayout>
        <div>Main Content</div>
      </AppLayout>,
    );

    expect(screen.getByTestId('navigation-items')).toBeDefined();
  });

  it('should render main content area', () => {
    renderWithRouter(
      <AppLayout>
        <div data-testid="main-content">Main Content</div>
      </AppLayout>,
    );

    const mainContent = screen.getByTestId('main-content');
    expect(mainContent).toBeDefined();
    expect(mainContent.textContent).toBe('Main Content');
  });

  it('should apply correct layout structure', () => {
    const { container } = renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );

    // Verify root container has flex layout
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain('flex');
    expect(rootDiv.className).toContain('h-screen');
    expect(rootDiv.className).toContain('w-screen');
  });

  it('should render children inside main element', () => {
    renderWithRouter(
      <AppLayout>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </AppLayout>,
    );

    expect(screen.getByTestId('child-1')).toBeDefined();
    expect(screen.getByTestId('child-2')).toBeDefined();
  });

  it('should pass active route to NavigationItems', () => {
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );

    const navigationItems = screen.getByTestId('navigation-items');
    expect(navigationItems.textContent).toContain('/threads');
  });
});
