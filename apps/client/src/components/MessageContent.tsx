import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageContentProps {
  content: string;
  enableMarkdown?: boolean;
}

/**
 * Renders message content with optional markdown formatting
 *
 * Phase 9 Implementation:
 * - Conditionally renders plain text or markdown based on enableMarkdown prop
 * - Uses react-markdown with GFM (GitHub Flavored Markdown) support
 * - Syntax highlighting via rehype-highlight
 */
export function MessageContent({ content, enableMarkdown = false }: MessageContentProps) {
  if (!enableMarkdown) {
    return <>{content}</>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Style code blocks
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          return match ? (
            <code className={className} {...props}>
              {children}
            </code>
          ) : (
            <code className="bg-bg-elevated px-1 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          );
        },
        // Style links
        a: ({ children, ...props }) => (
          <a className="text-accent-primary hover:underline" {...props}>
            {children}
          </a>
        ),
        // Style headings
        h1: ({ children, ...props }) => (
          <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-xl font-bold mt-3 mb-2" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-lg font-bold mt-2 mb-1" {...props}>
            {children}
          </h3>
        ),
        // Style lists
        ul: ({ children, ...props }) => (
          <ul className="list-disc list-inside space-y-1" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside space-y-1" {...props}>
            {children}
          </ol>
        ),
        // Style blockquotes
        blockquote: ({ children, ...props }) => (
          <blockquote className="border-l-4 border-border-strong pl-4 italic" {...props}>
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
