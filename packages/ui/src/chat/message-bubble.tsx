import {
  forwardRef,
  Component,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils/cn';
import { defaultMarkdownComponents } from '../utils/markdown';
import { Timestamp } from './timestamp';

// Error Boundary for markdown rendering
class MarkdownErrorBoundary extends Component<
  { children: ReactNode; content: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; content: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Markdown rendering error:', error, errorInfo);
  }

  copyToClipboard = () => {
    navigator.clipboard.writeText(this.props.content).catch(console.error);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-sm">
          <p className="mb-2">Message failed to render</p>
          <button
            onClick={this.copyToClipboard}
            className="text-link hover:text-link-hover underline text-xs"
          >
            Copy raw content
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const messageBubbleVariants = cva(
  'rounded-xl px-5 py-4 max-w-[65%] break-words backdrop-blur-md border shadow-lg animate-message-appear',
  {
    variants: {
      sender: {
        user: 'ml-auto bg-message-user-bg/20 text-message-user-text border-message-user-bg/30 shadow-glow-purple',
        agent:
          'mr-auto bg-message-agent-bg/15 text-message-agent-text border-message-agent-bg/20 shadow-glow-blue',
      },
    },
    defaultVariants: {
      sender: 'agent',
    },
  },
);

export interface MessageBubbleProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'content'>,
    VariantProps<typeof messageBubbleVariants> {
  /**
   * Markdown-formatted message content.
   * Supports GFM: headings, lists, links, code blocks, etc.
   */
  content: string;

  /**
   * Message sender type. Determines visual styling and alignment.
   * - user: right-aligned, user color scheme
   * - agent: left-aligned, agent color scheme
   */
  sender: 'user' | 'agent';

  /**
   * When the message was sent. Used for timestamp display.
   */
  timestamp: Date;

  /**
   * Avatar image URL or null for initials fallback.
   * If undefined, avatar is not displayed.
   */
  avatar?: string | null;

  /**
   * Override default Tailwind classes for custom styling.
   * Merged with variant classes using cn() utility.
   */
  className?: string;
}

export type MessageBubbleElement = ElementRef<'div'>;

export const MessageBubble = forwardRef<MessageBubbleElement, MessageBubbleProps>(
  ({ content, sender, timestamp, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(messageBubbleVariants({ sender }), className)} {...props}>
        <MarkdownErrorBoundary content={content}>
          <Markdown
            className="prose-chat"
            remarkPlugins={[remarkGfm]}
            components={defaultMarkdownComponents}
          >
            {content}
          </Markdown>
        </MarkdownErrorBoundary>
        <Timestamp date={timestamp} className="block mt-1 text-xs" />
      </div>
    );
  },
);

MessageBubble.displayName = 'MessageBubble';
