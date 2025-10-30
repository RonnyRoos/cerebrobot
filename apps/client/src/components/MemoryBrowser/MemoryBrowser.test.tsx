/**
 * MemoryBrowser Component Tests
 *
 * Simple unit tests for deterministic UI behavior.
 * Following best practices: test only what's deterministic, no pseudo-integration tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryBrowser } from './MemoryBrowser.js';
import type { MemoryStatsResponse } from '@cerebrobot/chat-shared';

describe('MemoryBrowser', () => {
  // Clear localStorage before each test to ensure consistent state
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Capacity Warning Banner (T080)', () => {
    it('should display warning banner when capacity >= 80%', async () => {
      const user = userEvent.setup();
      const stats: MemoryStatsResponse = {
        count: 800,
        maxMemories: 1000,
        capacityPercent: 0.8, // 80%
        warningThreshold: 0.8,
        showWarning: true,
      };

      render(<MemoryBrowser memories={[]} stats={stats} />);

      // Open the sidebar
      const openButton = screen.getByLabelText('Open memory sidebar');
      await user.click(openButton);

      // Banner should be visible
      expect(screen.getByText(/Memory capacity at 80%/i)).toBeInTheDocument();
      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });

    it('should not display warning banner when capacity < 80%', async () => {
      const user = userEvent.setup();
      const stats: MemoryStatsResponse = {
        count: 500,
        maxMemories: 1000,
        capacityPercent: 0.5, // 50%
        warningThreshold: 0.8,
        showWarning: false,
      };

      render(<MemoryBrowser memories={[]} stats={stats} />);

      // Open the sidebar
      const openButton = screen.getByLabelText('Open memory sidebar');
      await user.click(openButton);

      // Banner should not be visible
      expect(screen.queryByText(/Memory capacity at/i)).not.toBeInTheDocument();
    });

    it('should not display warning banner when stats are null', async () => {
      const user = userEvent.setup();
      render(<MemoryBrowser memories={[]} stats={null} />);

      // Open the sidebar
      const openButton = screen.getByLabelText('Open memory sidebar');
      await user.click(openButton);

      // Banner should not be visible
      expect(screen.queryByText(/Memory capacity at/i)).not.toBeInTheDocument();
    });

    it('should display correct percentage in warning banner', async () => {
      const user = userEvent.setup();
      const stats: MemoryStatsResponse = {
        count: 950,
        maxMemories: 1000,
        capacityPercent: 0.95, // 95%
        warningThreshold: 0.8,
        showWarning: true,
      };

      render(<MemoryBrowser memories={[]} stats={stats} />);

      // Open the sidebar
      const openButton = screen.getByLabelText('Open memory sidebar');
      await user.click(openButton);

      // Should show 95% in the warning
      expect(screen.getByText(/Memory capacity at 95%/i)).toBeInTheDocument();
    });
  });

  describe('Memory Count Display (T078)', () => {
    it('should display memory count when stats are available', async () => {
      const user = userEvent.setup();
      const stats: MemoryStatsResponse = {
        count: 42,
        maxMemories: 1000,
        capacityPercent: 0.042, // 4.2%
        warningThreshold: 0.8,
        showWarning: false,
      };

      render(<MemoryBrowser memories={[]} stats={stats} />);

      // Open the sidebar
      const openButton = screen.getByLabelText('Open memory sidebar');
      await user.click(openButton);

      // Should show count in header
      expect(screen.getByText(/42 memories stored/i)).toBeInTheDocument();
    });

    it('should not display count when stats are null', async () => {
      const user = userEvent.setup();
      render(<MemoryBrowser memories={[]} stats={null} />);

      // Open the sidebar
      const openButton = screen.getByLabelText('Open memory sidebar');
      await user.click(openButton);

      // Should not show count
      expect(screen.queryByText(/memories stored/i)).not.toBeInTheDocument();
    });
  });
});
