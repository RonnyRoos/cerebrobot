# Feature Specification: Design Library for Cerebrobot

**Feature Branch**: `012-design-library-specification`  
**Created**: 2025-11-02  
**Status**: Draft  
**Phase**: 1.5 (Foundations)

---

## Mission Alignment

This spec establishes Cerebrobot's shared design system (`@workspace/ui`) as the single source of visual truth across all interfaces. It operationalizes the operator-centric design principle (Constitution VII) by creating consistent, transparent UI patterns that make the system's state observable and interactions predictable.

## Problem Statement

Currently, Cerebrobot lacks a chatbot-specific design system:
- No standardized message bubble styles (user vs. agent, colors, spacing)
- Inconsistent typography for chat content (body text, code blocks, timestamps)
- No reusable components for chat-specific patterns (typing indicators, agent avatars, message actions)
- Unclear color palette optimized for long-form reading and dark mode
- Difficult to prototype new chat features without reinventing message layouts

## User Scenarios & Testing

### User Story 1 - Display Chat Messages with Clear Visual Distinction (Priority: P1)

As an operator, I want to clearly distinguish my messages from agent responses so I can quickly scan conversation history and understand who said what.

**Why this priority**: Core chat UX—without visual distinction between user/agent messages, conversations are unreadable. P1 delivers minimal viable chat interface.

**Independent Test**: Send a user message → verify it appears with user styling (right-aligned, user color) → receive agent response → verify it appears with agent styling (left-aligned, agent color, avatar). No other features needed.

**Acceptance Scenarios**:

1. **Given** I send a message, **When** it appears in chat, **Then** message renders right-aligned with user message color and my avatar (or initials)
2. **Given** agent responds, **When** message appears, **Then** message renders left-aligned with agent message color and agent avatar
3. **Given** conversation has multiple messages, **When** I scroll chat history, **Then** user messages consistently appear on right, agent messages on left with visual distinction

---

### User Story 2 - Read Chat Content with Optimized Typography (Priority: P1)

As an operator, I want chat messages to use readable typography with proper hierarchy so I can comfortably read long AI responses without eye strain.

**Why this priority**: Typography directly affects readability—poor type choices make chat unusable. P1 because it's foundational to user experience.

**Independent Test**: Display long agent response with headings, paragraphs, and code blocks → verify readable line height, font sizing, and code block syntax highlighting. Measure readability at different zoom levels.

**Acceptance Scenarios**:

1. **Given** agent sends paragraph text, **When** message renders, **Then** body text uses readable font size (16-18px), line height (1.5-1.7), and comfortable line length (60-80 characters)
2. **Given** agent includes code block, **When** message renders, **Then** code uses monospace font, syntax highlighting, and distinct background color
3. **Given** agent uses markdown headings, **When** message renders, **Then** headings use proper hierarchy (h1 > h2 > h3) with clear size/weight distinction

---

### User Story 3 - Use Chat-Specific Color Palette (Priority: P1)

As a developer, I want to use semantic color tokens designed for chat interfaces (message-user, message-agent, code-block, timestamp-muted) so colors automatically adapt to light/dark themes and convey message context.

**Why this priority**: Chat-specific colors are required for P1 stories—generic tokens don't address chat UX needs. P1 because color is core to visual distinction.

**Independent Test**: Apply `bg-message-user` and `bg-message-agent` tokens → verify distinct colors in light mode → toggle dark mode → verify colors remain distinguishable with appropriate contrast.

**Acceptance Scenarios**:

1. **Given** user message rendered with `bg-message-user`, **When** in light mode, **Then** background uses light mode user message color (e.g., blue/purple tint)
2. **Given** agent message rendered with `bg-message-agent`, **When** in light mode, **Then** background uses light mode agent color (e.g., neutral gray)
3. **Given** dark mode enabled, **When** messages render, **Then** user and agent colors adapt to dark mode palette while maintaining distinction

---

### User Story 4 - Show Typing Indicator During Agent Responses (Priority: P2)

As an operator, I want to see a typing indicator when the agent is generating a response so I know the system is working and haven't lost connection.

**Why this priority**: Important feedback mechanism, but chat works without it (users can infer from network activity). P2 enhances UX but not critical for MVP.

**Independent Test**: Send message → verify typing indicator appears immediately → when agent response streams in → verify indicator disappears. No other components needed.

**Acceptance Scenarios**:

1. **Given** I send a message, **When** agent starts processing, **Then** typing indicator (animated dots or pulse) appears in agent message area
2. **Given** typing indicator is visible, **When** first token of agent response arrives, **Then** indicator disappears and response text begins streaming
3. **Given** network delay occurs, **When** no response after 5 seconds, **Then** typing indicator remains visible (doesn't time out prematurely)

---

### User Story 5 - Format Timestamps for Message Context (Priority: P2)

As an operator, I want to see timestamps on messages so I can track when interactions occurred and understand conversation chronology.

**Why this priority**: Helpful for context but not essential for basic chat functionality. P2 because users can infer recency from message order.

**Independent Test**: Display chat history with messages from different time periods → verify timestamps show relative time (e.g., "2m ago", "yesterday") for recent messages and absolute time for older ones.

**Acceptance Scenarios**:

1. **Given** message sent within last hour, **When** timestamp renders, **Then** displays relative time ("5m ago", "30m ago")
2. **Given** message sent yesterday, **When** timestamp renders, **Then** displays "yesterday" with time ("yesterday at 3:45 PM")
3. **Given** message sent over a week ago, **When** timestamp renders, **Then** displays full date ("Nov 2, 2025 at 3:45 PM")

---

### User Story 6 - Toggle Dark Mode for Comfortable Reading (Priority: P2)

As an operator, I want to toggle between light and dark themes so I can use the chat comfortably in different lighting conditions without eye strain.

**Why this priority**: Important for comfort during long sessions, but chat works in light mode. P2 enhances experience but not critical for MVP.

**Independent Test**: Click dark mode toggle → verify all chat components (messages, code blocks, input field) switch to dark variants → refresh page → verify preference persists.

**Acceptance Scenarios**:

1. **Given** chat loads in light mode, **When** I toggle dark mode, **Then** all components immediately switch to dark theme with appropriate contrast
2. **Given** dark mode enabled, **When** I refresh page, **Then** dark mode persists (loaded from localStorage)
3. **Given** code blocks in messages, **When** dark mode active, **Then** syntax highlighting uses dark-compatible colors

---

### User Story 7 - Copy Code Blocks with One Click (Priority: P3)

As an operator, I want to copy code blocks from agent responses with a single click so I can quickly use code snippets without manual selection.

**Why this priority**: Nice-to-have convenience—users can manually select and copy. P3 because it doesn't block core functionality.

**Independent Test**: Display message with code block → hover to reveal copy button → click button → verify code copied to clipboard → paste into editor → verify code matches original.

**Acceptance Scenarios**:

1. **Given** message contains code block, **When** I hover over code, **Then** copy button appears in top-right corner
2. **Given** copy button visible, **When** I click it, **Then** code copies to clipboard and button shows "Copied!" confirmation
3. **Given** code copied, **When** I paste into text editor, **Then** pasted content matches code block exactly (preserves formatting)

---

### Edge Cases

- **Empty messages**: What if consuming application renders MessageBubble with empty content? (MessageBubble should render gracefully with minimum height, avoiding layout collapse; input validation is consuming application's responsibility)
- **Very long messages**: What if agent response exceeds 10,000 characters? (Message should scroll within bubble, not expand indefinitely; consider "show more" collapse)
- **Code block without language**: What if code block has no specified language? (Use generic monospace styling without syntax highlighting)
- **Rapid message sending**: What if user sends 10 messages quickly before agent responds? (All user messages should render in sequence; typing indicator appears after last user message)
- **Theme switch mid-stream**: What if user toggles theme while agent is streaming response? (Theme should update immediately without interrupting stream)
- **Timestamp edge cases**: What if message timestamp is in future due to clock skew? (Display "just now" and log warning in console)
- **Markdown rendering errors**: If markdown parser encounters malformed/complex markdown causing rendering error, MessageBubble wraps content in Error Boundary that displays "Message failed to render" with clipboard copy button, prevents crash propagation to parent components, logs error details for debugging

## Requirements

### Functional Requirements

**Chat Message Components**:
- **FR-001**: System MUST provide MessageBubble component with user and agent variants (visual distinction via alignment and color)
- **FR-002**: MessageBubble MUST support markdown rendering (headings, paragraphs, lists, links, code blocks) with XSS protection via react-markdown's default AST-based sanitization
- **FR-003**: System MUST provide CodeBlock component with syntax highlighting and copy-to-clipboard functionality
- **FR-004**: System MUST provide TypingIndicator component with animated visual feedback
- **FR-005**: System MUST provide Avatar component supporting images, initials fallback, and agent/user variants

**Typography System**:
- **FR-006**: System MUST define chat-optimized typography scale for body text (16px base, 1.6 line height)
- **FR-007**: System MUST define heading hierarchy for message content (h1: 24px, h2: 20px, h3: 18px, h4: 16px)
- **FR-008**: System MUST use monospace font for code blocks and inline code (14px for blocks, 15px for inline)
- **FR-009**: System MUST define timestamp typography (13px, muted color, medium weight)

**Color System**:
- **FR-010**: System MUST provide semantic color tokens for chat context:
  - `--color-message-user`: User message background
  - `--color-message-agent`: Agent message background
  - `--color-message-user-text`: User message text (ensure WCAG AA contrast)
  - `--color-message-agent-text`: Agent message text
  - `--color-code-block-bg`: Code block background
  - `--color-code-block-border`: Code block border
  - `--color-timestamp`: Timestamp text (muted)
  - `--color-link`: Hyperlink color
  - `--color-link-hover`: Hyperlink hover state
- **FR-011**: All color tokens MUST have light and dark mode variants
- **FR-012**: Color contrast between message background and text MUST meet WCAG AA standards (4.5:1 for normal text)

**Theme System**:
- **FR-013**: System MUST support dark mode via `dark` class on root HTML element
- **FR-014**: System MUST persist theme preference in localStorage under `cerebrobot-theme` key
- **FR-015**: Theme toggle MUST update all chat components instantly without page reload

**Utility Components**:
- **FR-016**: System MUST provide Timestamp component with relative/absolute time formatting
- **FR-017**: System MUST provide CopyButton component for code blocks

**Layout & Spacing**:
- **FR-019**: System MUST define consistent message spacing (gap between messages: 12-16px)
- **FR-020**: System MUST define message bubble padding (12-16px vertical, 16-20px horizontal)
- **FR-021**: System MUST support responsive message widths (max 65% viewport width, adapts to mobile)

### Key Entities

- **MessageBubble**: Chat message container with user/agent variants. Properties: content (markdown string), sender type, timestamp, avatar. Handles markdown rendering and layout.
- **CodeBlock**: Syntax-highlighted code display with copy functionality. Properties: code string, language hint, show line numbers. Includes copy button and syntax theme (light/dark).
- **TypingIndicator**: Animated feedback during agent processing. Properties: variant (dots, pulse, skeleton). Shows/hides based on agent state.
- **Avatar**: User/agent visual identifier. Properties: image URL or initials, variant (user/agent), size (sm, md, lg). Circular or rounded square.
- **ColorToken**: Semantic color mapping for chat contexts. Light/dark variants defined in CSS custom properties. Maps intent (user message, agent message, code) to HSL values.
- **TypographyScale**: Font size, weight, line height, and letter spacing definitions optimized for chat readability. Separate scales for body, headings, code, timestamps.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Operator can visually distinguish user messages from agent responses within 1 second of viewing chat (measured via user testing with 90%+ accuracy)
- **SC-002**: Chat interface maintains readable typography across viewport sizes (16-18px body text, 1.5-1.7 line height on desktop; scales appropriately on mobile)
- **SC-003**: All text-on-background combinations meet WCAG AA contrast standards (4.5:1 minimum) in both light and dark modes
- **SC-004**: Code blocks render with syntax highlighting and copy button appears on hover within 200ms
- **SC-005**: Dark mode toggle switches theme instantly (under 100ms perceived delay) without flashing or layout shift
- **SC-006**: Typing indicator appears within 500ms of message send and disappears immediately when response starts
- **SC-007**: Operators can read 500+ line agent responses comfortably without horizontal scrolling or excessive vertical scrolling per message (message bubbles should not exceed 80% viewport height before scroll)
- **SC-008**: Developers can build new chat features using design system components in under 45 minutes (measured from starting new feature to working prototype)

## Scope & Boundaries

### In Scope

- **Chat-specific components**: MessageBubble, CodeBlock, TypingIndicator, Avatar, Timestamp, CopyButton
- **Chat-optimized typography**: Body text (16-18px, 1.5-1.7 line height), headings, code, timestamps with chat readability focus
- **Chat-specific color palette**: User/agent message colors, code block styling, link colors, timestamp muted colors
- **Markdown rendering**: Support for headings, paragraphs, lists, links, inline code, code blocks in messages
- **Theme system**: Light/dark modes optimized for long-form reading in chat context
- **Message layout patterns**: Alignment (user right, agent left), spacing, max-width constraints, responsive behavior

### Out of Scope

- **Message composition UI**: Text input field, send button, attachment controls (separate feature)
- **Chat history management**: Scrolling virtualization, lazy loading, pagination (performance optimization, separate feature)
- **Real-time streaming UI**: How agent responses stream token-by-token (WebSocket integration, separate feature)
- **Agent selection UI**: Dropdown or sidebar to choose which agent to chat with (separate feature)
- **Memory graph visualization**: UI for viewing/editing memory nodes (separate feature per spec 010)
- **Authentication UI**: Login, signup, session management (Phase 2+)
- **Advanced markdown**: Tables, footnotes, LaTeX math rendering (YAGNI for MVP)
- **Message search/filtering**: Full-text search, date filters (future enhancement)

## Assumptions

1. **Markdown as primary format**: Assumes agent responses use markdown for formatting (not rich text or custom syntax)
2. **Read-heavy UX**: Assumes operators spend more time reading agent responses than writing messages (optimizes for readability over input efficiency)
3. **Single conversation view**: Assumes UI shows one active conversation at a time (not multi-pane or split-screen)
4. **Modern browsers**: Targets Chrome, Firefox, Safari latest 2 versions; no IE11 support needed
5. **Monorepo workspace**: Assumes `@workspace/ui` can be consumed by `apps/client` via pnpm workspace protocol
6. **localStorage for theme**: Assumes client-side theme preference storage is acceptable (no server-side sync)
7. **Code block use cases**: Assumes primary use is displaying code snippets (not full file content or diffs)
8. **Avatar images**: Assumes avatar images are optional; initials fallback is acceptable for MVP

## Open Questions

1. **Syntax highlighting library**: Should we use Prism.js, Highlight.js, or Shiki for code block syntax highlighting? *(Resolved in research.md: react-syntax-highlighter with Prism backend)*
2. **Markdown renderer**: Should we use react-markdown, marked, or remark for markdown-to-HTML conversion? *(Resolved in research.md: react-markdown + remark-gfm)*
3. **Link handling**: Should external links in messages open in new tab, same tab, or show preview modal before navigation? *(Resolved in contracts/component-api.md: new tab with rel="noopener noreferrer")*

## Clarifications

### Session 2025-11-02

- **Q**: If markdown parser encounters malformed/complex markdown causing rendering error, how should MessageBubble handle this to prevent app crashes while maintaining usability?  
  **A**: Option B - Wrap markdown renderer in Error Boundary that displays "Message failed to render" with clipboard copy button (allows copying raw content without exposing broken markup), prevents error propagation, logs to console for debugging

- **Q**: How should the MessageBubble component ensure XSS safety when rendering user-provided markdown content?  
  **A**: Option A - Trust react-markdown's default sanitization (unified/remark AST-based rendering, never uses dangerouslySetInnerHTML, blocks script/iframe/object tags by default)

## Design Principles

### 1. Clarity Over Cleverness
Every component should have obvious purpose and predictable behavior. Avoid abstract names; prefer `MessageInput` over `EnhancedTextArea`.

### 2. Composable Primitives
Favor small, focused components that compose into complex UIs. A `Card` component should handle layout and borders; content styling happens via children.

### 3. Escape Hatches Required
All components must accept `className` for Tailwind overrides and spread `...props` for edge cases. Never lock operators into rigid patterns.

## Technical Architecture

### Package Layout

```
packages/ui/
├── src/
│   ├── chat/                # Chat-specific components
│   │   ├── message-bubble.tsx
│   │   ├── code-block.tsx
│   │   ├── typing-indicator.tsx
│   │   ├── avatar.tsx
│   │   ├── timestamp.tsx
│   │   └── copy-button.tsx
│   ├── primitives/          # Generic ShadCN base components (button, input, etc.)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── select.tsx
│   ├── utils/
│   │   ├── cn.ts            # Tailwind merge utility
│   │   ├── markdown.ts      # Markdown rendering helpers
│   │   └── theme.ts         # Dark mode helpers
│   └── theme/
│       ├── globals.css      # CSS custom properties
│       ├── chat-colors.css  # Chat-specific color tokens
│       └── typography.css   # Typography scale & chat-optimized styles
├── components.json          # ShadCN CLI config
├── tailwind.config.ts       # Theme tokens (chat colors, typography)
└── tsconfig.json
```

### Chat-Specific Color System

**Message Colors**:
- `--color-message-user-bg`: User message background (light: soft blue/purple tint; dark: deep blue/purple)
- `--color-message-user-text`: User message text (ensure 4.5:1 contrast with bg)
- `--color-message-agent-bg`: Agent message background (light: light gray; dark: dark gray)
- `--color-message-agent-text`: Agent message text

**Code Block Colors**:
- `--color-code-block-bg`: Code background (light: near-white; dark: near-black)
- `--color-code-block-border`: Code border (subtle, 1px)
- `--color-code-inline-bg`: Inline code background (slightly different from block)

**Utility Colors**:
- `--color-timestamp`: Timestamp text (muted, lower contrast)
- `--color-link`: Hyperlink color (distinct from text, maintains contrast)
- `--color-link-hover`: Hyperlink hover/active state
- `--color-copy-button`: Copy button color (appears on hover)
- `--color-copy-button-success`: Copy button after click (green confirmation)

**Design Philosophy**: All colors use HSL format for easy theme adjustment. User/agent distinction should be immediately obvious but not distracting.

### Typography for Chat Readability

**Body Text (Message Content)**:
- Font size: 16px (desktop), 16px (mobile)—no smaller for readability
- Line height: 1.6 (comfortable for long-form reading)
- Line length: Max 65 characters per line (achieved via max-width on message bubbles)
- Font weight: 400 (normal) for body, 500 (medium) for emphasis

**Headings (in Messages)**:
- H1: 24px, 700 weight, 1.3 line height, 0.75em margin-bottom
- H2: 20px, 600 weight, 1.4 line height, 0.5em margin-bottom
- H3: 18px, 600 weight, 1.4 line height, 0.5em margin-bottom
- H4: 16px, 600 weight, 1.5 line height, 0.5em margin-bottom

**Code**:
- Monospace font (system default: Menlo, Monaco, Consolas)
- Inline code: 15px, padding 2px 4px, subtle background
- Code block: 14px, padding 16px, 1.5 line height, syntax highlighting

**Timestamps**:
- Font size: 13px
- Color: `--color-timestamp` (muted)
- Weight: 500 (medium)
- Position: Below message bubble, aligned with bubble edge

### Component API Patterns

All chat components follow this contract:

```typescript
export interface MessageBubbleProps {
  content: string;          // Markdown content
  sender: 'user' | 'agent';
  timestamp: Date;
  avatar?: string | null;   // Image URL or null for initials
  className?: string;       // Tailwind overrides
}

export interface CodeBlockProps {
  code: string;
  language?: string;        // For syntax highlighting hint
  showLineNumbers?: boolean;
  className?: string;
}

export interface TypingIndicatorProps {
  variant?: 'dots' | 'pulse';
  className?: string;
}
```

### Dark Mode Implementation

Use Tailwind's `class` strategy:

```tsx
// Root layout toggles class
<html className={isDark ? 'dark' : ''}>
  {children}
</html>

// Chat components use dark: prefix
<div className="bg-message-agent-bg text-message-agent-text dark:bg-message-agent-bg-dark dark:text-message-agent-text-dark">
```

**Storage**: Persist theme preference in `localStorage` under `cerebrobot-theme` key.

## Component Catalog (Chat Focus)

### Chat Components (Priority: P1)
1. **MessageBubble**: User/agent message container with markdown rendering, alignment, and styling
2. **CodeBlock**: Syntax-highlighted code display with copy button
3. **Avatar**: Circular user/agent identifier with image or initials

### Chat Components (Priority: P2)
4. **TypingIndicator**: Animated feedback during agent processing
5. **Timestamp**: Relative/absolute time formatter
6. **CopyButton**: One-click clipboard copy for code blocks

### Generic Primitives (from ShadCN)
7. **Button**: Basic action button (used in chat controls)
8. **Input**: Text input (used in message compose, not part of this spec)

## References

- [ShadCN UI Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Customization](https://tailwindcss.com/docs/configuration)
- [Radix UI Primitives](https://www.radix-ui.com/primitives) (ShadCN's foundation)
- [Constitution Principle VII (Operator-Centric Design)](../../.specify/memory/constitution.md)
- [Constitution Principle IV (Incremental Development)](../../.specify/memory/constitution.md)

---

**Next Steps**: Create `plan.md` and `tasks.md` for implementation roadmap using `/speckit.plan` and `/speckit.tasks` commands.
