# Research: Design Library Technology Decisions

**Feature Branch**: `012-design-library-specification`  
**Date**: 2025-11-02  
**Purpose**: Resolve NEEDS CLARIFICATION items from Technical Context

---

## Research Tasks

### 1. Markdown Renderer Selection

**Decision**: Use `react-markdown` v9+ with `remark-gfm` plugin

**Rationale**:
- **react-markdown** is the most popular React markdown renderer (38 code snippets, 8.9 trust score)
- Excellent TypeScript support with comprehensive type definitions (`Options`, `Components`, `ExtraProps`)
- Plugin ecosystem via remark (preprocessing) and rehype (postprocessing) allows extensibility
- Built-in support for custom component mapping (critical for our MessageBubble integration)
- Active maintenance and wide adoption in React ecosystem
- GFM support via `remark-gfm` plugin enables tables, strikethrough, task lists (useful for future enhancements)

**Alternatives Considered**:
- **markdown-to-jsx** (9.6 trust score, 75 snippets): Lighter bundle, but less flexible plugin system. Good for simple use cases, but harder to extend with custom AST transformations.
- **react-remark** (8.9 trust score, 9 snippets): Uses hooks-based API, but smaller community and less documentation.
- **marked + DOMPurify**: Would require manual React element creation and security hardening. More work for same result.

**Implementation Notes**:
```typescript
// Basic setup with TypeScript
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  code: CustomCodeBlock,
  a: CustomLink,
  // Map other elements as needed
}

<Markdown remarkPlugins={[remarkGfm]} components={components}>
  {markdownContent}
</Markdown>
```

**Bundle Impact**: ~50KB (react-markdown + remark-gfm), acceptable for chat UX

---

### 2. Syntax Highlighting Library Selection

**Decision**: Use `react-syntax-highlighter` with Prism backend

**Rationale**:
- **react-syntax-highlighter** is the standard React wrapper for syntax highlighting
- Supports multiple backends (Prism, Highlight.js) via subpath imports
- Prism backend offers:
  - Smaller bundle size when code-splitting by language (~2KB per language)
  - Extensive language support (200+ languages)
  - Theme variety compatible with light/dark modes
  - Lazy loading support to reduce initial bundle
- Integrates cleanly with react-markdown via custom `code` component
- Well-documented TypeScript types

**Alternatives Considered**:
- **Highlight.js**: Auto-detection feature not needed (markdown specifies language). Slightly larger bundle.
- **Shiki**: Uses VS Code themes (beautiful), but requires build-time or server-side processing. Not suitable for client-side SPA rendering in Vite.
- **Prism.js directly**: Would require manual DOM manipulation and React integration. react-syntax-highlighter already provides this wrapper.

**Implementation Pattern** (from react-markdown docs):
```typescript
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vsDark, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'

function CodeBlock({ language, children, isDark }) {
  return (
    <SyntaxHighlighter
      language={language || 'text'}
      style={isDark ? vsDark : vs}
      PreTag="div"
      customStyle={{ margin: 0 }}
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  )
}
```

**Performance Optimization**: Lazy load language definitions using dynamic imports:
```typescript
// Only load specific languages as needed
const loadLanguage = async (lang: string) => {
  await import(`react-syntax-highlighter/dist/esm/languages/prism/${lang}`)
}
```

**Bundle Impact**: ~50KB base + ~2KB per language (lazy loaded)

---

### 3. ShadCN UI Setup in Monorepo

**Decision**: Initialize ShadCN in `packages/ui` with shared Tailwind config

**Rationale**:
- ShadCN philosophy: components are **source files** you own and customize (not npm packages)
- Perfect fit for monorepo—`packages/ui` becomes the single source of truth
- `components.json` config file directs CLI where to generate components
- Tailwind config can be extended by consuming apps (apps/client) via `presets` property
- Enables customization without forking—operators can modify components directly

**ShadCN Setup Pattern**:
```bash
# In packages/ui directory
pnpm dlx shadcn@latest init

# components.json configuration
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",  # or "default"
  "rsc": false,         # Not using React Server Components (Vite app)
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/theme/globals.css",
    "baseColor": "neutral",
    "cssVariables": true  # Use CSS custom properties for theming
  },
  "aliases": {
    "components": "@/chat",      # Our chat components
    "utils": "@/utils",
    "hooks": "@/hooks"
  }
}
```

**Tailwind Config Sharing** (packages/ui/tailwind.config.ts):
```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],  # Use class strategy for dark mode
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Chat-specific color tokens
        'message-user': 'hsl(var(--color-message-user-bg))',
        'message-agent': 'hsl(var(--color-message-agent-bg))',
        // ... other chat colors
      },
      fontSize: {
        // Chat-optimized typography
        'chat-body': ['16px', { lineHeight: '1.6' }],
        'chat-code': ['14px', { lineHeight: '1.5' }],
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
} satisfies Config
```

**Consuming in apps/client** (apps/client/tailwind.config.ts):
```typescript
import baseConfig from '@workspace/ui/tailwind.config'
import type { Config } from 'tailwindcss'

export default {
  presets: [baseConfig],  # Inherit chat colors, typography
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'  # Scan UI package
  ],
  theme: {
    extend: {
      // App-specific overrides if needed
    }
  }
} satisfies Config
```

**Directory Structure**:
```
packages/ui/
├── components.json          # ShadCN CLI config
├── tailwind.config.ts       # Shared theme tokens
├── tsconfig.json
├── package.json             # exports: { ".": "./src/index.ts", "./theme": "./src/theme/globals.css" }
└── src/
    ├── index.ts             # Re-export all components
    ├── chat/                # Chat-specific components
    │   ├── message-bubble.tsx
    │   ├── code-block.tsx
    │   └── ...
    ├── primitives/          # ShadCN base components (button, input, etc.)
    │   └── button.tsx
    ├── utils/
    │   └── cn.ts            # Tailwind merge utility
    └── theme/
        ├── globals.css      # CSS custom properties
        └── chat-colors.css
```

---

### 4. Dark Mode Implementation Strategy

**Decision**: Tailwind `class` strategy with React Context + localStorage

**Rationale**:
- Tailwind's `class` strategy (`darkMode: ['class']`) allows runtime theme switching
- More flexible than media query strategy—operators can override system preference
- React Context provides theme state to all components without prop drilling
- localStorage persists preference across sessions (Constitution VI: Configuration Over Hardcoding)
- No flash of unstyled content with proper SSR handling (though Cerebrobot is SPA, pattern is portable)

**Implementation Pattern**:
```typescript
// packages/ui/src/utils/theme.tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
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
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

**Usage in apps/client**:
```typescript
// apps/client/src/main.tsx
import { ThemeProvider } from '@workspace/ui'
import '@workspace/ui/theme'  # Import globals.css

root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)

// Component using theme
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

**CSS Custom Properties** (packages/ui/src/theme/chat-colors.css):
```css
@layer base {
  :root {
    /* Light mode chat colors */
    --color-message-user-bg: 239 84% 67%;      /* Soft blue */
    --color-message-user-text: 222 47% 11%;    /* Dark text */
    --color-message-agent-bg: 240 5% 96%;      /* Light gray */
    --color-message-agent-text: 222 47% 11%;
    /* ... other tokens */
  }

  .dark {
    /* Dark mode chat colors */
    --color-message-user-bg: 239 84% 37%;      /* Deep blue */
    --color-message-user-text: 210 40% 98%;    /* Light text */
    --color-message-agent-bg: 222 47% 11%;     /* Dark gray */
    --color-message-agent-text: 210 40% 98%;
    /* ... other tokens */
  }
}
```

**Preventing Flash of Unstyled Content** (optional for future SSR):
```html
<!-- Inline script in index.html before app loads -->
<script>
  const theme = localStorage.getItem('cerebrobot-theme') || 'light'
  document.documentElement.classList.add(theme)
</script>
```

---

### 5. Timestamp Formatting Library

**Decision**: Use native `Intl.RelativeTimeFormat` API + `Intl.DateTimeFormat`

**Rationale**:
- **Zero dependencies**: Browser API available in all modern browsers (Chrome 71+, Firefox 65+, Safari 14+)
- Meets our browser support target (latest 2 versions)
- Localization support built-in (future enhancement if needed)
- Lightweight implementation (~50 lines of code)
- No need for date-fns (48KB) or moment.js (deprecated) for simple relative/absolute formatting

**Alternatives Considered**:
- **date-fns**: Excellent library, but adds 48KB for functionality we can implement natively. Violates YAGNI.
- **Temporal API**: Future standard, but still Stage 3 proposal. Requires polyfill (~80KB). Too early to adopt.

**Implementation Pattern**:
```typescript
// packages/ui/src/utils/format-timestamp.ts
type TimestampFormat = 'relative' | 'absolute' | 'auto'

export function formatTimestamp(date: Date, format: TimestampFormat = 'auto'): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  // Auto-select format based on age
  const useRelative = format === 'relative' || 
    (format === 'auto' && diffDays < 7)

  if (!useRelative) {
    // Absolute: "Nov 2, 2025 at 3:45 PM"
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  // Relative time
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute')
  if (diffHours < 24) return rtf.format(-diffHours, 'hour')
  if (diffDays < 7) return rtf.format(-diffDays, 'day')

  // Fallback to absolute for old messages
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
```

**Usage**:
```typescript
<Timestamp date={message.timestamp} format="auto" />
// Recent: "5 minutes ago"
// Yesterday: "yesterday at 3:45 PM"
// Older: "Nov 2, 2025 at 3:45 PM"
```

**Edge Case Handling** (from spec):
- Future timestamps (clock skew): `if (diffMs < 0) return 'just now'` + console warning
- Missing date: TypeScript ensures `Date` type, but add runtime check in component

---

### 6. Component Variant Management

**Decision**: Use `class-variance-authority` (cva) for variant styling

**Rationale**:
- **Standard in ShadCN ecosystem**: All ShadCN components use cva for variant management
- Type-safe variant definitions with TypeScript inference
- Cleaner than manual className concatenation or boolean props
- Composable with `cn()` utility (tailwind-merge + clsx)
- Excellent DX with autocomplete for variant options

**Installation**:
```bash
pnpm add class-variance-authority clsx tailwind-merge
```

**Implementation Pattern**:
```typescript
// packages/ui/src/chat/message-bubble.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn'

const messageBubbleVariants = cva(
  // Base styles (always applied)
  'rounded-lg px-4 py-3 max-w-[65%] break-words',
  {
    variants: {
      sender: {
        user: 'ml-auto bg-message-user text-message-user-text',
        agent: 'mr-auto bg-message-agent text-message-agent-text',
      },
      size: {
        sm: 'text-sm px-3 py-2',
        md: 'text-base px-4 py-3',  # default
        lg: 'text-lg px-5 py-4',
      }
    },
    defaultVariants: {
      sender: 'agent',
      size: 'md',
    }
  }
)

interface MessageBubbleProps extends VariantProps<typeof messageBubbleVariants> {
  content: string
  className?: string
}

export function MessageBubble({ sender, size, content, className }: MessageBubbleProps) {
  return (
    <div className={cn(messageBubbleVariants({ sender, size }), className)}>
      <Markdown>{content}</Markdown>
    </div>
  )
}
```

**Benefits**:
- Autocomplete for `sender="user"` vs `sender="agent"`
- Type errors for invalid variants
- Easy to add new variants (e.g., `status: 'sending' | 'sent' | 'error'`)
- `className` prop works as escape hatch (Constitution: Design Principle 3)

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **Markdown** | react-markdown + remark-gfm | Best TypeScript support, plugin ecosystem, custom components |
| **Syntax Highlighting** | react-syntax-highlighter (Prism) | Standard React wrapper, lazy loading, theme support |
| **ShadCN Setup** | packages/ui with shared Tailwind config | Monorepo-friendly, operators own source, config sharing via presets |
| **Dark Mode** | Tailwind class strategy + Context + localStorage | Runtime toggle, persistence, Constitution compliance |
| **Timestamps** | Native Intl APIs | Zero dependencies, modern browser support, YAGNI principle |
| **Variants** | class-variance-authority (cva) | ShadCN standard, type-safe, clean API |

All decisions align with:
- **Constitution III (Type Safety)**: All libraries have excellent TypeScript support
- **Constitution V (Stack Discipline)**: Using approved React 18+, TypeScript 5.5+, Tailwind
- **Constitution VI (Configuration)**: Theme via localStorage, swappable renderers via props
- **Constitution VII (Operator-Centric)**: Zero-config setup, source-level customization, modern browser focus
- **KISS/YAGNI Principles**: Native APIs where sufficient, avoid heavy dependencies

---

## Next Steps

Phase 1 will define:
1. **data-model.md**: TypeScript interfaces for all component props (MessageBubble, CodeBlock, etc.)
2. **contracts/**: Component API documentation, theme token reference, TypeScript exports
3. **quickstart.md**: Installation, setup, and basic usage examples
