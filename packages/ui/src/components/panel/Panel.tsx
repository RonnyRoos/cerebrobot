import React, { useEffect } from 'react';
import FocusLock from 'react-focus-lock';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import type { PanelProps } from './types';
import { PanelHeader } from './PanelHeader';
import { PanelBackdrop } from './PanelBackdrop';

/**
 * Panel Component
 *
 * Slide-in overlay panel with backdrop and focus trap.
 * Used for memory browser, settings, filters, etc.
 *
 * Animation: translateX(100%) → 0 (right), translateX(-100%) → 0 (left)
 * Duration: 200ms ease-out
 *
 * @example
 * ```tsx
 * <Panel
 *   isOpen={isMemoryPanelOpen}
 *   onClose={closeMemoryPanel}
 *   title="Memory Graph"
 *   position="right"
 * >
 *   <MemoryBrowser />
 * </Panel>
 * ```
 */

const panelVariants = cva(
  // Base styles (mobile-first: full-screen overlay)
  [
    'fixed z-50',
    'flex flex-col',
    'transition-transform duration-200 ease-out',
    // Glassmorphic background
    'bg-surface/90 backdrop-blur-2xl',
    'border-border',
    // Shadow
    'shadow-2xl',
    // Mobile: full-screen (no slide-in, just fade)
    'inset-0',
    // Tablet+: slide-in panel
    'md:inset-auto',
  ],
  {
    variants: {
      position: {
        left: [
          // Tablet+: slide-in from left
          'md:left-0 md:top-0 md:bottom-0',
          'md:border-r',
          'md:translate-x-0',
        ],
        right: [
          // Tablet+: slide-in from right
          'md:right-0 md:top-0 md:bottom-0',
          'md:border-l',
          'md:translate-x-0',
        ],
        top: [
          // Tablet+: slide-in from top
          'md:top-0 md:left-0 md:right-0',
          'md:border-b',
          'md:translate-y-0',
        ],
        bottom: [
          // Tablet+: slide-in from bottom
          'md:bottom-0 md:left-0 md:right-0',
          'md:border-t',
          'md:translate-y-0',
        ],
      },
    },
    defaultVariants: {
      position: 'right',
    },
  },
);

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      isOpen,
      onClose,
      position = 'right',
      width = '400px',
      height = '300px',
      showBackdrop = true,
      closeOnBackdropClick = true,
      title,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    // Handle Escape key to close panel
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        // Prevent body scroll when panel is open
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }, [isOpen, onClose]);

    // Don't render if closed (improves performance)
    if (!isOpen) return null;

    const handleBackdropClick = () => {
      if (closeOnBackdropClick) {
        onClose();
      }
    };

    // Determine transform for closed state
    // Mobile: no transform (fade only via backdrop)
    // Tablet+: slide-in transforms
    const getTransform = () => {
      if (!isOpen) {
        // On mobile, panel is hidden via display (return null above)
        // On tablet+, use slide transforms
        switch (position) {
          case 'left':
            return 'translateX(-100%)';
          case 'right':
            return 'translateX(100%)';
          case 'top':
            return 'translateY(-100%)';
          case 'bottom':
            return 'translateY(100%)';
        }
      }
      return 'translate(0)';
    };

    // Responsive width/height classes
    // Mobile: inset-0 (full-screen)
    // Tablet+: custom sizing
    const responsiveSizeClass =
      position === 'left' || position === 'right'
        ? 'w-full h-full md:w-auto md:h-auto' // Mobile full-screen, tablet+ custom
        : 'w-full h-full md:w-auto md:h-auto';

    return (
      <>
        {/* Backdrop */}
        {showBackdrop && <PanelBackdrop isVisible={isOpen} onClick={handleBackdropClick} />}

        {/* Panel */}
        <FocusLock returnFocus disabled={!isOpen}>
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Panel'}
            data-state={isOpen ? 'open' : 'closed'}
            className={cn(panelVariants({ position }), responsiveSizeClass, className)}
            style={{
              // Apply custom width/height only on tablet+ (via maxWidth/maxHeight)
              ...(position === 'left' || position === 'right'
                ? { maxWidth: `min(${width}, 100vw)` }
                : { maxHeight: `min(${height}, 100vh)` }),
              // Tablet+ slide-in transform (mobile doesn't slide)
              transform: window.innerWidth >= 768 ? getTransform() : undefined,
            }}
            {...props}
          >
            {/* Header (if title provided) */}
            {title && <PanelHeader title={title} onClose={onClose} />}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </div>
        </FocusLock>
      </>
    );
  },
);

Panel.displayName = 'Panel';

export type { PanelProps };
