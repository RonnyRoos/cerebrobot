import * as React from 'react';
import { cn } from '../utils/cn';

export interface TooltipProps {
  /** Tooltip content text */
  content: string;
  /** Child element that triggers the tooltip */
  children: React.ReactElement;
  /** Position of tooltip relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tooltip Component
 *
 * Lightweight, accessible tooltip component for the Neon Flux design system.
 * Shows helpful text on hover/focus with keyboard support.
 *
 * Features:
 * - Keyboard accessible (shows on focus)
 * - Touch-friendly (tap to toggle on mobile)
 * - ARIA compliant (uses aria-describedby)
 * - Automatic positioning
 * - Theme-aware styling
 *
 * Example:
 * ```tsx
 * <Tooltip content="Maximum number of messages kept in recent conversation window">
 *   <Input label="Hot Path Limit" name="hotPathLimit" />
 * </Tooltip>
 * ```
 */
export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, position = 'top', className }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [isTouchDevice, setIsTouchDevice] = React.useState(false);
    const tooltipId = React.useId();

    // Detect touch device
    React.useEffect(() => {
      setIsTouchDevice('ontouchstart' in window);
    }, []);

    const handleMouseEnter = () => {
      if (!isTouchDevice) {
        setIsVisible(true);
      }
    };

    const handleMouseLeave = () => {
      if (!isTouchDevice) {
        setIsVisible(false);
      }
    };

    const handleFocus = () => {
      setIsVisible(true);
    };

    const handleBlur = () => {
      setIsVisible(false);
    };

    const handleClick = (e: React.MouseEvent) => {
      if (isTouchDevice) {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }
    };

    // Position styles
    const positionStyles = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    // Arrow styles
    const arrowStyles = {
      top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-l-transparent border-r-transparent border-b-transparent border-t-bg-elevated',
      bottom:
        'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l-transparent border-r-transparent border-t-transparent border-b-bg-elevated',
      left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t-transparent border-b-transparent border-r-transparent border-l-bg-elevated',
      right:
        'right-full top-1/2 -translate-y-1/2 -mr-1 border-t-transparent border-b-transparent border-l-transparent border-r-bg-elevated',
    };

    // Clone child and add event handlers + aria-describedby
    const child = React.cloneElement(children, {
      onMouseEnter: (e: React.MouseEvent) => {
        handleMouseEnter();
        children.props.onMouseEnter?.(e);
      },
      onMouseLeave: (e: React.MouseEvent) => {
        handleMouseLeave();
        children.props.onMouseLeave?.(e);
      },
      onFocus: (e: React.FocusEvent) => {
        handleFocus();
        children.props.onFocus?.(e);
      },
      onBlur: (e: React.FocusEvent) => {
        handleBlur();
        children.props.onBlur?.(e);
      },
      onClick: (e: React.MouseEvent) => {
        handleClick(e);
        children.props.onClick?.(e);
      },
      'aria-describedby': isVisible ? tooltipId : undefined,
    });

    return (
      <div ref={ref} className="relative inline-block">
        {child}
        {isVisible && (
          <div
            id={tooltipId}
            role="tooltip"
            className={cn(
              'absolute z-50 px-3 py-2 text-xs font-medium text-text-primary',
              'bg-bg-elevated border border-border-default rounded-md shadow-lg',
              'max-w-xs whitespace-normal break-words',
              'animate-in fade-in-0 zoom-in-95',
              positionStyles[position],
              className,
            )}
          >
            {content}
            {/* Tooltip arrow */}
            <div
              className={cn('absolute w-0 h-0 border-4', arrowStyles[position])}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    );
  },
);

Tooltip.displayName = 'Tooltip';
