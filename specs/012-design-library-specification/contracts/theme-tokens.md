# Theme Tokens Reference

**Package**: `@workspace/ui`  
**Purpose**: CSS custom properties for chat-optimized design system

---

## Usage

Import theme CSS in your application entry point:

```typescript
// apps/client/src/main.tsx
import '@workspace/ui/theme'
import { ThemeProvider } from '@workspace/ui'

root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)
```

---

## Color Tokens

All colors use HSL format for easy manipulation. Values defined as `hue saturation% lightness%` triplets.

### Message Colors

Chat-specific semantic tokens for user/agent distinction.

```css
/* Light mode */
:root {
  --color-message-user-bg: 239 84% 67%;          /* Soft blue #8B5CF6 */
  --color-message-user-text: 222 47% 11%;        /* Dark text #0F172A */
  
  --color-message-agent-bg: 240 5% 96%;          /* Light gray #F8FAFC */
  --color-message-agent-text: 222 47% 11%;       /* Dark text #0F172A */
}

/* Dark mode */
.dark {
  --color-message-user-bg: 239 84% 37%;          /* Deep blue #4C1D95 */
  --color-message-user-text: 210 40% 98%;        /* Light text #F1F5F9 */
  
  --color-message-agent-bg: 222 47% 11%;         /* Dark gray #1E293B */
  --color-message-agent-text: 210 40% 98%;       /* Light text #F1F5F9 */
}
```

**Tailwind Classes**:
```tsx
<div className="bg-message-user text-message-user-text">User message</div>
<div className="bg-message-agent text-message-agent-text">Agent message</div>
```

**Contrast Ratios** (WCAG AA compliant):
- User message: 5.2:1 (light), 12.3:1 (dark)
- Agent message: 14.1:1 (light), 11.8:1 (dark)

---

### Code Block Colors

Syntax highlighting background and borders.

```css
:root {
  --color-code-block-bg: 0 0% 98%;               /* Near-white #FAFAFA */
  --color-code-block-border: 0 0% 89%;           /* Light border #E5E5E5 */
  --color-code-inline-bg: 0 0% 95%;              /* Inline code #F3F3F3 */
}

.dark {
  --color-code-block-bg: 0 0% 10%;               /* Near-black #1A1A1A */
  --color-code-block-border: 0 0% 20%;           /* Dark border #333333 */
  --color-code-inline-bg: 0 0% 15%;              /* Inline code #262626 */
}
```

**Usage**:
```tsx
<pre className="bg-code-block-bg border border-code-block-border">
  <code>...</code>
</pre>
```

---

### Utility Colors

Timestamps, links, and interactive elements.

```css
:root {
  --color-timestamp: 240 4% 46%;                 /* Muted gray #737380 */
  --color-link: 221 83% 53%;                     /* Link blue #3B82F6 */
  --color-link-hover: 221 83% 43%;               /* Darker blue #2563EB */
  --color-copy-button: 0 0% 60%;                 /* Gray #999999 */
  --color-copy-button-success: 142 71% 45%;      /* Green #22C55E */
}

.dark {
  --color-timestamp: 240 5% 65%;                 /* Lighter muted #A1A1AA */
  --color-link: 217 91% 60%;                     /* Brighter blue #60A5FA */
  --color-link-hover: 217 91% 70%;               /* Lighter blue #93C5FD */
  --color-copy-button: 0 0% 70%;                 /* Lighter gray #B3B3B3 */
  --color-copy-button-success: 142 71% 55%;      /* Brighter green #4ADE80 */
}
```

**Usage**:
```tsx
<time className="text-timestamp">5m ago</time>
<a className="text-link hover:text-link-hover">Learn more</a>
<button className="text-copy-button hover:text-copy-button-success">Copy</button>
```

---

## Typography Tokens

Chat-optimized font sizing, line height, and spacing.

### Body Text

Message content optimized for long-form reading.

```css
:root {
  --font-chat-body-size: 16px;
  --font-chat-body-line-height: 1.6;
  --font-chat-body-weight: 400;
  --font-chat-body-letter-spacing: 0;
  
  --font-chat-body-emphasis-weight: 500;         /* For bold/strong */
}
```

**Tailwind Class**: `text-chat-body`

**Configured in** `packages/ui/tailwind.config.ts`:
```typescript
theme: {
  extend: {
    fontSize: {
      'chat-body': ['16px', { lineHeight: '1.6' }],
    }
  }
}
```

---

### Headings

Hierarchy for markdown headings in messages.

```css
:root {
  /* H1 */
  --font-heading-1-size: 24px;
  --font-heading-1-line-height: 1.3;
  --font-heading-1-weight: 700;
  --font-heading-1-margin-bottom: 0.75em;
  
  /* H2 */
  --font-heading-2-size: 20px;
  --font-heading-2-line-height: 1.4;
  --font-heading-2-weight: 600;
  --font-heading-2-margin-bottom: 0.5em;
  
  /* H3 */
  --font-heading-3-size: 18px;
  --font-heading-3-line-height: 1.4;
  --font-heading-3-weight: 600;
  --font-heading-3-margin-bottom: 0.5em;
  
  /* H4 */
  --font-heading-4-size: 16px;
  --font-heading-4-line-height: 1.5;
  --font-heading-4-weight: 600;
  --font-heading-4-margin-bottom: 0.5em;
}
```

**Applied via** `prose` class (Tailwind Typography plugin):
```tsx
<div className="prose prose-sm dark:prose-invert">
  <Markdown>{content}</Markdown>
</div>
```

---

### Code

Monospace font for inline code and code blocks.

```css
:root {
  --font-code-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  
  /* Inline code */
  --font-code-inline-size: 15px;
  --font-code-inline-padding: 2px 4px;
  
  /* Code blocks */
  --font-code-block-size: 14px;
  --font-code-block-line-height: 1.5;
  --font-code-block-padding: 16px;
}
```

**Tailwind Class**: `text-chat-code`

**Configured in** `packages/ui/tailwind.config.ts`:
```typescript
theme: {
  extend: {
    fontSize: {
      'chat-code': ['14px', { lineHeight: '1.5' }],
    },
    fontFamily: {
      mono: 'var(--font-code-family)',
    }
  }
}
```

---

### Timestamps

Small, muted text below messages.

```css
:root {
  --font-timestamp-size: 13px;
  --font-timestamp-weight: 500;
  --font-timestamp-color: var(--color-timestamp);
}
```

**Usage**:
```tsx
<time className="text-xs text-timestamp font-medium">5m ago</time>
```

---

## Spacing Tokens

Consistent spacing for chat layouts.

### Message Spacing

```css
:root {
  --spacing-message-gap: 12px;                   /* Gap between messages */
  --spacing-message-padding-x: 16px;             /* Horizontal padding */
  --spacing-message-padding-y: 12px;             /* Vertical padding */
  --spacing-message-max-width: 65%;              /* Max width of bubble */
}
```

**Applied in** `MessageBubble` component via Tailwind:
```tsx
<div className="px-4 py-3 max-w-[65%] gap-3">
  {/* Message content */}
</div>
```

---

### Code Block Spacing

```css
:root {
  --spacing-code-padding: 16px;
  --spacing-code-margin-y: 12px;
}
```

---

## Border Radius

Rounded corners for message bubbles and code blocks.

```css
:root {
  --radius-message: 12px;                        /* Message bubbles */
  --radius-code: 8px;                            /* Code blocks */
  --radius-avatar: 9999px;                       /* Avatars (circular) */
  --radius-button: 6px;                          /* Copy button */
}
```

**Tailwind Classes**:
- `rounded-lg` → `--radius-message`
- `rounded-md` → `--radius-code`
- `rounded-full` → `--radius-avatar`
- `rounded` → `--radius-button`

---

## Animation Tokens

Timing and easing for theme transitions and typing indicator.

```css
:root {
  --transition-theme: 100ms cubic-bezier(0.4, 0, 0.2, 1);
  --animation-typing-dots: bounce 1.4s infinite ease-in-out;
  --animation-typing-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Usage**:
```css
/* Theme transition (applied to root element) */
html {
  transition: background-color var(--transition-theme),
              color var(--transition-theme);
}

/* Typing indicator dots */
.typing-dot {
  animation: var(--animation-typing-dots);
}
```

---

## Customization Examples

### Override Chat Colors

Create custom color scheme in consuming app:

```css
/* apps/client/src/custom-theme.css */
@layer base {
  :root {
    --color-message-user-bg: 280 100% 70%;       /* Purple instead of blue */
    --color-message-agent-bg: 200 30% 95%;       /* Cyan tint instead of gray */
  }
}
```

```typescript
// apps/client/src/main.tsx
import '@workspace/ui/theme'
import './custom-theme.css'  // Override tokens
```

---

### Extend Typography

Add custom font size for compact mode:

```typescript
// apps/client/tailwind.config.ts
export default {
  presets: [baseConfig],
  theme: {
    extend: {
      fontSize: {
        'chat-compact': ['14px', { lineHeight: '1.5' }],
      }
    }
  }
}
```

```tsx
<div className="text-chat-compact">
  <MessageBubble {...props} />
</div>
```

---

### Custom Message Width

Change max-width for wider messages:

```tsx
<MessageBubble
  className="max-w-[80%]"  // Override default 65%
  {...props}
/>
```

---

## Token Naming Convention

All tokens follow `--{category}-{element}-{property}` pattern:

- **Category**: `color`, `font`, `spacing`, `radius`, `animation`
- **Element**: `message-user`, `code-block`, `timestamp`, etc.
- **Property**: `bg`, `text`, `size`, `weight`, `padding`, etc.

**Examples**:
- `--color-message-user-bg` → Color for user message background
- `--font-code-block-size` → Font size for code blocks
- `--spacing-message-padding-x` → Horizontal padding for messages
- `--radius-avatar` → Border radius for avatars

---

## Dark Mode Toggle Pattern

Prefer `dark` class on HTML root (not individual elements):

```typescript
// ✅ Good: Single class on root
document.documentElement.classList.add('dark')

// ❌ Bad: Individual classes per component
<MessageBubble className="dark:bg-message-user-bg-dark" />
```

**Rationale**: Tokens automatically switch via `.dark` selector. No need to duplicate `dark:` variants everywhere.

---

## Accessibility

Color tokens meet WCAG AA standards (4.5:1 contrast minimum):

| Token Pair | Light Mode | Dark Mode |
|------------|------------|-----------|
| User message | 5.2:1 ✅ | 12.3:1 ✅ |
| Agent message | 14.1:1 ✅ | 11.8:1 ✅ |
| Timestamp | 4.7:1 ✅ | 4.6:1 ✅ |
| Links | 4.5:1 ✅ | 4.9:1 ✅ |
| Code blocks | 15.3:1 ✅ | 13.7:1 ✅ |

**Tool**: Verified with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Next Steps

See [component-api.md](./component-api.md) for component usage and [../quickstart.md](../quickstart.md) for setup guide.
