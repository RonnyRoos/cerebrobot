import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// Mock useThreads hook BEFORE importing component
vi.mock('../../hooks/useThreads', () => ({
  useThreads: vi.fn(),
}));

// Mock fetch for agent list
global.fetch = vi.fn();

import { ThreadListView } from '../ThreadListView';
import { useThreads } from '../../hooks/useThreads';

describe('ThreadListView', () => {
  const mockOnSelectThread = vi.fn();
  const mockOnNewThread = vi.fn();
  const mockOnExitAgentContext = vi.fn();
  const mockOnRefreshReady = vi.fn();
  const mockRefresh = vi.fn();

  const defaultProps = {
    userId: 'user-1',
    agentContextMode: null,
    onSelectThread: mockOnSelectThread,
    onNewThread: mockOnNewThread,
    onExitAgentContext: mockOnExitAgentContext,
    onRefreshReady: mockOnRefreshReady,
  };

  const mockThreads = [
    {
      threadId: 'thread-1',
      agentId: 'agent-1',
      userId: 'user-1',
      title: 'Test Thread 1',
      lastMessage: 'Hello world',
      lastMessageRole: 'user' as const,
      messageCount: 3,
      isEmpty: false,
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date('2024-01-01T14:00:00Z'),
    },
    {
      threadId: 'thread-2',
      agentId: 'agent-2',
      userId: 'user-1',
      title: 'Test Thread 2',
      lastMessage: 'Goodbye world',
      lastMessageRole: 'assistant' as const,
      messageCount: 5,
      isEmpty: false,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T13:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ agents: [] }),
    } as Response);
  });

  it('should render thread cards when threads exist', () => {
    vi.mocked(useThreads).mockReturnValue({
      threads: mockThreads,
      error: null,
      refresh: mockRefresh,
    });

    render(<ThreadListView {...defaultProps} />);

    expect(screen.getByText('Test Thread 1')).toBeInTheDocument();
    expect(screen.getByText('Test Thread 2')).toBeInTheDocument();
  });

  it('should show empty state when no threads exist', () => {
    vi.mocked(useThreads).mockReturnValue({
      threads: [],
      error: null,
      refresh: mockRefresh,
    });

    render(<ThreadListView {...defaultProps} />);

    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    expect(screen.getByText(/start your first conversation/i)).toBeInTheDocument();
  });

  it('should handle card click', async () => {
    const user = userEvent.setup();
    vi.mocked(useThreads).mockReturnValue({
      threads: mockThreads,
      error: null,
      refresh: mockRefresh,
    });

    render(<ThreadListView {...defaultProps} />);

    const thread1Button = screen.getByRole('button', { name: /open conversation: test thread 1/i });
    await user.click(thread1Button);

    expect(mockOnSelectThread).toHaveBeenCalledWith('thread-1', 'agent-1');
  });

  it('should show error state when error occurs', () => {
    vi.mocked(useThreads).mockReturnValue({
      threads: [],
      error: new Error('Failed to load threads'),
      refresh: mockRefresh,
    });

    render(<ThreadListView {...defaultProps} />);

    expect(screen.getByText(/failed to load conversation threads/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to load threads/i)).toBeInTheDocument();
  });

  it('should expose refresh function to parent', () => {
    vi.mocked(useThreads).mockReturnValue({
      threads: mockThreads,
      error: null,
      refresh: mockRefresh,
    });

    render(<ThreadListView {...defaultProps} />);

    expect(mockOnRefreshReady).toHaveBeenCalledWith(mockRefresh);
  });

  describe('agent filtering', () => {
    const mockOnAgentFilterChange = vi.fn();
    const mockOnClearAgentFilter = vi.fn();

    const mockAgents = [
      { id: 'agent-1', name: 'Agent One' },
      { id: 'agent-2', name: 'Agent Two' },
    ];

    beforeEach(() => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents }),
      } as Response);
    });

    it('should render agent filter dropdown when callbacks provided', async () => {
      vi.mocked(useThreads).mockReturnValue({
        threads: mockThreads,
        error: null,
        refresh: mockRefresh,
      });

      render(
        <ThreadListView
          {...defaultProps}
          onAgentFilterChange={mockOnAgentFilterChange}
          onClearAgentFilter={mockOnClearAgentFilter}
        />,
      );

      // Agent filtering removed in UX redesign (use sidebar navigation instead)
      expect(screen.queryByRole('combobox', { name: /filter by agent/i })).not.toBeInTheDocument();
    });

    it('should not render filter dropdown in agent context mode', () => {
      vi.mocked(useThreads).mockReturnValue({
        threads: mockThreads,
        error: null,
        refresh: mockRefresh,
      });

      render(<ThreadListView {...defaultProps} agentContextMode="agent-1" />);

      expect(screen.queryByRole('combobox', { name: /filter by agent/i })).not.toBeInTheDocument();
    });

    it('should render "← All Threads" button in agent context mode', () => {
      vi.mocked(useThreads).mockReturnValue({
        threads: mockThreads,
        error: null,
        refresh: mockRefresh,
      });

      render(<ThreadListView {...defaultProps} agentContextMode="agent-1" />);

      expect(screen.getByRole('button', { name: /← all threads/i })).toBeInTheDocument();
    });

    it('should call onExitAgentContext when "← All Threads" is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useThreads).mockReturnValue({
        threads: mockThreads,
        error: null,
        refresh: mockRefresh,
      });

      render(<ThreadListView {...defaultProps} agentContextMode="agent-1" />);

      const backButton = screen.getByRole('button', { name: /← all threads/i });
      await user.click(backButton);

      expect(mockOnExitAgentContext).toHaveBeenCalled();
    });
  });
});
