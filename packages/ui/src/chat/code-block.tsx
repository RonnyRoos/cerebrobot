import { forwardRef, type ElementRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../utils/cn';
import { useTheme } from '../utils/theme';
import { CopyButton } from './copy-button';

export interface CodeBlockProps {
  /**
   * Source code to display.
   * Will be syntax highlighted if language is provided.
   */
  code: string;

  /**
   * Programming language for syntax highlighting hint.
   * Examples: 'typescript', 'python', 'bash', 'json'
   * If undefined, renders as plain monospace text.
   */
  language?: string;

  /**
   * Display line numbers in left gutter.
   * @default false
   */
  showLineNumbers?: boolean;

  /**
   * Theme for syntax highlighting.
   * Automatically selected based on dark mode context.
   * Can override with custom style object if needed.
   */
  highlightStyle?: Record<string, React.CSSProperties>;

  /**
   * Override default Tailwind classes.
   */
  className?: string;
}

export type CodeBlockElement = ElementRef<'div'>;

export const CodeBlock = forwardRef<CodeBlockElement, CodeBlockProps>(
  ({ code, language, showLineNumbers = false, highlightStyle, className }, ref) => {
    const { theme } = useTheme();

    // Select syntax highlighting theme based on current theme
    const syntaxTheme = highlightStyle ?? (theme === 'dark' ? vscDarkPlus : vs);

    return (
      <div
        ref={ref}
        className={cn(
          'group relative rounded-xl overflow-hidden bg-code-block-bg border-t-2 border-x border-b border-code-block-border shadow-xl',
          'before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-purple-500 before:to-pink-500',
          className,
        )}
      >
        <CopyButton
          text={code}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-code-block-bg/80 backdrop-blur-sm border border-code-block-border hover:shadow-glow-purple"
        />
        {language ? (
          <SyntaxHighlighter
            language={language}
            style={syntaxTheme}
            showLineNumbers={showLineNumbers}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
            codeTagProps={{
              className: 'font-mono text-chat-code',
            }}
          >
            {code}
          </SyntaxHighlighter>
        ) : (
          <pre className="font-mono text-chat-code p-4 m-0 overflow-x-auto">
            <code>{code}</code>
          </pre>
        )}
      </div>
    );
  },
);

CodeBlock.displayName = 'CodeBlock';
