import { ReactNode } from 'react';

/**
 * Sidebar container props
 */
export interface SidebarProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  position?: 'left' | 'right';
  children: ReactNode;
  className?: string;
}

/**
 * Sidebar item props
 */
export interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
  className?: string;
}

/**
 * Sidebar toggle button props
 */
export interface SidebarToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}
