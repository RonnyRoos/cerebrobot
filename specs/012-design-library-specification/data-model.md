# Data Model: Design Library Component Interfaces

**Feature Branch**: `012-design-library-specification`  
**Date**: 2025-11-02  
**Purpose**: Define TypeScript interfaces for all chat components

---

## Overview

All components follow React best practices:
- **forwardRef** support for ref passing
- **Spread props** (`...rest`) for HTML attribute extensibility  
- **Discriminated unions** for variants (not boolean flags)
- **Optional className** for Tailwind overrides (escape hatch)
- **No `any` types** (Constitution III)

---

## Core Component Interfaces

### 1. MessageBubble

Chat message container with markdown rendering and user/agent variants.

```typescript
import { type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { type VariantProps } from 'class-variance-authority'

// Variant definitions
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
  /**
   * Markdown-formatted message content.
   * Supports GFM: headings, lists, links, code blocks, etc.
   */
  content: string

  /**
   * Message sender type. Determines visual styling and alignment.
   * - user: right-aligned, user color scheme
   * - agent: left-aligned, agent color scheme
   */
  sender: 'user' | 'agent'

  /**
   * When the message was sent. Used for timestamp display.
   */
  timestamp: Date

  /**
   * Avatar image URL or null for initials fallback.
   * If undefined, avatar is not displayed.
   */
  avatar?: string | null

  /**
   * Override default Tailwind classes for custom styling.
   * Merged with variant classes using cn() utility.
   */
  className?: string
}

// Component type for ref forwarding
export type MessageBubbleElement = ElementRef<'div'>
```

**State Transitions**: None (stateless presentational component)

**Validation Rules**:
- `content` must be non-empty string (enforced by parent component, not validated internally)
- `sender` must be exactly 'user' or 'agent' (TypeScript enforced)
- `timestamp` must be valid Date object (no future validation per spec edge case handling)

**Relationships**:
- Renders `Avatar` component if `avatar` prop provided
- Renders `Timestamp` component with `timestamp` prop
- Uses `Markdown` renderer internally for `content`

---

### 2. CodeBlock

Syntax-highlighted code display with copy functionality.

```typescript
import { type ComponentPropsWithoutRef, type ElementRef } from 'react'

export interface CodeBlockProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Source code to display.
   * Will be syntax highlighted if language is provided.
   */
  code: string

  /**
   * Programming language for syntax highlighting hint.
   * Examples: 'typescript', 'python', 'bash', 'json'
   * If undefined, renders as plain monospace text.
   */
  language?: string

  /**
   * Display line numbers in left gutter.
   * @default false
   */
  showLineNumbers?: boolean

  /**
   * Theme for syntax highlighting.
   * Automatically selected based on dark mode context.
   * Can override with custom style object if needed.
   */
  highlightStyle?: Record<string, React.CSSProperties>

  /**
   * Override default Tailwind classes.
   */
  className?: string

  /**
   * Callback when code is copied to clipboard.
   * Receives the copied code string.
   */
  onCopy?: (code: string) => void
}

export type CodeBlockElement = ElementRef<'div'>
```

**State**:
```typescript
// Internal component state (not exposed in props)
type CodeBlockState = 
  | { status: 'idle' }
  | { status: 'copying' }
  | { status: 'copied'; copiedAt: number }  // timestamp for auto-reset
```

**Validation Rules**:
- `code` must be string (can be empty for edge cases)
- `language` should match supported Prism languages, but no runtime validation (graceful fallback)
- `showLineNumbers` defaults to false for cleaner appearance

**Relationships**:
- Contains `CopyButton` component (positioned absolute top-right)
- Uses `react-syntax-highlighter` with Prism backend internally
- Respects theme context for light/dark highlighting styles

---

### 3. TypingIndicator

Animated feedback during agent processing.

```typescript
import { type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { type VariantProps } from 'class-variance-authority'

const typingIndicatorVariants = cva(
  'flex items-center gap-1.5 px-4 py-3 rounded-lg bg-message-agent',
  {
    variants: {
      variant: {
        dots: '',      // Bouncing dots animation
        pulse: '',     // Pulsing circle animation
      },
    },
    defaultVariants: {
      variant: 'dots',
    },
  }
)

export interface TypingIndicatorProps
  extends ComponentPropsWithoutRef<'div'>,
    VariantProps<typeof typingIndicatorVariants> {
  /**
   * Animation style for typing indicator.
   * - dots: Three bouncing dots (classic chat UX)
   * - pulse: Single pulsing circle (minimal)
   */
  variant?: 'dots' | 'pulse'

  /**
   * Accessibility label for screen readers.
   * @default "Agent is typing..."
   */
  ariaLabel?: string

  /**
   * Override default Tailwind classes.
   */
  className?: string
}

export type TypingIndicatorElement = ElementRef<'div'>
```

**State**: Stateless (animation handled via CSS keyframes)

**Validation Rules**: None (purely presentational)

**Relationships**: Standalone component, typically rendered in message list when agent is processing

---

### 4. Avatar

User/agent visual identifier with image or initials fallback.

```typescript
import { type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { type VariantProps } from 'class-variance-authority'

const avatarVariants = cva(
  'rounded-full flex items-center justify-center font-medium shrink-0',
  {
    variants: {
      variant: {
        user: 'bg-message-user text-message-user-text',
        agent: 'bg-message-agent text-message-agent-text',
      },
      size: {
        sm: 'h-6 w-6 text-xs',
        md: 'h-8 w-8 text-sm',
        lg: 'h-10 w-10 text-base',
      },
    },
    defaultVariants: {
      variant: 'agent',
      size: 'md',
    },
  }
)

export interface AvatarProps
  extends ComponentPropsWithoutRef<'div'>,
    VariantProps<typeof avatarVariants> {
  /**
   * Avatar image URL. If provided and loads successfully, displays image.
   * If undefined/null or fails to load, falls back to initials.
   */
  src?: string | null

  /**
   * Initials to display when image not available.
   * Typically 1-2 uppercase characters (e.g., "JD", "AI").
   * If undefined, derives from variant (e.g., "U" for user, "AI" for agent).
   */
  initials?: string

  /**
   * Avatar type. Determines color scheme.
   * - user: User avatar styling
   * - agent: Agent avatar styling
   */
  variant: 'user' | 'agent'

  /**
   * Avatar size.
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Alt text for avatar image (accessibility).
   * @default "User avatar" or "Agent avatar" based on variant
   */
  alt?: string

  /**
   * Override default Tailwind classes.
   */
  className?: string
}

export type AvatarElement = ElementRef<'div'>
```

**State**:
```typescript
// Internal state for image loading
type AvatarState =
  | { imageStatus: 'loading' }
  | { imageStatus: 'loaded' }
  | { imageStatus: 'error' }  // Fallback to initials
```

**Validation Rules**:
- If `src` provided, attempts to load image
- If `src` undefined/null or load fails, displays `initials`
- If `initials` undefined, derives default from `variant` ("U" for user, "AI" for agent)

**Relationships**: Used within `MessageBubble` component, can be standalone

---

### 5. Timestamp

Relative/absolute time formatter for messages.

```typescript
import { type ComponentPropsWithoutRef, type ElementRef } from 'react'

export type TimestampFormat = 'relative' | 'absolute' | 'auto'

export interface TimestampProps extends ComponentPropsWithoutRef<'time'> {
  /**
   * Date to format and display.
   */
  date: Date

  /**
   * Display format strategy.
   * - relative: "5m ago", "2h ago", "yesterday"
   * - absolute: "Nov 2, 2025 at 3:45 PM"
   * - auto: relative for recent (< 7 days), absolute for older
   * @default 'auto'
   */
  format?: TimestampFormat

  /**
   * Update interval in milliseconds for relative timestamps.
   * Set to 0 to disable auto-updates (static display).
   * @default 60000 (1 minute)
   */
  updateInterval?: number

  /**
   * Override default Tailwind classes.
   * Default: "text-xs text-timestamp font-medium"
   */
  className?: string
}

export type TimestampElement = ElementRef<'time'>
```

**State**:
```typescript
// Internal state for auto-updating relative times
type TimestampState = {
  formattedTime: string
  lastUpdate: number
}
```

**Validation Rules**:
- If `date` is in future (clock skew), displays "just now" and logs console warning
- `updateInterval` only applies to relative/auto formats
- Uses browser `Intl` APIs for localization (defaults to en-US)

**Relationships**: Used within `MessageBubble`, can be standalone

---

### 6. CopyButton

One-click clipboard copy for code blocks.

```typescript
import { type ComponentPropsWithoutRef, type ElementRef } from 'react'

export interface CopyButtonProps extends ComponentPropsWithoutRef<'button'> {
  /**
   * Text content to copy to clipboard.
   */
  text: string

  /**
   * Duration to show "Copied!" confirmation in milliseconds.
   * @default 2000
   */
  feedbackDuration?: number

  /**
   * Success icon component or element.
   * Shown after copy succeeds.
   */
  successIcon?: React.ReactNode

  /**
   * Default icon component or element.
   * Shown in idle state.
   */
  icon?: React.ReactNode

  /**
   * Callback invoked after successful copy.
   */
  onCopy?: (text: string) => void

  /**
   * Callback invoked if copy fails.
   */
  onError?: (error: Error) => void

  /**
   * Override default Tailwind classes.
   * Default: "absolute top-2 right-2 p-2 rounded hover:bg-copy-button"
   */
  className?: string
}

export type CopyButtonElement = ElementRef<'button'>
```

**State**:
```typescript
type CopyButtonState =
  | { status: 'idle' }
  | { status: 'copying' }
  | { status: 'copied'; resetAt: number }
  | { status: 'error'; message: string }
```

**State Transitions**:
```
idle → (click) → copying → (success) → copied → (timeout) → idle
                      ↓ (error)
                      error → (timeout) → idle
```

**Validation Rules**:
- Uses modern Clipboard API (`navigator.clipboard.writeText`)
- Falls back to `document.execCommand('copy')` for older browsers
- Requires HTTPS or localhost for Clipboard API (dev environment compatible)

**Relationships**: Embedded in `CodeBlock` component

---

## Utility Types

### ThemeContext

Theme provider value and hook return type.

```typescript
export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  /**
   * Current active theme.
   */
  theme: Theme

  /**
   * Set theme explicitly.
   */
  setTheme: (theme: Theme) => void

  /**
   * Toggle between light and dark.
   */
  toggleTheme: () => void
}
```

**Storage**: Persisted in `localStorage` under `cerebrobot-theme` key

---

### MarkdownComponents

Custom component overrides for react-markdown.

```typescript
import type { Components } from 'react-markdown'

export const defaultMarkdownComponents: Components = {
  // Code blocks → CodeBlock component
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
      <CodeBlock code={String(children)} language={match[1]} {...props} />
    ) : (
      <code className={cn('px-1 py-0.5 rounded bg-code-inline text-sm', className)} {...props}>
        {children}
      </code>
    )
  },

  // Links → open external in new tab, internal in same tab
  a: ({ node, href, children, ...props }) => {
    const isExternal = href?.startsWith('http')
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-link hover:text-link-hover underline"
        {...props}
      >
        {children}
      </a>
    )
  },

  // Preserve other elements with default styling
}
```

---

## Validation Summary

### TypeScript Enforcements
- No `any` types (Constitution III)
- Discriminated unions for variants (`sender: 'user' | 'agent'`, not `isUser: boolean`)
- Required vs optional props clearly defined
- Ref forwarding types (`ElementRef<'div'>`)

### Runtime Validations
- **MessageBubble**: None (parent responsible for non-empty content)
- **CodeBlock**: Language graceful fallback (invalid → plain text)
- **Avatar**: Image load error → initials fallback
- **Timestamp**: Future date → "just now" + warning
- **CopyButton**: Clipboard API error → onError callback + visual feedback

### Constitution Compliance
- ✅ **Type Safety (III)**: All interfaces use strict types, no `any`
- ✅ **Incremental (IV)**: P1 components defined (MessageBubble, CodeBlock, Avatar), P2 flagged (TypingIndicator, Timestamp, CopyButton)
- ✅ **Configuration (VI)**: All components accept className escape hatch, theme via context
- ✅ **Operator-Centric (VII)**: Clear prop documentation, sensible defaults, customizable

---

## Component Dependency Graph

```
MessageBubble
├── Avatar (optional, if avatar prop provided)
├── Timestamp (renders timestamp prop)
├── Markdown (internal, renders content)
│   └── CodeBlock (via custom component mapping)
│       └── CopyButton (embedded top-right)
└── (spread props) → HTML div attributes

TypingIndicator
└── (standalone, CSS-only animation)

ThemeProvider
├── ThemeContext
└── localStorage persistence
```

---

## Next Steps

Phase 1 deliverables:
- [x] **data-model.md**: This file (TypeScript interfaces)
- [ ] **contracts/**: Component API documentation, theme tokens reference
- [ ] **quickstart.md**: Installation, setup, usage examples
- [ ] **Update agent context**: Run `.specify/scripts/bash/update-agent-context.sh copilot`
