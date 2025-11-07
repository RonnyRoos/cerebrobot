# Design System Context for Product Managers

**Purpose**: This document provides essential context about the Neon Flux design system for PMs writing feature specifications. It explains what exists, how it works, and how to reference it in specs.

**Last Updated**: 2025-11-05  
**Spec Reference**: [013-neon-flux-design-system](../../specs/013-neon-flux-design-system/)

---

## Quick Reference for Spec Writers

### What to Include in Specs

When writing feature specs that involve UI, reference the design system like this:

```markdown
## UI Components Required

- Use `Button` primitive with `variant="primary"` for main actions
- Use `Stack` with `spacing="4"` for vertical layouts
- Use `Text` with `variant="heading-2"` for section titles
- Apply glassmorphism pattern (see Design System Context) for card surfaces
```

### Key Terminology

- **Design Tokens**: Named CSS variables for colors, spacing, typography (e.g., `--color-text-primary`, `--space-4`)
- **Component Primitives**: Core building blocks (Box, Stack, Text, Button)
- **Neon Flux Theme**: Dark-mode-first aesthetic with purple/blue gradients and glassmorphism
- **Glassmorphism**: Semi-transparent backgrounds with blur effects (Neon Flux signature look)

---

## What Exists Now (Implementation Status)

### ✅ Fully Implemented (Ready to Use)

**Token System**:
- Color tokens (primitives + semantic)
- Spacing scale (4px base unit: `--space-1` through `--space-16`)
- Typography tokens (font sizes, weights, line heights)
- Shadow tokens (elevation + Neon Flux glows)
- Border radius tokens
- Blur tokens (glassmorphism)

**Component Primitives**:
- `Box` - Low-level layout primitive (polymorphic, token props)
- `Stack` - Vertical/horizontal layouts with consistent spacing
- `Text` - Typography with semantic variants (heading-1, body, code, etc.)
- `Button` - Interactive buttons with theme-aware variants

**Theme System**:
- Dark/light/high-contrast theme switching
- LocalStorage persistence
- Theme provider component (`<Theme>`)
- `useTheme` hook for JavaScript access

**Documentation**:
- Storybook catalog at `http://localhost:6006`
- Interactive component playground
- Token reference pages
- All components documented with examples

**Chat Components** (Migrated):
- `MessageBubble` - Uses new token system
- `CodeBlock` - Uses semantic tokens
- Both use glassmorphism effects

### 🚧 Partially Implemented

**User Story 5** (P3 - Not Started):
- Agents page still uses old styling (not migrated to design system)
- Thread list view still uses old styling

### ❌ Not Implemented (Optional)

**Phase 8 Polish Tasks**:
- ESLint rule to detect hardcoded colors/spacing
- Full accessibility audit across all pages
- Migration guide documentation
- Performance audits

---

## Design System Capabilities

### What You Can Specify in Feature Specs

#### Layout & Structure

```markdown
**Layout Requirements**:
- Use Stack component with spacing="4" for vertical card list
- Use Box primitive with p="6" for card padding
- Use glassmorphism pattern for surface backgrounds
```

**Available spacing values**: 1, 2, 3, 4, 5, 6, 8, 10, 12, 16 (maps to 4px, 8px, 12px, etc.)

#### Typography

```markdown
**Text Hierarchy**:
- Page title: Text variant="heading-1" (36px, bold)
- Section title: Text variant="heading-2" (30px, bold)
- Body text: Text variant="body" (16px, normal)
- Captions: Text variant="caption" (14px, muted color)
- Code: Text variant="code" (monospace, 14px)
```

**Available text variants**: heading-1, heading-2, heading-3, heading-4, body, body-large, body-small, caption, code, label

#### Colors

```markdown
**Color Usage**:
- Primary actions: accent-primary (purple in Neon Flux)
- Secondary actions: accent-secondary (blue in Neon Flux)
- Text: text-primary (high contrast), text-secondary (muted)
- Backgrounds: bg-surface (main), bg-elevated (cards/modals)
- Borders: border-subtle (low contrast dividers)
```

**Semantic tokens** (automatically adapt to theme):
- `text-primary`, `text-secondary`, `text-on-dark`
- `bg-surface`, `bg-elevated`
- `accent-primary`, `accent-secondary`
- `border-subtle`

**Do NOT specify** hex codes or hardcoded colors in specs - use semantic token names.

#### Interactive Elements

```markdown
**Button Requirements**:
- Save action: Button variant="primary"
- Cancel action: Button variant="secondary"
- Delete action: Button variant="destructive"
- Edit icon: Button variant="ghost" size="sm" iconOnly={<EditIcon />}
```

**Button variants**: primary, secondary, ghost, destructive  
**Button sizes**: sm, md (default), lg  
**Button states**: loading, disabled

#### Glassmorphism (Neon Flux Aesthetic)

```markdown
**Visual Style**:
- Apply glassmorphism pattern to agent cards:
  - Semi-transparent background (20% opacity)
  - Blur effect (backdrop-filter: blur-md)
  - Subtle border
  - Purple glow shadow for user content
  - Blue glow shadow for AI content
```

**When to use glassmorphism**:
- Cards and surfaces in dark mode
- Floating panels/modals
- Message bubbles
- Navigation elements

**When NOT to use glassmorphism**:
- High-contrast theme (automatically disabled)
- User prefers reduced motion (automatically disabled)
- Overlays with critical text (contrast issues)

---

## Neon Flux Theme Characteristics

### Visual Language

**Color Palette**:
- **Primary Accent**: Purple (#a855f7) - user interactions, highlights
- **Secondary Accent**: Blue (#3b82f6) - AI/agent content
- **Tertiary Accents**: Pink (#ec4899), Cyan (#06b6d4) - decorative
- **Background**: Deep dark (#0a0a0f) with subtle gradients
- **Text**: Light neutral (#f8fafc) for readability on dark

**Signature Effects**:
- **Glow Shadows**: Soft neon glows around cards/buttons (purple, blue, pink, cyan)
- **Glassmorphism**: Semi-transparent surfaces with blur
- **Gradients**: Subtle radial/linear gradients for depth
- **Animated Backgrounds**: Subtle particle effects (optional, not in design system yet)

**Typography**:
- **Font Family**: Geist (sans-serif), Geist Mono (monospace)
- **Scale**: 12px (xs) to 36px (4xl)
- **Line Height**: 1.2 (tight for headings) to 1.6 (normal for body)

### Theme Variants

**Dark Mode** (Default - Neon Flux):
- Deep dark backgrounds
- Light text
- Vibrant accent colors
- Full glassmorphism effects

**Light Mode**:
- Light backgrounds
- Dark text
- Muted accent colors
- Reduced glassmorphism (subtle)

**High-Contrast Mode** (Accessibility):
- Pure black/white backgrounds
- Maximum contrast text
- No gradients (replaced with solids)
- No glassmorphism (accessibility conflict)
- Meets WCAG AAA (7:1 contrast)

---

## How to Reference the Design System in Specs

### Example: Agent Card Feature

```markdown
## UI Design

### Agent Card Component

**Layout**:
- Use Stack component with direction="vertical" and spacing="4"
- Card surface: Box with p="6", borderRadius="xl", glassmorphism pattern
- Header: Stack direction="horizontal", justify="space-between", align="center"

**Typography**:
- Agent name: Text variant="heading-3", color="text-primary"
- Agent description: Text variant="body-small", color="text-secondary", truncate={2}
- Status indicator: Text variant="caption", color="accent-primary"

**Interactive Elements**:
- Edit button: Button variant="ghost", size="sm", iconOnly={<EditIcon />}
- Delete button: Button variant="destructive", size="sm"
- View details: Button variant="secondary", fullWidth

**Visual Effects**:
- Apply purple glow shadow (shadow-glow-purple) on hover
- Glassmorphism: bg-surface/20, backdrop-blur-md, border-subtle/30

**Accessibility**:
- Edit/delete buttons must have aria-label
- Card clickable area must be keyboard accessible
- Status color must meet WCAG AA contrast (handled by tokens)
```

### Example: Form Layout

```markdown
## Form UI

**Layout**:
- Form container: Stack spacing="6"
- Each field group: Stack spacing="2"
- Field label: Text as="label", variant="label", color="text-primary"
- Field input: Native input with token-based styling (see Design System)
- Error message: Text variant="caption", color="error"

**Buttons**:
- Submit: Button variant="primary", loading={isSubmitting}, fullWidth
- Cancel: Button variant="secondary"

**Spacing**:
- Form padding: p="8" (32px)
- Field spacing: spacing="6" (24px between fields)
- Button spacing: spacing="4" (16px between cancel/submit)
```

### Example: Navigation

```markdown
## Navigation Bar

**Layout**:
- Container: Box as="nav", display="flex", justify="space-between", align="center", p="4"
- Left section: Stack direction="horizontal", spacing="4", align="center"
- Right section: Stack direction="horizontal", spacing="2", align="center"

**Links**:
- Active link: Text variant="body", weight="semibold", color="accent-primary"
- Inactive link: Text variant="body", weight="normal", color="text-secondary"

**Theme Toggle**:
- Button variant="ghost", size="sm", iconOnly={<ThemeIcon />}
- Use useTheme hook for toggle functionality
```

---

## Common Patterns to Reference

### Glassmorphic Card

```markdown
**Glassmorphic Card Pattern**:
- Background: bg-surface with 20% opacity
- Blur: backdrop-blur-md (12px)
- Border: 1px solid border-subtle with 30% opacity
- Shadow: shadow-glow-purple or shadow-glow-blue
- Border radius: radius-xl (24px for large cards) or radius-lg (16px for small cards)
```

### Message Bubble Layout

```markdown
**Message Bubble Pattern**:
- User messages: accent-primary background, shadow-glow-purple, align right
- Agent messages: accent-secondary background, shadow-glow-blue, align left
- Padding: p="5" (20px)
- Border radius: radius-xl (24px)
- Text color: text-on-dark
- Background opacity: 20% with glassmorphism
```

### List View

```markdown
**List View Pattern**:
- Container: Stack spacing="4"
- List items: Box with p="4", borderRadius="lg", hover:bg-surface/10
- Item layout: Stack direction="horizontal", justify="space-between", align="center"
- Item text: Text variant="body" (primary), variant="caption" (secondary)
- Actions: Stack direction="horizontal", spacing="2"
```

### Empty State

```markdown
**Empty State Pattern**:
- Container: Box display="flex", flexDirection="column", align="center", justify="center", minHeight="400px"
- Icon: Large icon (48px) with color="text-secondary"
- Title: Text variant="heading-3", color="text-primary", align="center"
- Description: Text variant="body", color="text-secondary", align="center", maxWidth="400px"
- Action: Button variant="primary"
```

---

## Accessibility Standards

### Contrast Requirements (Handled by Tokens)

All semantic token pairs meet **WCAG AA minimum** (4.5:1 for text, 3:1 for UI):

- `text-primary` on `bg-surface`: 17.2:1 (AAA)
- `text-secondary` on `bg-surface`: 7.8:1 (AAA)
- `text-on-dark` on `accent-primary`: 5.2:1 (AA)

**High-contrast theme** meets **WCAG AAA** (7:1 minimum).

### Interactive Element Requirements

**Buttons**:
- Must have visible focus ring (handled automatically)
- Must support keyboard navigation (Enter/Space)
- Icon-only buttons must have `aria-label`

**Links**:
- Must be keyboard accessible (Tab to focus, Enter to activate)
- Must have underline or other visual indicator on focus

**Custom Interactive Elements**:
```markdown
- Must have role="button" or appropriate ARIA role
- Must have tabIndex={0} for keyboard focus
- Must handle Enter/Space keypress
- Must have visible focus indicator
```

### Forms

```markdown
- Every input must have associated label (Text as="label" or aria-label)
- Error messages must be linked via aria-describedby
- Required fields must have aria-required="true"
- Invalid fields must have aria-invalid="true"
```

---

## Performance Considerations

### Theme Switching

**Target**: < 150ms for theme change

**How it works**:
- CSS custom properties update instantly
- No JavaScript re-rendering of components
- LocalStorage persistence (async, non-blocking)
- No flash of unstyled content (FOUC prevention)

**What to specify in specs**:
```markdown
**Theme Toggle**:
- User clicks theme toggle button
- Theme switches from dark to light within 150ms
- Preference saves to localStorage
- On page reload, saved theme loads immediately (no FOUC)
```

### CSS Bundle Size

**Target**: < 50KB for design system CSS (gzipped)

**Current**: ~35KB (within target)

**What this means for specs**:
- Adding new components won't significantly impact bundle size
- Token-based styling is more efficient than custom CSS
- No need to worry about CSS performance in feature specs

---

## Migration from Old Styles (For Reference)

### Before (Spec 012 - Pre-Design System)

```tsx
<div className="bg-purple-500/20 text-white p-5 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-md">
  User message
</div>
```

### After (Spec 013 - Design System)

```tsx
<Box
  bg="accent-primary"
  color="text-on-dark"
  p="5"
  borderRadius="xl"
  className="bg-opacity-20 backdrop-blur-md shadow-glow-purple"
>
  User message
</Box>
```

**Why this matters for specs**:
- Existing components (MessageBubble, CodeBlock) already migrated
- New features should use design system patterns (Box/Stack/Text/Button)
- Old Tailwind utility classes still work but should avoid hardcoded values

---

## Testing Expectations

### What to Specify in Acceptance Criteria

```markdown
**Accessibility**:
- All interactive elements must pass axe-core validation (WCAG AA)
- Keyboard navigation must work for all actions
- Focus indicators must be visible

**Visual Regression**:
- Component renders correctly in dark/light/high-contrast themes
- Glassmorphism effects display correctly in dark mode
- Shadows and glows render with correct colors

**Responsive**:
- Layout adapts to mobile viewports (< 768px)
- Text remains readable at all viewport sizes
- Buttons stack vertically on narrow screens
```

### What Gets Tested Automatically

- Color contrast ratios (token pairs pre-validated)
- Focus ring visibility (built into Button component)
- Keyboard navigation (built into primitives)
- Theme switching performance (< 150ms)
- Component accessibility (axe-core in unit tests)

---

## Common Questions for Spec Writers

### Q: Can I specify custom colors?

**A**: No, use semantic tokens (`accent-primary`, `text-secondary`, etc.). If no token fits, request new semantic token in spec:

```markdown
**New Token Required**:
- Name: --color-status-online (semantic)
- Purpose: Indicate online/active status
- Value: Green (#22c55e) - references primitive --color-green-500
- Contrast: Must meet WCAG AA on bg-surface
```

### Q: Can I specify pixel values for spacing?

**A**: No, use spacing scale (`spacing="4"` = 16px). If gap needed (e.g., 18px), use closest token or request:

```markdown
**New Spacing Token Required**:
- Name: --space-4.5
- Value: 1.125rem (18px)
- Justification: Specific design requirement for card header spacing
```

### Q: What if design system doesn't have a component I need?

**A**: Specify using primitives:

```markdown
**Agent Card Component** (to be built):
- Compose from Box + Stack + Text + Button primitives
- Follow glassmorphism pattern
- Document in Storybook after implementation
```

Alternatively, request new component in spec:

```markdown
**New Component Required**:
- Name: Badge
- Purpose: Status indicators (online, offline, pending)
- Variants: success, warning, error, neutral
- Composition: Box with small padding, pill border-radius, Text variant="caption"
```

### Q: How do I specify animations?

**A**: Design system doesn't include animation library yet. Specify using CSS transitions:

```markdown
**Hover Animation**:
- On hover: scale button by 2% (transform: scale(1.02))
- Transition duration: 150ms ease-in-out
- On hover: increase glow shadow intensity by 20%
```

### Q: Can users customize the theme?

**A**: Yes, users can:
- Toggle dark/light/high-contrast modes
- Choose accent color (purple, blue, pink, cyan)
- Enable/disable glassmorphism (future feature)

**What NOT to specify**:
- Custom brand colors (not supported yet)
- Custom spacing scales (use existing)
- Custom fonts (Geist is the standard)

---

## Resources for Spec Writers

### Documentation

- **Full Spec**: [specs/013-neon-flux-design-system/spec.md](../../specs/013-neon-flux-design-system/spec.md)
- **Token Reference**: [specs/013-neon-flux-design-system/contracts/token-api.md](../../specs/013-neon-flux-design-system/contracts/token-api.md)
- **Component API**: [specs/013-neon-flux-design-system/contracts/component-api.md](../../specs/013-neon-flux-design-system/contracts/component-api.md)
- **Quickstart Guide**: [specs/013-neon-flux-design-system/quickstart.md](../../specs/013-neon-flux-design-system/quickstart.md)

### Interactive Catalog

Run Storybook to browse all components:
```bash
cd packages/ui
pnpm storybook
# Opens at http://localhost:6006
```

Explore:
- **Tokens** → Color palettes, spacing scale, typography scale
- **Primitives** → Box, Stack, Text, Button examples
- **Chat** → MessageBubble, CodeBlock with Neon Flux styling

### Visual Examples

See existing implementations:
- Chat UI: `apps/client/src/pages/ChatPage.tsx` (MessageBubble usage)
- App Layout: `apps/client/src/App.tsx` (Theme provider setup)

---

## Changelog

### 2025-11-05
- Initial context document created
- Covers all implemented user stories (US1-US6, P1+P2)
- Includes Storybook catalog reference (industry standard implementation)

---

**For Questions**: Consult the design system documentation in `/specs/013-neon-flux-design-system/` or ask the engineering team.
