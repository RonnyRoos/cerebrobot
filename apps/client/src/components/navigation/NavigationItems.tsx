import { MessageSquare, Bot, Brain, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SidebarItem } from '@workspace/ui';

/**
 * Navigation Items Configuration
 *
 * Defines the 4 core navigation items for Cerebrobot:
 * - Threads (conversations)
 * - Agents (LLM agent management)
 * - Memory (knowledge graph inspection)
 * - Settings (configuration)
 */

export interface NavigationItemConfig {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Lucide icon component */
  IconComponent: typeof MessageSquare;
  /** Optional badge count (e.g., unread threads) */
  badge?: number;
}

export const NAVIGATION_ITEMS: NavigationItemConfig[] = [
  {
    label: 'Threads',
    href: '/threads',
    IconComponent: MessageSquare,
  },
  {
    label: 'Agents',
    href: '/agents',
    IconComponent: Bot,
  },
  {
    label: 'Memory',
    href: '/memory',
    IconComponent: Brain,
  },
  {
    label: 'Settings',
    href: '/settings',
    IconComponent: Settings,
  },
];

/**
 * NavigationItems Component
 *
 * Renders the sidebar navigation items using the Sidebar design library component.
 * Integrates with React Router for navigation.
 *
 * @param props.activeRoute - Current active route path
 */
interface NavigationItemsProps {
  activeRoute: string;
}

export function NavigationItems({ activeRoute }: NavigationItemsProps) {
  const navigate = useNavigate();

  return (
    <>
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.IconComponent;
        return (
          <SidebarItem
            key={item.href}
            icon={<Icon size={20} />}
            label={item.label}
            active={activeRoute === item.href}
            badge={item.badge}
            onClick={() => navigate(item.href)}
          />
        );
      })}
    </>
  );
}
