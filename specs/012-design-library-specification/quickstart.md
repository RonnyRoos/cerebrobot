# Quickstart Guide: Chat Design System

**Package**: `@workspace/ui`  
**Target Audience**: Developers building chat features in Cerebrobot  
**Time to First Component**: ~10 minutes

---

## Prerequisites

- Node.js ≥20
- pnpm workspace environment (already configured in Cerebrobot monorepo)
- React 18+ application (apps/client)

---

## Step 1: Install Dependencies

The `@workspace/ui` package will be created in `packages/ui` and automatically available to workspace packages.

```bash
# From repository root
cd packages/ui

# Install core dependencies
pnpm add react react-dom
pnpm add -D typescript @types/react @types/react-dom

# Add design system dependencies
pnpm add tailwindcss tailwindcss-animate class-variance-authority clsx tailwind-merge
pnpm add react-markdown remark-gfm
pnpm add react-syntax-highlighter
pnpm add -D @types/react-syntax-highlighter

# Initialize Tailwind (if not already done)
pnpm dlx tailwindcss init -p --ts
```

---

## Step 2: Initialize ShadCN UI

Configure ShadCN to generate components in `packages/ui`:

```bash
cd packages/ui
pnpm dlx shadcn@latest init
```

**Prompts** (select these options):
```
? Which style would you like to use? › New York
? Which color would you like to use as base color? › Neutral
? Would you like to use CSS variables for colors? › yes
? Where is your global CSS file? › src/theme/globals.css
? Would you like to use CSS variables for colors? › yes
? Are you using a custom tailwind prefix eg. tw-? (Leave blank if not) › 
? Where is your tailwind.config.js located? › tailwind.config.ts
? Configure the import alias for components: › @/chat
? Configure the import alias for utils: › @/utils
```

This creates `components.json` config file.

---

## Step 3: Configure Tailwind

Update `packages/ui/tailwind.config.ts` with chat-specific tokens:

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],  // Use class strategy for dark mode
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Chat-specific color tokens
        'message-user': {
          DEFAULT: 'hsl(var(--color-message-user-bg))',
          text: 'hsl(var(--color-message-user-text))',
        },
        'message-agent': {
          DEFAULT: 'hsl(var(--color-message-agent-bg))',
          text: 'hsl(var(--color-message-agent-text))',
        },
        'code-block': {
          DEFAULT: 'hsl(var(--color-code-block-bg))',
          border: 'hsl(var(--color-code-block-border))',
        },
        'code-inline': 'hsl(var(--color-code-inline-bg))',
        timestamp: 'hsl(var(--color-timestamp))',
        link: {
          DEFAULT: 'hsl(var(--color-link))',
          hover: 'hsl(var(--color-link-hover))',
        },
        'copy-button': {
          DEFAULT: 'hsl(var(--color-copy-button))',
          success: 'hsl(var(--color-copy-button-success))',
        },
      },
      fontSize: {
        'chat-body': ['16px', { lineHeight: '1.6' }],
        'chat-code': ['14px', { lineHeight: '1.5' }],
      },
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),  // For prose class in markdown
  ],
} satisfies Config
```

---

## Step 4: Create Theme CSS

Create `packages/ui/src/theme/globals.css` with CSS custom properties:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Chat message colors - Light mode */
    --color-message-user-bg: 239 84% 67%;          /* Soft blue */
    --color-message-user-text: 222 47% 11%;        /* Dark text */
    --color-message-agent-bg: 240 5% 96%;          /* Light gray */
    --color-message-agent-text: 222 47% 11%;       /* Dark text */
    
    /* Code block colors */
    --color-code-block-bg: 0 0% 98%;               /* Near-white */
    --color-code-block-border: 0 0% 89%;           /* Light border */
    --color-code-inline-bg: 0 0% 95%;              /* Inline code bg */
    
    /* Utility colors */
    --color-timestamp: 240 4% 46%;                 /* Muted gray */
    --color-link: 221 83% 53%;                     /* Link blue */
    --color-link-hover: 221 83% 43%;               /* Darker blue */
    --color-copy-button: 0 0% 60%;                 /* Gray */
    --color-copy-button-success: 142 71% 45%;      /* Green */
  }

  .dark {
    /* Chat message colors - Dark mode */
    --color-message-user-bg: 239 84% 37%;          /* Deep blue */
    --color-message-user-text: 210 40% 98%;        /* Light text */
    --color-message-agent-bg: 222 47% 11%;         /* Dark gray */
    --color-message-agent-text: 210 40% 98%;       /* Light text */
    
    /* Code block colors */
    --color-code-block-bg: 0 0% 10%;               /* Near-black */
    --color-code-block-border: 0 0% 20%;           /* Dark border */
    --color-code-inline-bg: 0 0% 15%;              /* Inline code bg */
    
    /* Utility colors */
    --color-timestamp: 240 5% 65%;                 /* Lighter muted */
    --color-link: 217 91% 60%;                     /* Brighter blue */
    --color-link-hover: 217 91% 70%;               /* Lighter blue */
    --color-copy-button: 0 0% 70%;                 /* Lighter gray */
    --color-copy-button-success: 142 71% 55%;      /* Brighter green */
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Step 5: Create Utility Helpers

Create `packages/ui/src/utils/cn.ts` (Tailwind merge utility):

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## Step 6: Create ThemeProvider

Create `packages/ui/src/utils/theme.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize from localStorage or default to light
    const stored = localStorage.getItem('cerebrobot-theme')
    return (stored === 'dark' || stored === 'light') ? stored : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('cerebrobot-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
```

---

## Step 7: Configure Package Exports

Update `packages/ui/package.json`:

```json
{
  "name": "@workspace/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    },
    "./theme": "./src/theme/globals.css"
  },
  "files": ["src"],
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

Create `packages/ui/src/index.ts` (main export file - initially empty, will add components later):

```typescript
// Theme utilities
export { ThemeProvider, useTheme } from './utils/theme'
export { cn } from './utils/cn'

// Components will be exported here as they're created
// export { MessageBubble } from './chat/message-bubble'
// export { CodeBlock } from './chat/code-block'
// export { Avatar } from './chat/avatar'
// etc.

// Type exports
export type { Theme, ThemeContextValue } from './utils/theme'
```

---

## Step 8: Integrate with apps/client

Update `apps/client/src/main.tsx` to use theme provider:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@workspace/ui'
import '@workspace/ui/theme'  // Import global CSS
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

Update `apps/client/tailwind.config.ts` to extend UI package config:

```typescript
import baseConfig from '@workspace/ui/tailwind.config'
import type { Config } from 'tailwindcss'

export default {
  presets: [baseConfig],  // Inherit chat colors and typography
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',  // Scan UI package for classes
  ],
  theme: {
    extend: {
      // App-specific overrides here
    }
  }
} satisfies Config
```

---

## Step 9: Create Your First Component

Let's build the `MessageBubble` component as an example.

Create `packages/ui/src/chat/message-bubble.tsx`:

```typescript
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn'

const messageBubbleVariants = cva(
  'rounded-lg px-4 py-3 max-w-[65%] break-words prose prose-sm dark:prose-invert',
  {
    variants: {
      sender: {
        user: 'ml-auto bg-message-user text-message-user-text',
        agent: 'mr-auto bg-message-agent text-message-agent-text',
      },
    },
    defaultVariants: {
      sender: 'agent',
    },
  }
)

export interface MessageBubbleProps
  extends ComponentPropsWithoutRef<'div'>,
    VariantProps<typeof messageBubbleVariants> {
  content: string
  sender: 'user' | 'agent'
  className?: string
}

export const MessageBubble = forwardRef<
  ElementRef<'div'>,
  MessageBubbleProps
>(({ content, sender, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(messageBubbleVariants({ sender }), className)}
      {...props}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  )
})

MessageBubble.displayName = 'MessageBubble'
```

Export it from `packages/ui/src/index.ts`:

```typescript
export { MessageBubble } from './chat/message-bubble'
export type { MessageBubbleProps } from './chat/message-bubble'
```

---

## Step 10: Use the Component

In `apps/client/src/App.tsx`:

```typescript
import { useState } from 'react'
import { MessageBubble, useTheme } from '@workspace/ui'

function App() {
  const { theme, toggleTheme } = useTheme()
  const [messages] = useState([
    { id: 1, content: 'Hello! How can I help you today?', sender: 'agent' as const },
    { id: 2, content: 'Can you explain **React hooks**?', sender: 'user' as const },
    { id: 3, content: '## React Hooks\n\nHooks let you use state and other React features:\n\n```typescript\nconst [count, setCount] = useState(0)\n```', sender: 'agent' as const },
  ])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cerebrobot Chat</h1>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-lg bg-message-agent text-message-agent-text"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </header>

        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              content={msg.content}
              sender={msg.sender}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
```

---

## Step 11: Verify Installation

Start the development server:

```bash
# From repository root
pnpm dev
```

You should see:
1. Chat messages with distinct user/agent styling
2. Markdown rendering (bold text, code blocks with syntax highlighting)
3. Theme toggle working (light/dark mode)
4. Smooth theme transitions

---

## Common Patterns

### Pattern 1: Building a Chat View

```typescript
import { MessageBubble, TypingIndicator } from '@workspace/ui'

function ChatView({ messages, isTyping }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          content={msg.text}
          sender={msg.role}
          timestamp={new Date(msg.createdAt)}
          avatar={msg.avatarUrl}
        />
      ))}
      {isTyping && <TypingIndicator variant="dots" />}
    </div>
  )
}
```

### Pattern 2: Custom Styling

```typescript
<MessageBubble
  content={message.text}
  sender="user"
  className="max-w-[80%] shadow-lg"  // Override max-width and add shadow
/>
```

### Pattern 3: Theme Toggle Button

```typescript
import { useTheme } from '@workspace/ui'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded hover:bg-message-agent"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

### Pattern 4: Code Block with Custom Handler

```typescript
import { CodeBlock } from '@workspace/ui'

function CodeExample() {
  const handleCopy = (code: string) => {
    console.log('Copied:', code)
    // Optional: Show toast notification
  }

  return (
    <CodeBlock
      code={snippet}
      language="typescript"
      onCopy={handleCopy}
    />
  )
}
```

---

## Troubleshooting

### Issue: CSS Not Loaded

**Solution**: Ensure `@workspace/ui/theme` is imported in `apps/client/src/main.tsx`:

```typescript
import '@workspace/ui/theme'  // Must be before App import
```

### Issue: Theme Not Persisting

**Solution**: Verify localStorage key matches:

```typescript
// Should be 'cerebrobot-theme', not 'theme' or 'dark-mode'
localStorage.getItem('cerebrobot-theme')
```

### Issue: Tailwind Classes Not Applied

**Solution**: Ensure `apps/client/tailwind.config.ts` scans UI package:

```typescript
content: [
  './src/**/*.{ts,tsx}',
  '../../packages/ui/src/**/*.{ts,tsx}',  // Add this
]
```

### Issue: TypeScript Errors on Imports

**Solution**: Ensure `apps/client/tsconfig.json` includes workspace paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@workspace/ui": ["../../packages/ui/src/index.ts"]
    }
  }
}
```

---

## Next Steps

1. **Add More Components**: Implement remaining P1 components (CodeBlock, Avatar) following same pattern
2. **Add Tests**: Create unit tests for components using Vitest + React Testing Library
3. **Customize Theme**: Modify CSS custom properties in `globals.css` to match brand
4. **Explore Contracts**: Read [component-api.md](./contracts/component-api.md) and [theme-tokens.md](./contracts/theme-tokens.md) for full API reference

---

## Resources

- **ShadCN UI Docs**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **react-markdown**: https://github.com/remarkjs/react-markdown
- **React Syntax Highlighter**: https://github.com/react-syntax-highlighter/react-syntax-highlighter
- **Constitution**: `../../.specify/memory/constitution.md`

---

**Estimated Time**: 10-15 minutes for basic setup, first message rendering works ✅
