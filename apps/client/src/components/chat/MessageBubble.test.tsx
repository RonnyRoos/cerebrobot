import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';

describe('MessageBubble', () => {
  describe('user messages', () => {
    it('should render user gradient background', () => {
      const { container } = render(
        <MessageBubble messageType="user" senderName="You">
          Hello world
        </MessageBubble>,
      );

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('from-purple-500/20');
      expect(bubble.className).toContain('to-pink-500/20');
      expect(bubble.className).toContain('border-accent-primary/30');
    });

    it('should apply right alignment for user messages', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('ml-12');
      expect(bubble.className).not.toContain('mr-12');
    });

    it('should apply purple glow on hover for user messages', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('hover:shadow-glow-purple');
    });
  });

  describe('agent messages', () => {
    it('should render agent gradient background', () => {
      const { container } = render(
        <MessageBubble messageType="agent" senderName="Agent">
          Hello world
        </MessageBubble>,
      );

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('from-blue-500/15');
      expect(bubble.className).toContain('to-purple-500/15');
      expect(bubble.className).toContain('border-accent-secondary/20');
    });

    it('should apply left alignment for agent messages', () => {
      const { container } = render(<MessageBubble messageType="agent">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('mr-12');
      expect(bubble.className).not.toContain('ml-12');
    });

    it('should apply blue glow on hover for agent messages', () => {
      const { container } = render(<MessageBubble messageType="agent">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('hover:shadow-glow-blue');
    });
  });

  describe('glow intensity', () => {
    it('should apply low glow intensity', () => {
      const { container } = render(
        <MessageBubble messageType="user" glowIntensity="low">
          Hello
        </MessageBubble>,
      );

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('hover:shadow-glow-purple/40');
    });

    it('should apply medium glow intensity by default', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('hover:shadow-glow-purple');
    });

    it('should apply high glow intensity', () => {
      const { container } = render(
        <MessageBubble messageType="user" glowIntensity="high">
          Hello
        </MessageBubble>,
      );

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('hover:shadow-glow-purple/80');
    });
  });

  describe('animations', () => {
    it('should apply fade-in animation on render', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('animate-fade-in');
    });

    it('should apply transition for smooth hover effects', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('transition-all');
      expect(bubble.className).toContain('duration-200');
      expect(bubble.className).toContain('ease-out');
    });
  });

  describe('content rendering', () => {
    it('should render message content', () => {
      render(<MessageBubble messageType="user">Hello world</MessageBubble>);

      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('should render sender name when provided', () => {
      render(
        <MessageBubble messageType="user" senderName="Alice">
          Hello
        </MessageBubble>,
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should not render sender name when not provided', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const senderElement = container.querySelector('.font-semibold');
      expect(senderElement).toBeNull();
    });
  });

  describe('metadata display', () => {
    it('should render latency when provided', () => {
      render(
        <MessageBubble messageType="agent" senderName="Agent" latencyMs={250}>
          Hello
        </MessageBubble>,
      );

      expect(screen.getByLabelText('latency')).toHaveTextContent('0s');
    });

    it('should not render latency when not provided', () => {
      render(<MessageBubble messageType="agent">Hello</MessageBubble>);

      expect(screen.queryByLabelText('latency')).toBeNull();
    });

    it('should render token usage when provided', () => {
      render(
        <MessageBubble
          messageType="agent"
          senderName="Agent"
          tokenUsage={{ utilisationPct: 75, recentTokens: 1500, budget: 2000 }}
        >
          Hello
        </MessageBubble>,
      );

      const tokenUsage = screen.getByLabelText('token usage');
      expect(tokenUsage).toHaveTextContent('1,500tok (75%)');
    });

    it('should not render token usage when not provided', () => {
      render(<MessageBubble messageType="agent">Hello</MessageBubble>);

      expect(screen.queryByLabelText('token usage')).toBeNull();
    });
  });

  describe('streaming status', () => {
    it('should render streaming indicator when status is streaming', () => {
      render(
        <MessageBubble messageType="agent" senderName="Agent" status="streaming">
          Hello
        </MessageBubble>,
      );

      expect(screen.getByLabelText('streaming')).toHaveTextContent('Streaming…');
    });

    it('should not render streaming indicator when status is complete', () => {
      render(
        <MessageBubble messageType="agent" status="complete">
          Hello
        </MessageBubble>,
      );

      expect(screen.queryByLabelText('streaming')).toBeNull();
    });

    it('should not render streaming indicator when no status provided', () => {
      render(<MessageBubble messageType="agent">Hello</MessageBubble>);

      expect(screen.queryByLabelText('streaming')).toBeNull();
    });
  });

  describe('styling', () => {
    it('should apply glassmorphic backdrop blur', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('backdrop-blur-md');
    });

    it('should apply rounded corners', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('rounded-2xl');
    });

    it('should apply padding and border', () => {
      const { container } = render(<MessageBubble messageType="user">Hello</MessageBubble>);

      const bubble = container.firstChild as HTMLElement;
      expect(bubble.className).toContain('border');
      expect(bubble.className).toContain('rounded-2xl');
    });
  });
});
