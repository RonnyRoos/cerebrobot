import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ThreadCard } from '../ThreadCard';
import type { ThreadMetadata } from '@cerebrobot/chat-shared';

describe('ThreadCard', () => {
  const mockThread: ThreadMetadata = {
    threadId: 'thread-1',
    agentId: 'agent-1',
    userId: 'user-1',
    title: 'Test Conversation',
    lastMessage: 'This is a test message that should be displayed in the preview',
    lastMessageRole: 'user',
    messageCount: 5,
    isEmpty: false,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T14:30:00Z'),
  };

  it('should render thread title', () => {
    render(<ThreadCard thread={mockThread} isActive={false} onClick={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /test conversation/i })).toBeInTheDocument();
  });

  it('should render agent badge when agentName provided', () => {
    render(<ThreadCard thread={mockThread} agentName="Karen" isActive={false} onClick={vi.fn()} />);
    expect(screen.getByText('Karen')).toBeInTheDocument();
  });

  it('should not render agent badge when agentName not provided', () => {
    render(<ThreadCard thread={mockThread} isActive={false} onClick={vi.fn()} />);
    expect(screen.queryByText(/karen/i)).not.toBeInTheDocument();
  });

  it('should render message preview with role prefix', () => {
    render(<ThreadCard thread={mockThread} isActive={false} onClick={vi.fn()} />);
    expect(screen.getByText(/you:/i)).toBeInTheDocument();
    // Message text is truncated with CSS (truncate class), check for partial match
    const preview = screen.getByText(/you:/i).parentElement;
    expect(preview?.textContent).toContain('This is a test message');
  });

  it('should truncate long message previews at 100 characters', () => {
    const longMessage = 'a'.repeat(150);
    const longMessageThread: ThreadMetadata = {
      ...mockThread,
      lastMessage: longMessage,
    };

    render(<ThreadCard thread={longMessageThread} isActive={false} onClick={vi.fn()} />);
    const preview = screen.getByText(/you:/i).parentElement;
    expect(preview?.textContent).toContain('...');
    expect(preview?.textContent?.length).toBeLessThan(longMessage.length);
  });

  it('should not render message preview when thread is empty', () => {
    const emptyThread: ThreadMetadata = {
      ...mockThread,
      isEmpty: true,
      lastMessage: '',
      messageCount: 0,
    };

    render(<ThreadCard thread={emptyThread} isActive={false} onClick={vi.fn()} />);
    expect(screen.queryByText(/you:/i)).not.toBeInTheDocument();
  });

  it('should render timestamp in YYYY-MM-DD format', () => {
    render(<ThreadCard thread={mockThread} isActive={false} onClick={vi.fn()} />);
    // Timestamp is displayed in ISO date format (YYYY-MM-DD)
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });

  it('should render message count badge', () => {
    render(<ThreadCard thread={mockThread} isActive={false} onClick={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument(); // Badge shows count
    // Note: Compact design doesn't include "messages" label text
  });

  it('should render singular count of 1', () => {
    const singleMessageThread: ThreadMetadata = {
      ...mockThread,
      messageCount: 1,
    };

    render(<ThreadCard thread={singleMessageThread} isActive={false} onClick={vi.fn()} />);
    // Check that badge shows "1"
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<ThreadCard thread={mockThread} isActive={false} onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /open conversation: test conversation/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply active gradient when isActive is true', () => {
    const { container } = render(
      <ThreadCard thread={mockThread} isActive={true} onClick={vi.fn()} />,
    );

    // Check for gradient accent bar (active state has from-purple-500)
    const accentBar = container.querySelector('.bg-gradient-to-b.from-purple-500');
    expect(accentBar).toBeTruthy();
  });

  it('should apply inactive gradient when isActive is false', () => {
    const { container } = render(
      <ThreadCard thread={mockThread} isActive={false} onClick={vi.fn()} />,
    );

    // Check for gradient accent bar (inactive state has from-blue-500/50)
    const accentBar = container.querySelector('.bg-gradient-to-b');
    expect(accentBar).toBeTruthy();
  });

  it('should have glassmorphic styling', () => {
    const { container } = render(
      <ThreadCard thread={mockThread} isActive={false} onClick={vi.fn()} />,
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-surface/60');
    expect(button).toHaveClass('backdrop-blur-xl');
    expect(button).toHaveClass('rounded-lg');
  });

  it('should have proper ARIA label', () => {
    render(<ThreadCard thread={mockThread} isActive={false} onClick={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /open conversation: test conversation/i }),
    ).toBeInTheDocument();
  });
});
