# @workspace/ui

Chat-specific design library for Cerebrobot, built with React, TypeScript, and Tailwind CSS.

## Features

- **🎨 Theme System**: Light/dark mode with automatic persistence
- **💬 Chat Components**: MessageBubble, Avatar, TypingIndicator, Timestamp
- **📝 Rich Content**: Markdown rendering with syntax-highlighted code blocks
- **📋 Copy Functionality**: One-click code copying with visual feedback
- **♿ Accessible**: WCAG AA compliant, semantic HTML, ARIA labels
- **🎯 Type-Safe**: Full TypeScript support with exported types
- **⚡ Performant**: CSS-only animations, minimal JavaScript

## Installation

This package is part of the Cerebrobot monorepo workspace. To use it in other workspace packages:

```bash
# Install the workspace package
pnpm add @workspace/ui --filter <your-package>
```

## Quick Start

See the complete [10-minute setup guide](../../specs/012-design-library-specification/quickstart.md) for detailed instructions.

### Basic Usage

```tsx
import { ThemeProvider, MessageBubble, CodeBlock, useTheme } from '@workspace/ui';
import '@workspace/ui/theme';

function App() {
  return (
    <ThemeProvider>
      <Chat />
    </ThemeProvider>
  );
}

function Chat() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <button onClick={toggleTheme}>
        Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
      </button>

      <MessageBubble
        content="Hello! I'm the **agent**."
        sender="agent"
        timestamp={new Date()}
      />

      <MessageBubble
        content="Hi there!"
        sender="user"
        timestamp={new Date()}
      />

      <CodeBlock
        language="typescript"
        code="const greeting = 'Hello, world!';"
        showLineNumbers
      />
    </div>
  );
}
```

## Components

### MessageBubble

Displays a chat message with markdown support and automatic timestamps.

```tsx
<MessageBubble
  content="This is **markdown** content with `code`"
  sender="user" // or "agent"
  timestamp={new Date()}
  avatar="https://example.com/avatar.jpg" // optional
  className="custom-class" // optional
/>
```

### CodeBlock

Syntax-highlighted code blocks with copy functionality.

```tsx
<CodeBlock
  language="python"
  code="def hello(): return 'world'"
  showLineNumbers={true} // optional
/>
```

### Avatar

User or agent visual identifier.

```tsx
<Avatar
  variant="user" // or "agent"
  size="md" // "sm", "md", "lg"
  initials="JD" // optional, shows if no image
  src="https://example.com/avatar.jpg" // optional
/>
```

### TypingIndicator

Animated indicator for agent activity.

```tsx
<TypingIndicator variant="dots" /> // or "pulse"
```

### Timestamp

Smart timestamp formatting (relative for recent, absolute for older).

```tsx
<Timestamp
  date={new Date()}
  format="auto" // "auto", "relative", or "absolute"
  updateInterval={60000} // optional, in milliseconds
/>
```

### CopyButton

Standalone copy-to-clipboard button with feedback.

```tsx
<CopyButton
  text="Content to copy"
  feedbackDuration={2000} // optional, in milliseconds
  onCopy={(text) => console.log('Copied:', text)} // optional
  onError={(err) => console.error(err)} // optional
/>
```

### ThemeProvider & useTheme

Theme context provider and hook for dark mode.

```tsx
import { ThemeProvider, useTheme } from '@workspace/ui';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <YourApp />
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current: {theme}
    </button>
  );
}
```

## Styling

### Tailwind Configuration

To use the design library's colors and typography in your app:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import baseConfig from '@workspace/ui/tailwind.config';

const config: Config = {
  presets: [baseConfig],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
```

### Color Tokens

All colors are defined as CSS custom properties and automatically adapt to light/dark mode:

- `bg-message-user-bg`, `text-message-user-text`
- `bg-message-agent-bg`, `text-message-agent-text`
- `bg-code-block-bg`, `border-code-block-border`
- `text-timestamp`, `text-link`, `text-link-hover`
- `text-copy-button`, `text-copy-button-success`

See [chat-colors.css](./src/theme/chat-colors.css) for complete documentation.

### Typography

Custom chat typography classes:

- `text-chat-body` - 16px, 1.6 line height
- `text-chat-code` - 14px, monospace
- `text-chat-code-inline` - 15px, inline code
- `text-chat-timestamp` - 13px, muted

## Development

```bash
# Lint the package
pnpm lint

# Format code
pnpm format:write

# Type-check
pnpm type-check
```

## Tech Stack

- **React** 18+
- **TypeScript** 5.5+
- **Tailwind CSS** 3.4+
- **react-markdown** 9.0.1 (with remark-gfm)
- **react-syntax-highlighter** 15.5.0 (Prism)
- **class-variance-authority** 0.7.0

## Architecture

- **Component Pattern**: ShadCN UI-inspired (forwardRef, CVA variants, cn utility)
- **Theme System**: CSS custom properties + React Context
- **Styling**: Tailwind utility classes + semantic color tokens
- **Accessibility**: WCAG AA compliant, semantic HTML, proper ARIA labels

## License

Internal monorepo package for Cerebrobot project.
