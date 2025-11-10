/**
 * TypeScript Contracts for Sidebar Component Family
 * 
 * Location: packages/ui/src/components/sidebar/
 * Purpose: Collapsible navigation sidebar (48px → 280px)
 * 
 * Components:
 * - Sidebar: Container with expand/collapse logic
 * - SidebarItem: Individual navigation item
 * - SidebarToggle: Collapse/expand button
 */

import { ReactNode } from 'react';

// ============================================================================
// Sidebar Container Component
// ============================================================================

/**
 * Sidebar component props
 * 
 * Controls the collapsible sidebar navigation.
 * Supports both hover-to-expand (temporary) and click-to-expand (sticky).
 * 
 * @example
 * ```tsx
 * <Sidebar 
 *   isExpanded={isSidebarExpanded} 
 *   onToggle={() => toggleSidebar()}
 * >
 *   <SidebarItem icon="💬" label="Threads" active />
 *   <SidebarItem icon="🤖" label="Agents" />
 *   <SidebarItem icon="🧠" label="Memory" />
 * </Sidebar>
 * ```
 */
export interface SidebarProps {
  /** 
   * Controlled expanded state for sticky expansion (click-based).
   * Hover expansion is handled internally and does not affect this prop.
   * @default false
   */
  isExpanded?: boolean;

  /** 
   * Callback when toggle button clicked (sticky expansion).
   * Called with new expanded state.
   */
  onToggle?: () => void;

  /** 
   * Width when collapsed (icon-only).
   * @default 48
   */
  collapsedWidth?: number;

  /** 
   * Width when expanded (icons + labels).
   * @default 280
   */
  expandedWidth?: number;

  /** 
   * Position of sidebar on screen.
   * @default 'left'
   */
  position?: 'left' | 'right';

  /** 
   * Children (SidebarItem components).
   * Each child should be a SidebarItem for proper styling.
   */
  children: ReactNode;

  /** 
   * Additional CSS classes for customization.
   * Applied to the sidebar container.
   */
  className?: string;
}

// ============================================================================
// Sidebar Item Component
// ============================================================================

/**
 * Sidebar item props
 * 
 * Individual navigation item with icon, label, and optional badge.
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
export interface SidebarItemProps {
  /** 
   * Icon (emoji or React component).
   * Visible in both collapsed and expanded states.
   * Recommended: 24px size for consistency.
   */
  icon: ReactNode;

  /** 
   * Label text (hidden when sidebar collapsed).
   * Fades in/out with opacity transition (200ms).
   */
  label: string;

  /** 
   * Active state (highlights current route).
   * Applies purple glow effect (box-shadow).
   * @default false
   */
  active?: boolean;

  /** 
   * Click handler for navigation.
   * Called when item clicked (keyboard or mouse).
   */
  onClick?: () => void;

  /** 
   * Badge count (optional, displayed as small pill).
   * Useful for unread counts, notifications.
   * @example 5 unread messages
   */
  badge?: number;

  /** 
   * Additional CSS classes for customization.
   * Applied to the item container.
   */
  className?: string;
}

// ============================================================================
// Sidebar Toggle Component
// ============================================================================

/**
 * Sidebar toggle button props
 * 
 * Collapse/expand button for sticky expansion.
 * Typically rendered at bottom of sidebar.
 * 
 * @example
 * ```tsx
 * <SidebarToggle 
 *   isExpanded={isExpanded} 
 *   onToggle={handleToggle}
 * />
 * ```
 */
export interface SidebarToggleProps {
  /** 
   * Current expanded state.
   * Controls icon rotation (chevron left/right).
   */
  isExpanded: boolean;

  /** 
   * Click handler for toggle action.
   * Should update parent state (controlled component).
   */
  onToggle: () => void;

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// State Management Contracts
// ============================================================================

/**
 * Sidebar state (managed by useSidebarState hook)
 * 
 * Used in apps/client/src/hooks/useSidebarState.ts
 */
export interface NavigationState {
  /** Current active route */
  activeRoute: 'threads' | 'agents' | 'memory' | 'settings';

  /** Whether sidebar is expanded (sticky click-based expansion) */
  isSidebarExpanded: boolean;

  /** Timestamps of last visit per route */
  lastVisited: Record<string, Date>;
}

/**
 * Sidebar state hook return value
 * 
 * Used by NavigationSidebar component in apps/client/
 */
export interface UseSidebarStateReturn {
  /** Current active route */
  activeRoute: 'threads' | 'agents' | 'memory' | 'settings';

  /** Whether sidebar is expanded (sticky) */
  isSidebarExpanded: boolean;

  /** Navigate to a route (updates activeRoute, persists to localStorage) */
  navigate: (route: string) => void;

  /** Toggle sidebar expanded state (sticky) */
  toggleSidebar: () => void;

  /** Expand sidebar (sticky) */
  expandSidebar: () => void;

  /** Collapse sidebar (sticky) */
  collapseSidebar: () => void;
}

// ============================================================================
// Design Token Contracts
// ============================================================================

/**
 * Sidebar design tokens
 * 
 * Used in packages/ui/tailwind.config.ts
 */
export interface SidebarTokens {
  /** Collapsed width (icon-only) */
  collapsedWidth: string; // '48px'

  /** Expanded width (icons + labels) */
  expandedWidth: string; // '280px'

  /** Background (glassmorphic) */
  background: string; // 'rgba(26, 26, 46, 0.8)'

  /** Backdrop blur */
  backdropBlur: string; // '24px'

  /** Border color */
  border: string; // 'rgba(255, 255, 255, 0.1)'

  /** Border width */
  borderWidth: string; // '1px'

  /** Item hover background */
  itemHoverBg: string; // 'hsl(var(--surface))'

  /** Item active background */
  itemActiveBg: string; // 'hsl(var(--accent-primary) / 0.1)'

  /** Item active border */
  itemActiveBorder: string; // 'hsl(var(--accent-primary))'

  /** Item active shadow (purple glow) */
  itemActiveShadow: string; // 'var(--shadow-glow-purple)'

  /** Expand transition duration */
  expandDuration: string; // '200ms'

  /** Expand transition easing */
  expandEasing: string; // 'cubic-bezier(0.4, 0, 0.2, 1)'
}
