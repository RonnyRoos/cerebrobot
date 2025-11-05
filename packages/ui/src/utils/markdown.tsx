import { type Components } from 'react-markdown';
import { CodeBlock } from '../chat/code-block';

/**
 * Default markdown component overrides for chat messages.
 * Customizes code blocks and links for better UX.
 */
export const defaultMarkdownComponents: Components = {
  // Replace code blocks with CodeBlock component
  code: ({ className, children, ...props }) => {
    // Type assertion for inline property which exists at runtime but not in types
    const inline = 'inline' in props ? (props as { inline?: boolean }).inline : false;

    // Extract language from className (format: language-xxx)
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : undefined;

    // Inline code uses simple styling
    if (inline) {
      return (
        <code
          className="font-mono text-chat-code-inline bg-code-inline-bg px-1 py-0.5 rounded"
          {...props}
        >
          {children}
        </code>
      );
    }

    // Block code uses CodeBlock component
    return <CodeBlock code={String(children).replace(/\n$/, '')} language={language} />;
  },

  // Open links in new tab with security attributes
  a: ({ ...anchorProps }) => <a {...anchorProps} target="_blank" rel="noopener noreferrer" />,
};
