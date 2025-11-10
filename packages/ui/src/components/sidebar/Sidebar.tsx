import React, { useState } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { SidebarProps } from './types';

/**
 * Sidebar Container Component
 *
 * Collapsible navigation sidebar with hover-to-expand (temporary)
 * and click-to-expand (sticky) behaviors.
 *
 * Width transitions: 48px (collapsed) → 280px (expanded)
 * Animation: 200ms ease-out cubic-bezier(0.4, 0, 0.2, 1)
 *
 * @example
 * ```tsx
 * <Sidebar isExpanded={isSidebarExpanded} onToggle={toggleSidebar}>
 *   <SidebarItem icon="💬" label="Threads" active />
 *   <SidebarItem icon="🤖" label="Agents" />
 * </Sidebar>
 * ```
 */

const sidebarVariants = cva(
  // Base styles (mobile-first: bottom navigation bar)
  [
    'fixed z-40',
    'flex',
    'transition-all duration-200 ease-out',
    // Glassmorphic background
    'bg-surface/80 backdrop-blur-2xl',
    'border-border',
    // Mobile: bottom navigation bar
    'bottom-0 left-0 right-0',
    'flex-row justify-around items-center',
    'h-16 w-full',
    'border-t',
    // Tablet (md: 768px+): side navigation
    'md:top-0 md:bottom-0 md:left-0 md:right-auto',
    'md:flex-col md:justify-start',
    'md:h-auto md:border-t-0',
    // Desktop breakpoints handled in variants
  ],
  {
    variants: {
      position: {
        left: 'md:border-r',
        right: 'md:right-0 md:left-auto md:border-l',
      },
      expanded: {
        // Mobile: always collapsed (no expansion)
        // Tablet (md): 48px collapsed, 200px expanded
        // Desktop (lg): 48px collapsed, 280px expanded
        true: 'md:w-[200px] lg:w-[280px]',
        false: 'md:w-[48px]',
      },
    },
    defaultVariants: {
      position: 'left',
      expanded: false,
    },
  },
);

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ isExpanded = false, position = 'left', children, className, ...props }, ref) => {
    // Internal state for hover expansion (temporary, non-sticky)
    const [isHovered, setIsHovered] = useState(false);

    // Effective expansion state (sticky OR hover)
    // Note: Hover expansion disabled on mobile (bottom nav has no expansion)
    const isEffectivelyExpanded = isExpanded || isHovered;

    // Disable hover on mobile/touch devices
    const handleMouseEnter = () => {
      // Only enable hover on larger screens (tablet+)
      if (window.innerWidth >= 768) {
        setIsHovered(true);
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    return (
      <aside
        ref={ref}
        className={cn(
          sidebarVariants({ position, expanded: isEffectivelyExpanded }),
          isEffectivelyExpanded && 'sidebar-expanded',
          // Hide toggle on mobile (bottom nav doesn't expand)
          '[&>button[aria-label*="sidebar"]]:hidden md:[&>button[aria-label*="sidebar"]]:flex',
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </aside>
    );
  },
);

Sidebar.displayName = 'Sidebar';

export type { SidebarProps };
