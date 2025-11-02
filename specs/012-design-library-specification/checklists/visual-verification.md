# Visual Verification Checklist

**Purpose**: Manual smoke test to validate the design library's visual and interactive behavior across all components and themes.

**When to run**: Before finalizing the feature, after any visual changes, or when testing in a new browser.

---

## Pre-Test Setup

- [ ] Start dev server: `pnpm dev` from monorepo root
- [ ] Navigate to Design System Test page (`/test` or designated route)
- [ ] Open browser DevTools (for theme persistence and contrast checks)
- [ ] Test in both Chrome and Firefox (minimum)

---

## User Story 1: Visual Message Distinction

**Goal**: User and agent messages are clearly distinguishable

### Light Mode
- [ ] User messages appear right-aligned with blue background
- [ ] Agent messages appear left-aligned with gray background
- [ ] Text is readable (high contrast) on both backgrounds
- [ ] Markdown renders correctly (bold, italic, lists, headings)
- [ ] No layout shift or overlap between messages

### Dark Mode
- [ ] User messages have deep blue background
- [ ] Agent messages have dark gray background
- [ ] Text remains readable (light text on dark backgrounds)
- [ ] Color distinction maintained between user/agent

### Timestamps
- [ ] Recent messages show relative time ("5m ago", "2h ago")
- [ ] Old messages show absolute time ("3:45 PM", "Mar 15, 3:45 PM")
- [ ] Timestamp text is muted but still readable
- [ ] Timestamps update automatically (wait 60 seconds to verify)

---

## User Story 2: Typography & Code Blocks

**Goal**: Chat content is readable with proper hierarchy and syntax highlighting

### Typography
- [ ] Body text is 16px with 1.6 line height (comfortable reading)
- [ ] Headings have clear hierarchy (H1 > H2 > H3)
- [ ] Inline code has gray background and monospace font
- [ ] Links are blue and underlined, hover state is darker blue

### Code Blocks (Light Mode)
- [ ] Code block has near-white background with light border
- [ ] Syntax highlighting uses light theme (vs)
- [ ] Line numbers appear when `showLineNumbers={true}`
- [ ] Copy button appears on hover (top-right corner)
- [ ] Clicking copy button shows "✓ Copied!" for 2 seconds
- [ ] Verify clipboard contains code (paste in text editor)

### Code Blocks (Dark Mode)
- [ ] Code block has near-black background with dark border
- [ ] Syntax highlighting switches to dark theme (vscDarkPlus)
- [ ] Copy button remains visible and readable
- [ ] Copy functionality works in dark mode

---

## User Story 3: Color Palette

**Goal**: Semantic color tokens adapt to theme changes

### Light Mode
- [ ] Open DevTools → Elements → Inspect message bubble
- [ ] Find `--color-message-user-bg` in Styles panel
- [ ] Click color swatch → expand "Contrast ratio"
- [ ] Verify contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Repeat for agent messages, timestamps, links

### Dark Mode
- [ ] Toggle dark mode
- [ ] Verify all color tokens update (no stale light mode colors)
- [ ] Re-check contrast ratios in dark mode
- [ ] Ensure all components remain readable

### Theme Persistence
- [ ] Toggle to dark mode
- [ ] Open DevTools → Application → Local Storage
- [ ] Find key `cerebrobot-theme` with value `"dark"`
- [ ] Refresh page (Cmd+R / Ctrl+R)
- [ ] Verify dark mode persists (no flash of light mode)
- [ ] Toggle back to light mode
- [ ] Refresh and verify light mode persists

---

## User Story 4: Typing Indicator

**Goal**: Smooth animation signals agent activity

### Dots Variant
- [ ] Click "Show Typing" button
- [ ] Verify three dots appear
- [ ] Dots bounce up and down smoothly (60fps animation)
- [ ] Animation loops continuously without stuttering
- [ ] No layout shift when indicator appears/disappears

### Pulse Variant
- [ ] Verify single circle appears for pulse variant
- [ ] Circle scales up and down smoothly
- [ ] Opacity changes with scale (brighter when larger)
- [ ] Animation feels natural and unobtrusive

### Theme Adaptation
- [ ] Toggle dark mode
- [ ] Verify typing indicator colors adapt
- [ ] Animation remains smooth in both themes

---

## User Story 5: Timestamps

**Goal**: Timestamps format appropriately based on age

### Format Validation
- [ ] "Just now" appears for current time
- [ ] "5m ago" appears for 5 minutes old message
- [ ] "2h ago" appears for 2 hours old message
- [ ] Yesterday's message shows absolute time (e.g., "3:45 PM")
- [ ] Last week shows "Mar 15, 3:45 PM"
- [ ] Last year shows "Mar 15, 2024, 3:45 PM"

### Auto-Update
- [ ] Note current relative timestamp (e.g., "5m ago")
- [ ] Wait 60 seconds (updateInterval default)
- [ ] Verify timestamp updates to "6m ago"
- [ ] No page refresh required

### Manual Format Override
- [ ] Verify "Always relative" shows relative format for old dates
- [ ] Verify "Always absolute" shows absolute format for recent dates

---

## User Story 6: Dark Mode

**Goal**: Instant theme switching without visual glitches

### Switching Performance
- [ ] Click theme toggle button
- [ ] Verify switch happens **instantly** (<100ms perceived)
- [ ] **No flash** of wrong theme during transition
- [ ] **No layout shift** (elements don't jump)
- [ ] **No visible transition** on colors (disabled via theme-switching class)

### Component Coverage
- [ ] All message bubbles update colors
- [ ] All code blocks update background and syntax highlighting theme
- [ ] All timestamps update muted color
- [ ] All links update blue shade
- [ ] Typing indicator updates colors
- [ ] Avatars remain visible and distinguishable

### Browser Compatibility
- [ ] Test in Chrome: theme switching smooth
- [ ] Test in Firefox: no visual glitches
- [ ] Test in Safari (if available): no flash

---

## User Story 7: Copy Functionality

**Goal**: One-click code copying with clear feedback

### Hover Interaction
- [ ] Hover over code block
- [ ] Copy button fades in (opacity 0 → 1) smoothly
- [ ] Move mouse away, button fades out
- [ ] Button positioned in top-right corner, doesn't overlap code

### Copy Flow
- [ ] Click "Copy" button
- [ ] Button text changes to "Copying..." immediately
- [ ] Button text changes to "✓ Copied!" with green color
- [ ] Wait 2 seconds
- [ ] Button resets to "Copy" (idle state)
- [ ] Paste clipboard content in text editor
- [ ] Verify exact code is copied (no extra whitespace/formatting)

### Error Handling
- [ ] (Optional) Block clipboard access in browser settings
- [ ] Click copy button
- [ ] Verify error state shows "Failed" text
- [ ] Wait 2 seconds, button resets to idle

---

## Avatar Component

**Goal**: Visual identifiers for user and agent

### Sizes
- [ ] Small (sm) avatar is 32px
- [ ] Medium (md) avatar is 40px
- [ ] Large (lg) avatar is 48px

### Variants
- [ ] User avatar has blue background
- [ ] Agent avatar has gray background (or custom brand color)
- [ ] Initials are centered and readable

### Image Handling
- [ ] Avatar with valid image URL shows image
- [ ] Avatar with broken URL shows fallback initials
- [ ] No layout shift when image loads

---

## Cross-Browser Testing

### Chrome
- [ ] All components render correctly
- [ ] Copy button works
- [ ] Theme persistence works
- [ ] No console errors

### Firefox
- [ ] All components render correctly
- [ ] Copy button works
- [ ] Theme persistence works
- [ ] No console errors

### Safari (if available)
- [ ] All components render correctly
- [ ] Copy button works (execCommand fallback may be used)
- [ ] Theme persistence works

---

## Performance Checks

- [ ] Page loads in <1 second (dev server)
- [ ] Theme toggle responds instantly (<100ms)
- [ ] Typing indicator animations are smooth (60fps)
- [ ] No janky scrolling when many messages present
- [ ] No console warnings about performance
- [ ] No memory leaks (check DevTools Memory profiler after 5 minutes)

---

## Accessibility (Basic Checks)

- [ ] All interactive elements are keyboard accessible (Tab navigation)
- [ ] Focus states are visible (outline on buttons, links)
- [ ] Typing indicator has `role="status"` and `aria-live="polite"`
- [ ] Timestamps have `datetime` attribute in ISO format
- [ ] Copy button has meaningful `aria-label`
- [ ] No accessibility errors in browser console

---

## Final Validation

- [ ] All checkboxes above are completed
- [ ] No visual bugs or glitches observed
- [ ] Design library is production-ready
- [ ] Update tasks.md to mark T079 complete

**Tested by**: _________________  
**Date**: _________________  
**Browser(s)**: _________________  
**Result**: ☐ Pass  ☐ Fail (document issues below)

---

## Issues Found (if any)

| Component | Issue Description | Severity | Screenshot/Video |
|-----------|-------------------|----------|------------------|
|           |                   |          |                  |
|           |                   |          |                  |
|           |                   |          |                  |
