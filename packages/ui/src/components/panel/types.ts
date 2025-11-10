/**
 * TypeScript types for Panel component family
 */

import { ReactNode } from 'react';

export interface PanelProps {
  /** Whether panel is visible */
  isOpen: boolean;

  /** Callback when panel closed */
  onClose: () => void;

  /** Panel position on screen */
  position?: 'left' | 'right' | 'top' | 'bottom';

  /** Panel width (for left/right positioning) */
  width?: string;

  /** Panel height (for top/bottom positioning) */
  height?: string;

  /** Show dimmed backdrop overlay */
  showBackdrop?: boolean;

  /** Close panel when backdrop clicked */
  closeOnBackdropClick?: boolean;

  /** Title for panel header */
  title?: string;

  /** Children (panel content) */
  children: ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export interface PanelHeaderProps {
  /** Header title text */
  title: string;

  /** Close button click handler */
  onClose: () => void;

  /** Additional CSS classes */
  className?: string;
}

export interface PanelBackdropProps {
  /** Whether backdrop is visible */
  isVisible: boolean;

  /** Backdrop click handler */
  onClick?: () => void;

  /** Additional CSS classes */
  className?: string;
}
