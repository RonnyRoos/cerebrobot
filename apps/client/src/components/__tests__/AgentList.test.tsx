/**
 * AgentList Component Tests
 *
 * TDD: Written FIRST before implementation
 * Tests deterministic UI rendering of agent list
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentList } from '../AgentList.js';
import type { AgentListItem } from '@cerebrobot/chat-shared';

describe('AgentList', () => {
  describe('Empty State', () => {
    it('should display empty state when no agents exist', () => {
      const onNewAgent = vi.fn();
      const onEditAgent = vi.fn();
      const onDeleteAgent = vi.fn();
      render(
        <AgentList
          agents={[]}
          onNewAgent={onNewAgent}
          onEditAgent={onEditAgent}
          onDeleteAgent={onDeleteAgent}
        />,
      );

      // Should show empty state message
      expect(screen.getByText(/no agents found/i)).toBeInTheDocument();

      // Should show "New Agent" button
      expect(screen.getByRole('button', { name: /new agent/i })).toBeInTheDocument();
    });
  });

  describe('Agent List Rendering', () => {
    it('should render list of agents with metadata', () => {
      const onNewAgent = vi.fn();
      const onEditAgent = vi.fn();
      const onDeleteAgent = vi.fn();
      const agents: AgentListItem[] = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Test Agent 1',
          createdAt: '2025-10-31T10:00:00.000Z',
          updatedAt: '2025-10-31T11:00:00.000Z',
          autonomyEnabled: false,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Test Agent 2',
          createdAt: '2025-10-31T12:00:00.000Z',
          updatedAt: '2025-10-31T13:00:00.000Z',
          autonomyEnabled: true,
        },
      ];

      render(
        <AgentList
          agents={agents}
          onNewAgent={onNewAgent}
          onEditAgent={onEditAgent}
          onDeleteAgent={onDeleteAgent}
        />,
      );

      // Should render both agent names
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();

      // Should display metadata (autonomy status)
      const autonomyBadges = screen.getAllByText(/autonomy/i);
      expect(autonomyBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('should display agent count', () => {
      const onNewAgent = vi.fn();
      const onEditAgent = vi.fn();
      const onDeleteAgent = vi.fn();
      const agents: AgentListItem[] = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Test Agent 1',
          createdAt: '2025-10-31T10:00:00.000Z',
          updatedAt: '2025-10-31T11:00:00.000Z',
          autonomyEnabled: false,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Test Agent 2',
          createdAt: '2025-10-31T12:00:00.000Z',
          updatedAt: '2025-10-31T13:00:00.000Z',
          autonomyEnabled: true,
        },
      ];

      render(
        <AgentList
          agents={agents}
          onNewAgent={onNewAgent}
          onEditAgent={onEditAgent}
          onDeleteAgent={onDeleteAgent}
        />,
      );

      // Should show agent count
      expect(screen.getByText(/2 agents/i)).toBeInTheDocument();
    });
  });
});
