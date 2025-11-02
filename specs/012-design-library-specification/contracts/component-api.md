# Component API Contract

**Package**: `@workspace/ui`  
**Version**: 1.0.0 (initial)  
**Purpose**: Public API surface for consuming applications

---

## Installation

```bash
# In apps/client or any consuming package
# Already available via pnpm workspace
import { MessageBubble, CodeBlock, Avatar } from '@workspace/ui'
import '@workspace/ui/theme'  # CSS custom properties
```

---

## Component Exports

### Chat Components (P1 - MVP)

#### MessageBubble

Display user or agent chat messages with markdown rendering.

```typescript
import { MessageBubble } from '@workspace/ui'

function ChatMessage({ message }) {
  return (
    <MessageBubble
      content={message.text}
      sender={message.role}  // 'user' | 'agent'
      timestamp={new Date(message.createdAt)}
      avatar={message.avatarUrl}
      className="my-custom-class"  // Optional override
    />
  )
}
```

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `content` | `string` | ✓ | - | Markdown-formatted message content |
| `sender` | `'user' \| 'agent'` | ✓ | - | Message sender type (determines styling) |
| `timestamp` | `Date` | ✓ | - | When message was sent |
| `avatar` | `string \| null` | ✗ | `undefined` | Avatar image URL (null = initials fallback) |
| `className` | `string` | ✗ | `undefined` | Tailwind class overrides |
| `...rest` | `HTMLDivElement` | ✗ | - | Spread to root div |

**Markdown Support**:
- ✅ Headings (h1-h6)
- ✅ Paragraphs, line breaks
- ✅ Bold, italic, strikethrough (GFM)
- ✅ Lists (ordered, unordered, task lists)
- ✅ Links (external open in new tab)
- ✅ Inline code, code blocks with syntax highlighting
- ✅ Blockquotes
- ❌ Tables (future enhancement)
- ❌ Images (future enhancement)
- ❌ LaTeX math (YAGNI)

**Styling**: Automatically applies `sender` variant (user: right-aligned blue, agent: left-aligned gray).

---

#### CodeBlock

Syntax-highlighted code display with copy button.

```typescript
import { CodeBlock } from '@workspace/ui'

function CodeExample() {
  return (
    <CodeBlock
      code={`const greet = (name: string) => \`Hello, \${name}!\``}
      language="typescript"
      showLineNumbers={false}
      onCopy={(code) => console.log('Copied:', code)}
    />
  )
}
```

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `code` | `string` | ✓ | - | Source code to display |
| `language` | `string` | ✗ | `undefined` | Language for syntax highlighting |
| `showLineNumbers` | `boolean` | ✗ | `false` | Display line numbers |
| `highlightStyle` | `object` | ✗ | auto (theme) | Override syntax theme |
| `onCopy` | `(code: string) => void` | ✗ | `undefined` | Callback after copy |
| `className` | `string` | ✗ | `undefined` | Tailwind overrides |
| `...rest` | `HTMLDivElement` | ✗ | - | Spread to root div |

**Supported Languages**: 200+ via Prism (lazy loaded). Common examples: `typescript`, `javascript`, `python`, `bash`, `json`, `markdown`, `sql`, `rust`, `go`.

**Features**:
- Hover to reveal copy button (top-right corner)
- Click to copy → clipboard + "Copied!" feedback (2s)
- Light/dark theme auto-detection from `ThemeContext`
- Graceful fallback for unknown languages (monospace text, no highlighting)

---

#### Avatar

User/agent visual identifier with image or initials fallback.

```typescript
import { Avatar } from '@workspace/ui'

function MessageHeader({ user }) {
  return (
    <Avatar
      src={user.profilePicture}
      initials={user.initials}
      variant="user"
      size="md"
      alt={`${user.name}'s avatar`}
    />
  )
}
```

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `'user' \| 'agent'` | ✓ | - | Avatar type (determines colors) |
| `src` | `string \| null` | ✗ | `undefined` | Avatar image URL |
| `initials` | `string` | ✗ | auto-derived | 1-2 uppercase chars (fallback) |
| `size` | `'sm' \| 'md' \| 'lg'` | ✗ | `'md'` | Avatar size |
| `alt` | `string` | ✗ | auto | Accessibility label |
| `className` | `string` | ✗ | `undefined` | Tailwind overrides |
| `...rest` | `HTMLDivElement` | ✗ | - | Spread to root div |

**Sizes**: `sm` (24px), `md` (32px), `lg` (40px)

**Fallback Behavior**:
1. If `src` provided → attempt to load image
2. If load fails or `src` null/undefined → display `initials`
3. If `initials` undefined → derive from `variant` ("U" for user, "AI" for agent)

---

### Chat Components (P2 - Enhancements)

#### TypingIndicator

Animated feedback during agent processing.

```typescript
import { TypingIndicator } from '@workspace/ui'

function ChatView({ isAgentTyping }) {
  return (
    <>
      {messages.map(msg => <MessageBubble key={msg.id} {...msg} />)}
      {isAgentTyping && <TypingIndicator variant="dots" />}
    </>
  )
}
```

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `'dots' \| 'pulse'` | ✗ | `'dots'` | Animation style |
| `ariaLabel` | `string` | ✗ | "Agent is typing..." | Accessibility label |
| `className` | `string` | ✗ | `undefined` | Tailwind overrides |
| `...rest` | `HTMLDivElement` | ✗ | - | Spread to root div |

**Variants**:
- `dots`: Three bouncing dots (classic chat UX)
- `pulse`: Single pulsing circle (minimal design)

---

#### Timestamp

Relative/absolute time formatter for messages.

```typescript
import { Timestamp } from '@workspace/ui'

function MessageFooter({ sentAt }) {
  return <Timestamp date={sentAt} format="auto" />
}
```

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `date` | `Date` | ✓ | - | Date to format |
| `format` | `'relative' \| 'absolute' \| 'auto'` | ✗ | `'auto'` | Display strategy |
| `updateInterval` | `number` | ✗ | `60000` | Update frequency (ms, 0=static) |
| `className` | `string` | ✗ | `undefined` | Tailwind overrides |
| `...rest` | `HTMLTimeElement` | ✗ | - | Spread to `<time>` element |

**Format Examples**:
- `relative`: "just now", "5m ago", "2h ago", "yesterday"
- `absolute`: "Nov 2, 2025 at 3:45 PM"
- `auto`: relative for recent (< 7 days), absolute for older

---

#### CopyButton

One-click clipboard copy (typically embedded in CodeBlock).

```typescript
import { CopyButton } from '@workspace/ui'

function CustomContent({ text }) {
  return (
    <div className="relative">
      <pre>{text}</pre>
      <CopyButton text={text} />
    </div>
  )
}
```

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `text` | `string` | ✓ | - | Content to copy |
| `feedbackDuration` | `number` | ✗ | `2000` | "Copied!" duration (ms) |
| `icon` | `ReactNode` | ✗ | default icon | Idle state icon |
| `successIcon` | `ReactNode` | ✗ | checkmark | Success state icon |
| `onCopy` | `(text: string) => void` | ✗ | `undefined` | Success callback |
| `onError` | `(error: Error) => void` | ✗ | `undefined` | Error callback |
| `className` | `string` | ✗ | `undefined` | Tailwind overrides |
| `...rest` | `HTMLButtonElement` | ✗ | - | Spread to button |

**Clipboard API**: Uses modern `navigator.clipboard` (requires HTTPS or localhost). Falls back to `execCommand` for older browsers.

---

## Theme System

### ThemeProvider

Wrap application root to enable dark mode.

```typescript
import { ThemeProvider } from '@workspace/ui'
import '@workspace/ui/theme'  // Import CSS

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  )
}
```

### useTheme Hook

Access and control theme from any component.

```typescript
import { useTheme } from '@workspace/ui'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
    </button>
  )
}
```

**Hook Return**:
```typescript
{
  theme: 'light' | 'dark',        // Current theme
  setTheme: (theme) => void,       // Set explicitly
  toggleTheme: () => void          // Toggle light ↔ dark
}
```

**Persistence**: Theme saved to `localStorage` under `cerebrobot-theme` key. Automatically restored on page load.

---

## Type Exports

All component prop types exported for extension:

```typescript
import type {
  MessageBubbleProps,
  CodeBlockProps,
  AvatarProps,
  TypingIndicatorProps,
  TimestampProps,
  CopyButtonProps,
  Theme,
  ThemeContextValue,
} from '@workspace/ui'

// Extend props for custom wrapper
interface MyMessageBubbleProps extends MessageBubbleProps {
  reactions?: string[]
}
```

---

## Utility Exports

### `cn()` - Tailwind Merge Utility

Merge Tailwind classes with conflict resolution.

```typescript
import { cn } from '@workspace/ui'

const className = cn(
  'px-4 py-2',      // Base
  'px-6',           // Override px-4 → px-6
  isActive && 'bg-blue-500',
  className         // User override
)
```

---

## Escape Hatches

All components support customization via:

1. **className prop**: Override or extend Tailwind classes
2. **Spread props**: Pass any HTML attributes to root element
3. **Custom markdown components**: Override react-markdown renderers
4. **CSS custom properties**: Modify theme tokens in consuming app

**Example** (custom markdown link handling):

```typescript
import { MessageBubble } from '@workspace/ui'
import type { Components } from 'react-markdown'

const customComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} onClick={(e) => { /* custom handler */ }}>
      {children}
    </a>
  )
}

// Pass to MessageBubble via future `markdownComponents` prop (not yet implemented)
```

---

## Breaking Change Policy

**Versioning**: Follow SemVer (MAJOR.MINOR.PATCH)

- **MAJOR**: Breaking prop changes, removed components
- **MINOR**: New components, new optional props
- **PATCH**: Bug fixes, internal refactors

**Deprecation**: 1 minor version warning before removal

**Example**:
```typescript
// v1.0.0
<Avatar src="..." variant="user" />

// v1.1.0 - Add new optional prop
<Avatar src="..." variant="user" size="md" />

// v1.2.0 - Deprecate old prop (console warning)
<Avatar src="..." variant="user" isLarge={true} /> // Deprecated, use size="lg"

// v2.0.0 - Remove deprecated prop
<Avatar src="..." variant="user" size="lg" />
```

---

## Error Handling

**Philosophy**: Fail gracefully, not loudly.

| Scenario | Behavior |
|----------|----------|
| Invalid `language` in CodeBlock | Render as plain monospace text (no error) |
| Avatar image load failure | Fallback to initials (no error) |
| Future timestamp | Display "just now" + console warning |
| Clipboard API unavailable | Show error feedback, call `onError` callback |
| Missing ThemeProvider | Throw error (required dependency) |

**Development Mode**: PropTypes validation (future enhancement, not in v1.0.0)

---

## Performance Characteristics

| Component | Render Cost | Notes |
|-----------|------------|-------|
| MessageBubble | ~5ms | Markdown parsing cached internally |
| CodeBlock | ~10ms | Syntax highlighting lazy-loaded |
| Avatar | <1ms | Image load async, doesn't block |
| TypingIndicator | <1ms | CSS-only animation |
| Timestamp | <1ms | Native Intl API |
| CopyButton | <1ms | Stateless until click |

**Optimization Strategies**:
- MessageBubble uses `React.memo` for long chat lists
- CodeBlock lazy-loads syntax highlighter languages
- Timestamp auto-updates throttled to 1-minute intervals
- CSS animations (no JavaScript) for TypingIndicator

---

## Browser Compatibility

| Feature | Requirement | Fallback |
|---------|------------|----------|
| Clipboard API | Chrome 63+, Firefox 53+, Safari 13.1+ | `execCommand('copy')` |
| Intl.RelativeTimeFormat | Chrome 71+, Firefox 65+, Safari 14+ | None (required) |
| CSS Grid/Flexbox | All modern browsers | N/A |
| CSS Custom Properties | All modern browsers | N/A |

**Target**: Chrome, Firefox, Safari (latest 2 versions). No IE11 support.

---

## Next Steps

See [quickstart.md](../quickstart.md) for:
- Project setup
- First component usage
- Theme customization
- Common patterns
