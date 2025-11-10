/**
 * TypeScript Contracts for Panel (Overlay) Component Family
 * 
 * Location: packages/ui/src/components/panel/
 * Purpose: Slide-in overlay panel (400px from right edge)
 * 
 * Components:
 * - Panel: Container with slide-in animation
 * - PanelHeader: Header with title and close button
 * - PanelBackdrop: Dimmed backdrop overlay
 */

import { ReactNode } from 'react';

// ============================================================================
// Panel Container Component
// ============================================================================

/**
 * Panel component props
 * 
 * Slide-in drawer overlay from right edge.
 * Used for memory panel, filters, settings, etc.
 * 
 * @example
 * ```tsx
 * <Panel 
 *   isOpen={isMemoryPanelOpen} 
 *   onClose={closeMemoryPanel}
 *   title="Memory Graph"
 * >
 *   <MemoryBrowser />
 * </Panel>
 * ```
 */
export interface PanelProps {
  /** 
   * Whether panel is visible.
   * Controls slide-in/out animation.
   */
  isOpen: boolean;

  /** 
   * Callback when panel closed.
   * Triggered by backdrop click, X button, or Esc key.
   */
  onClose: () => void;

  /** 
   * Panel position on screen.
   * Determines slide-in direction.
   * @default 'right'
   */
  position?: 'left' | 'right' | 'top' | 'bottom';

  /** 
   * Panel width (for left/right positioning).
   * @default '400px'
   */
  width?: string;

  /** 
   * Panel height (for top/bottom positioning).
   * @default '300px'
   */
  height?: string;

  /** 
   * Show dimmed backdrop overlay.
   * @default true
   */
  showBackdrop?: boolean;

  /** 
   * Close panel when backdrop clicked.
   * @default true
   */
  closeOnBackdropClick?: boolean;

  /** 
   * Title for panel header.
   * If provided, renders PanelHeader component.
   */
  title?: string;

  /** 
   * Children (panel content).
   * Rendered inside panel container.
   */
  children: ReactNode;

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// Panel Header Component
// ============================================================================

/**
 * Panel header props
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
export interface PanelHeaderProps {
  /** 
   * Header title text.
   */
  title: string;

  /** 
   * Close button click handler.
   * Typically calls onClose from parent Panel.
   */
  onClose: () => void;

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// Panel Backdrop Component
// ============================================================================

/**
 * Panel backdrop props
 * 
 * Dimmed backdrop overlay with blur effect.
 * Automatically rendered by Panel if showBackdrop=true.
 * 
 * @example
 * ```tsx
 * <PanelBackdrop 
 *   onClick={handleBackdropClick}
 * />
 * ```
 */
export interface PanelBackdropProps {
  /** 
   * Backdrop click handler.
   * Typically closes panel if closeOnBackdropClick=true.
   */
  onClick?: () => void;

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// State Management Contracts
// ============================================================================

/**
 * Memory panel state (managed by useMemoryPanel hook)
 * 
 * Used in apps/client/src/hooks/useMemoryPanel.ts
 */
export interface MemoryPanelState {
  /** Whether panel is currently visible */
  isOpen: boolean;

  /** Current animation phase */
  animationState: 'opening' | 'open' | 'closing' | 'closed';

  /** Active thread ID (null if no chat active) */
  threadId: string | null;

  /** Whether memory data has been loaded (for lazy loading) */
  hasLoaded: boolean;
}

/**
 * Memory panel hook return value
 * 
 * Used by MemoryPanel component in apps/client/
 */
export interface UseMemoryPanelReturn {
  /** Whether panel is open */
  isOpen: boolean;

  /** Current animation state */
  animationState: 'opening' | 'open' | 'closing' | 'closed';

  /** Whether memory data loaded */
  hasLoaded: boolean;

  /** Open panel (triggers slide-in animation, lazy loads memory) */
  openPanel: () => void;

  /** Close panel (triggers slide-out animation) */
  closePanel: () => void;

  /** Toggle panel open/closed */
  togglePanel: () => void;
}

// ============================================================================
// Design Token Contracts
// ============================================================================

/**
 * Panel design tokens
 * 
 * Used in packages/ui/tailwind.config.ts
 */
export interface PanelTokens {
  /** Default panel width (left/right) */
  defaultWidth: string; // '400px'

  /** Default panel height (top/bottom) */
  defaultHeight: string; // '300px'

  /** Panel background (glassmorphic) */
  background: string; // 'rgba(26, 26, 46, 0.9)'

  /** Panel backdrop blur */
  backdropBlur: string; // '24px'

  /** Backdrop background */
  backdropBackground: string; // 'rgba(0, 0, 0, 0.4)'

  /** Backdrop blur amount */
  backdropBlurAmount: string; // '8px'

  /** Panel border color */
  border: string; // 'rgba(255, 255, 255, 0.1)'

  /** Panel border width */
  borderWidth: string; // '1px'

  /** Panel shadow (left edge) */
  shadow: string; // '-10px 0 50px rgba(0, 0, 0, 0.5)'

  /** Slide transition duration */
  slideDuration: string; // '200ms'

  /** Slide transition easing */
  slideEasing: string; // 'ease-out'

  /** Backdrop fade duration */
  backdropFadeDuration: string; // '150ms'
}
