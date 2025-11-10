/**
 * TypeScript Contracts for Badge Component
 * 
 * Location: packages/ui/src/components/badge/
 * Purpose: Small status/count indicator (for notifications, memory updates, etc.)
 * 
 * Component:
 * - Badge: Status indicator pill
 */

import { ReactNode } from 'react';

// ============================================================================
// Badge Component
// ============================================================================

/**
 * Badge component props
 * 
 * Small pill-shaped indicator for counts, status, labels.
 * Used for unread counts, memory updates, agent status, etc.
 * 
 * @example
 * ```tsx
 * <Badge variant="default">5</Badge>
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="sm">Beta</Badge>
 * <Badge variant="error">Failed</Badge>
 * ```
 */
export interface BadgeProps {
  /** 
   * Badge content (text or number).
   * Can also include icons.
   */
  children: ReactNode;

  /** 
   * Visual variant (color scheme).
   * - default: Purple (accent-primary)
   * - success: Green
   * - warning: Yellow
   * - error: Red
   * - info: Blue
   * @default 'default'
   */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';

  /** 
   * Size variant.
   * - sm: 6px padding, 12px font
   * - md: 8px padding, 14px font
   * - lg: 12px padding, 16px font
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /** 
   * Additional CSS classes for customization.
   */
  className?: string;
}

// ============================================================================
// Design Token Contracts
// ============================================================================

/**
 * Badge design tokens
 * 
 * Used in packages/ui/src/components/badge.tsx (CVA variants)
 */
export interface BadgeVariants {
  /** 
   * Default variant (purple, accent-primary).
   * Background: accent-primary/10
   * Border: accent-primary/30
   * Text: accent-primary
   */
  default: {
    background: string; // 'bg-accent-primary/10'
    border: string; // 'border-accent-primary/30'
    text: string; // 'text-accent-primary'
  };

  /** 
   * Success variant (green).
   * Background: green-500/10
   * Border: green-500/30
   * Text: green-400
   */
  success: {
    background: string; // 'bg-green-500/10'
    border: string; // 'border-green-500/30'
    text: string; // 'text-green-400'
  };

  /** 
   * Warning variant (yellow).
   * Background: yellow-500/10
   * Border: yellow-500/30
   * Text: yellow-400
   */
  warning: {
    background: string; // 'bg-yellow-500/10'
    border: string; // 'border-yellow-500/30'
    text: string; // 'text-yellow-400'
  };

  /** 
   * Error variant (red).
   * Background: red-500/10
   * Border: red-500/30
   * Text: red-400
   */
  error: {
    background: string; // 'bg-red-500/10'
    border: string; // 'border-red-500/30'
    text: string; // 'text-red-400'
  };

  /** 
   * Info variant (blue).
   * Background: blue-500/10
   * Border: blue-500/30
   * Text: blue-400
   */
  info: {
    background: string; // 'bg-blue-500/10'
    border: string; // 'border-blue-500/30'
    text: string; // 'text-blue-400'
  };
}

/**
 * Badge size variants
 * 
 * Used in packages/ui/src/components/badge.tsx (CVA variants)
 */
export interface BadgeSizeVariants {
  /** 
   * Small size.
   * Padding: 6px (1.5)
   * Font: 12px (xs)
   */
  sm: {
    padding: string; // 'px-1.5 py-0.5'
    fontSize: string; // 'text-xs'
  };

  /** 
   * Medium size (default).
   * Padding: 8px (2)
   * Font: 14px (sm)
   */
  md: {
    padding: string; // 'px-2 py-1'
    fontSize: string; // 'text-sm'
  };

  /** 
   * Large size.
   * Padding: 12px (3)
   * Font: 16px (base)
   */
  lg: {
    padding: string; // 'px-3 py-1.5'
    fontSize: string; // 'text-base'
  };
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Badge usage in sidebar navigation
 * 
 * @example
 * ```tsx
 * <SidebarItem 
 *   icon="💬" 
 *   label="Threads"
 *   badge={<Badge variant="info" size="sm">5</Badge>}
 * />
 * ```
 */
export type SidebarBadgeUsage = BadgeProps;

/**
 * Badge usage in chat messages (memory updates)
 * 
 * @example
 * ```tsx
 * <MessageBubble>
 *   <Text>Added new context about user preferences</Text>
 *   <Badge variant="success" size="sm">Memory Updated</Badge>
 * </MessageBubble>
 * ```
 */
export type MemoryUpdateBadgeUsage = BadgeProps;

/**
 * Badge usage in agent status
 * 
 * @example
 * ```tsx
 * <AgentCard>
 *   <Text>Code Assistant</Text>
 *   <Badge variant="success">Active</Badge>
 * </AgentCard>
 * ```
 */
export type AgentStatusBadgeUsage = BadgeProps;
