import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { SidebarToggleProps } from './types';

/**
 * Sidebar Toggle Component
 *
 * Collapse/expand button for sticky sidebar state.
 * Displays chevron icon that rotates based on expansion state.
 *
 * @example
 * ```tsx
 * <SidebarToggle
 *   isExpanded={isSidebarExpanded}
 *   onToggle={toggleSidebar}
 * />
 * ```
 */

const toggleButtonVariants = cva(
  [
    'flex items-center justify-center',
    'w-10 h-10 rounded-lg',
    'transition-all duration-150',
    'hover:bg-surface',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
  ],
  {
    variants: {},
    defaultVariants: {},
  },
);

const iconVariants = cva(['transition-transform duration-200'], {
  variants: {
    expanded: {
      true: 'rotate-180',
      false: 'rotate-0',
    },
  },
  defaultVariants: {
    expanded: false,
  },
});

export const SidebarToggle = React.forwardRef<HTMLButtonElement, SidebarToggleProps>(
  ({ isExpanded, onToggle, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        tabIndex={0}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={isExpanded}
        className={cn(toggleButtonVariants(), className)}
        onClick={onToggle}
        {...props}
      >
        <svg
          className={cn(iconVariants({ expanded: isExpanded }))}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.5 15L7.5 10L12.5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  },
);

SidebarToggle.displayName = 'SidebarToggle';

export type { SidebarToggleProps };
