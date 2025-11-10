import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { SidebarItemProps } from './types';
import { Badge } from '../primitives/badge';

/**
 * Sidebar Item Component
 *
 * Individual navigation item with icon, label, and optional badge.
 * Active state displays purple glow effect.
 *
 * @example
 * ```tsx
 * <SidebarItem
 *   icon="💬"
 *   label="Threads"
 *   active
 *   onClick={() => navigate('/threads')}
 *   badge={5}
 * />
 * ```
 */

const sidebarItemVariants = cva(
  // Base styles (mobile-first: centered icon only)
  [
    'group relative flex items-center',
    'cursor-pointer',
    'transition-all duration-150',
    // Mobile: centered, flex-col, no gaps
    'flex-col justify-center',
    'h-12 w-12 rounded-lg',
    // Tablet+: default to centered (collapsed sidebar)
    'md:flex-col md:justify-center md:h-12 md:w-12 md:p-0',
    // When parent sidebar is expanded: horizontal layout with gap and padding
    'sidebar-expanded:md:flex-row sidebar-expanded:md:gap-3 sidebar-expanded:md:w-auto sidebar-expanded:md:px-3',
    // Hover state
    'hover:bg-surface',
    // Focus state (keyboard navigation)
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:shadow-glow-purple',
  ],
  {
    variants: {
      active: {
        // Mobile: no border (bottom nav), just glow
        // Tablet+: left border and glow
        true: ['bg-accent-primary/10 shadow-glow-purple', 'md:border-l-2 md:border-accent-primary'],
        false: 'md:border-l-2 md:border-transparent',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

const iconWrapperVariants = cva(
  ['flex-shrink-0 w-6 h-6 flex items-center justify-center text-2xl'],
  {
    variants: {
      active: {
        true: 'text-accent-primary',
        false: 'text-foreground',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

const labelVariants = cva(
  [
    'text-sm font-medium',
    'truncate',
    // Opacity transition for expand/collapse
    'transition-opacity duration-200',
    // Mobile: always hidden
    'hidden',
    // Tablet+: hidden by default, shown when parent sidebar is expanded
    'md:hidden sidebar-expanded:md:block sidebar-expanded:md:flex-1',
  ],
  {
    variants: {
      active: {
        true: 'text-accent-primary',
        false: 'text-foreground',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ icon, label, active = false, onClick, badge, className, ...props }, ref) => {
    const handleClick = () => {
      onClick?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={cn(sidebarItemVariants({ active }), className)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <div className={cn(iconWrapperVariants({ active }))}>{icon}</div>

        <span className={cn(labelVariants({ active }))}>{label}</span>

        {badge !== undefined && badge > 0 && <Badge variant="purple" size="sm" count={badge} />}
      </div>
    );
  },
);

SidebarItem.displayName = 'SidebarItem';

export type { SidebarItemProps };
