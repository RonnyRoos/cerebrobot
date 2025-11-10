import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, SidebarToggle, cn } from '@workspace/ui';
import { useSidebarState } from '../hooks/useSidebarState';
import { NavigationItems } from '../components/navigation/NavigationItems';

/**
 * AppLayout Component
 *
 * Main application layout wrapper with collapsible sidebar navigation.
 * - Sidebar: 48px collapsed → 280px expanded
 * - Main content area: Responsive to sidebar state
 * - State persistence: Sidebar state and active route saved to localStorage
 *
 * @example
 * ```tsx
 * <AppLayout>
 *   <Routes>
 *     <Route path="/threads" element={<ThreadListView />} />
 *     <Route path="/agents" element={<AgentsPage />} />
 *   </Routes>
 * </AppLayout>
 * ```
 */

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { state, setActiveRoute, toggleSidebar } = useSidebarState();

  // Update active route when location changes
  useEffect(() => {
    setActiveRoute(location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // setActiveRoute is stable from useSidebarState

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base">
      {/* Sidebar Navigation */}
      <Sidebar isExpanded={state.isSidebarExpanded} onToggle={toggleSidebar} position="left">
        <NavigationItems activeRoute={state.activeRoute} />
        <SidebarToggle isExpanded={state.isSidebarExpanded} onToggle={toggleSidebar} />
      </Sidebar>

      {/* Main Content Area - offset by sidebar width on desktop, full width on mobile */}
      <main
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-200 ease-out',
          // Mobile: bottom padding for bottom nav bar, no left margin
          'pb-16 md:pb-0',
          // Desktop: sidebar margin (controlled by state)
          state.isSidebarExpanded ? 'md:ml-[280px]' : 'md:ml-[48px]',
        )}
      >
        {children}
      </main>
    </div>
  );
}
