import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { PanelHeaderProps } from './types';

/**
 * Panel Header Component
 *
 * Header with title and close button.
 * Automatically rendered by Panel if title prop provided.
 *
 * @example
 * ```tsx
 * <PanelHeader
 *   title="Memory Graph"
 *   onClose={handleClose}
 * />
 * ```
 */

const headerVariants = cva([
  'flex items-center justify-between',
  'px-6 py-4',
  'border-b border-border',
  'bg-elevated/50',
]);

const titleVariants = cva(['text-lg font-semibold', 'text-foreground']);

const closeButtonVariants = cva([
  'flex items-center justify-center',
  'w-8 h-8 rounded-lg',
  'transition-all duration-150',
  'hover:bg-surface',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
  'text-foreground/60 hover:text-foreground',
]);

export const PanelHeader = React.forwardRef<HTMLDivElement, PanelHeaderProps>(
  ({ title, onClose, className, ...props }, ref) => {
    return (
      <header ref={ref} className={cn(headerVariants(), className)} {...props}>
        <h2 className={cn(titleVariants())}>{title}</h2>

        <button
          type="button"
          tabIndex={0}
          aria-label="Close panel"
          className={cn(closeButtonVariants())}
          onClick={onClose}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 5L5 15M5 5L15 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>
    );
  },
);

PanelHeader.displayName = 'PanelHeader';

export type { PanelHeaderProps };
