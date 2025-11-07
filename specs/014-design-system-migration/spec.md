# Feature Specification: Design System Migration & UX Rebuild

**Feature Branch**: `014-design-system-migration`  
**Created**: 2025-11-05  
**Status**: Draft  
**Input**: User description: "UX rebuild and refactor - migrating client application to Neon Flux design system"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Visual Theme Across All Pages (Priority: P1)

As an operator, I want all pages to have a consistent visual appearance so that the application feels professional and cohesive.

**Why this priority**: Visual consistency is the foundation of a professional application. Without it, the operator experience feels disjointed and unfinished, directly impacting trust and usability. This is the minimum viable improvement.

**Independent Test**: Navigate to homepage, agents page, and chat view. Verify all pages use the same dark background color, consistent spacing between elements, and matching visual style (glassmorphism effects, shadows, borders). No page should look "out of place" compared to others.

**Acceptance Scenarios**:

1. **Given** I am on the homepage (thread list view), **When** I observe the page styling, **Then** I see a dark background with glassmorphic surfaces (semi-transparent cards with blur effects)
2. **Given** I am on the homepage, **When** I navigate to the Agents page, **Then** the Agents page maintains the same dark background and glassmorphic styling
3. **Given** I am on the Agents page, **When** I navigate to the Chat view, **Then** the Chat view maintains the same visual theme
4. **Given** I am viewing any page, **When** I observe card surfaces (agent cards, thread items, forms), **Then** all cards use the same glassmorphic pattern with consistent blur, opacity, and border styling
5. **Given** I am viewing any page, **When** I observe text elements, **Then** all headings, body text, and captions use consistent font sizes, weights, and colors across all pages

---

### User Story 2 - Professional Form Design & Visual Hierarchy (Priority: P1)

As an operator, I want forms to have clear visual hierarchy and consistent styling so that I can easily understand what information is required and complete tasks efficiently.

**Why this priority**: Forms are the primary way operators configure agents and settings. Poor form design directly impacts task completion rates and operator frustration. Clear visual hierarchy is essential for usability.

**Independent Test**: Open the agent creation/editing form. Verify that form sections have clear headings, labels are easily distinguishable from inputs, error messages are visually distinct, and spacing creates logical groupings. Compare with forms on other pages to ensure consistency.

**Acceptance Scenarios**:

1. **Given** I am creating a new agent, **When** I view the agent form, **Then** I see clear visual separation between form sections (Basic Info, LLM Config, Memory Config, Autonomy Config)
2. **Given** I am viewing a form section, **When** I observe the layout, **Then** I see a heading that describes the section purpose, followed by logically grouped form fields with consistent spacing
3. **Given** I am viewing a form field, **When** I observe the field structure, **Then** I see a clear label above the input, the input field has consistent styling (border, padding, background), and there is consistent spacing between fields
4. **Given** I am viewing a form field with an error, **When** the field validation fails, **Then** I see an error message below the field in a distinct color (red) with an error icon or visual indicator
5. **Given** I am viewing a form with required fields, **When** I observe the labels, **Then** required fields are visually indicated (e.g., with an asterisk or "Required" text)
6. **Given** I am comparing forms across different pages, **When** I observe form styling, **Then** all forms use identical input styling, spacing, and visual hierarchy

---

### User Story 3 - Consistent Interactive Elements & Loading States (Priority: P1)

As an operator, I want buttons and interactive elements to behave predictably and provide feedback during operations so that I understand what actions are available and when tasks are in progress.

**Why this priority**: Inconsistent button styling and missing loading states create confusion and uncertainty. Operators need immediate visual feedback to understand system state and available actions. This is critical for a professional user experience.

**Independent Test**: Interact with various buttons across the application (New Conversation, Save Agent, Delete, Cancel, etc.). Verify all buttons have consistent styling, clear visual states (default, hover, disabled, loading), and provide appropriate feedback during async operations.

**Acceptance Scenarios**:

1. **Given** I am viewing any page, **When** I hover over a primary action button (e.g., "Save Agent", "New Conversation"), **Then** the button provides visual feedback (glow effect or color change) to indicate interactivity
2. **Given** I am viewing any page, **When** I observe action buttons, **Then** primary actions use the accent color (--color-accent-primary), secondary actions have a muted color, and destructive actions (delete) have a red/warning color
3. **Given** I am submitting a form, **When** I click the "Save" button, **Then** the button shows a loading state (spinner or "Saving..." text) and is disabled to prevent duplicate submissions
4. **Given** I am waiting for an async operation, **When** the operation is in progress, **Then** the button remains in loading state until the operation completes
5. **Given** I am waiting for an async operation, **When** the operation completes successfully, **Then** the button returns to its normal state and I see a success confirmation
6. **Given** I am waiting for an async operation, **When** the operation fails, **Then** the button returns to its normal state and I see an error message explaining what went wrong
7. **Given** I am viewing a button that cannot be clicked (e.g., "Save" with invalid form data), **When** I observe the button, **Then** the button appears visually disabled (reduced opacity, no hover effect) and does not respond to clicks
8. **Given** I am comparing buttons across different pages, **When** I observe button styling, **Then** all buttons of the same type (primary, secondary, destructive) have identical visual styling

---

### User Story 4 - Instant Theme Switching Performance (Priority: P2)

As an operator, I want theme changes (dark/light/high-contrast) to happen instantly without lag or visual glitches so that I can customize my viewing experience based on my preferences or accessibility needs.

**Why this priority**: Fast theme switching is important for accessibility and user preference, but doesn't block core functionality. Operators with visual impairments may need high-contrast mode, and fast switching ensures a seamless experience. This enhances the application but isn't essential for basic usage.

**Independent Test**: Toggle between dark, light, and high-contrast themes using the theme switcher. Measure the time between clicking the theme toggle and seeing the theme change complete. Verify the change happens in under 200ms with no visual glitches (flashing, unstyled content).

**Acceptance Scenarios**:

1. **Given** I am viewing the application in dark mode, **When** I click the theme toggle to switch to light mode, **Then** the entire interface changes to light mode in under 200 milliseconds
2. **Given** I am viewing the application in any theme, **When** I switch to a different theme, **Then** I see no flashing or unstyled content during the transition
3. **Given** I have switched themes, **When** the theme change completes, **Then** all elements (buttons, cards, text, backgrounds) immediately reflect the new theme colors
4. **Given** I have selected a theme preference, **When** I reload the page, **Then** my selected theme is remembered and loads immediately without flashing the default theme first
5. **Given** I am in high-contrast mode, **When** I observe the interface, **Then** glassmorphism effects are disabled (replaced with solid colors) and all text has maximum contrast (WCAG AAA 7:1 ratio or better)

---

### User Story 5 - Mobile-Responsive Interface (Priority: P2)

As an operator, I want the application to work well on mobile devices so that I can manage agents and view conversations when I'm not at my desktop.

**Why this priority**: Mobile support enhances accessibility and convenience but isn't critical for the primary single-operator, Docker Compose deployment scenario (typically accessed from desktop). However, it provides flexibility for operators who want to check status on mobile devices.

**Independent Test**: Open the application on a mobile device (or browser emulator with 375px viewport). Navigate through homepage, agents page, and chat view. Verify all content is readable, buttons are tappable, and layouts adapt to narrow screens without horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** I am viewing the homepage on a mobile device (viewport width < 768px), **When** I observe the layout, **Then** content stacks vertically and fits within the screen width without horizontal scrolling
2. **Given** I am viewing the agents page on a mobile device, **When** I observe agent cards, **Then** cards display in a single column and all information remains readable
3. **Given** I am viewing a form on a mobile device, **When** I observe the form layout, **Then** form fields stack vertically, labels remain above inputs, and buttons stack vertically for easy tapping
4. **Given** I am interacting with buttons on a mobile device, **When** I tap a button, **Then** the button has adequate touch target size (minimum 44x44 pixels) and provides visual feedback on tap
5. **Given** I am viewing text on a mobile device, **When** I observe the typography, **Then** all text remains readable without zooming (minimum 16px font size for body text)
6. **Given** I am viewing the chat interface on a mobile device, **When** I observe the layout, **Then** messages remain readable, the input area is easily accessible, and the interface adapts to keyboard appearance (viewport adjustment)

---

### User Story 6 - Enhanced Empty States with Clear CTAs (Priority: P3)

As an operator, I want empty states (no conversations, no agents) to provide clear guidance and call-to-action so that I understand what to do next when starting fresh or after clearing data.

**Why this priority**: Enhanced empty states improve first-time user experience and provide better guidance, but the application is still usable with basic empty states. This is a polish feature that enhances the experience but isn't essential for core functionality.

**Independent Test**: Delete all conversations and agents (or start with fresh database). Verify empty states display helpful messages, visual elements (icons/illustrations), and clear call-to-action buttons that guide the operator to create their first item.

**Acceptance Scenarios**:

1. **Given** I have no conversations, **When** I view the homepage (thread list), **Then** I see an empty state with a centered layout, an icon or illustration, a heading like "No conversations yet", descriptive text explaining what to do, and a prominent "Start Your First Conversation" button
2. **Given** I am viewing an empty state, **When** I observe the visual hierarchy, **Then** the heading is larger and bolder than the descriptive text, the call-to-action button is visually prominent (primary button styling), and spacing creates a clear visual flow from heading → description → button
3. **Given** I have no agents, **When** I view the agents page, **Then** I see an empty state with a heading like "No agents configured", descriptive text explaining what agents are, and a prominent "Create Your First Agent" button
4. **Given** I am viewing an empty state, **When** I click the call-to-action button, **Then** I am taken directly to the creation flow (new conversation modal, new agent form) without additional navigation steps
5. **Given** I am viewing multiple empty states across different pages, **When** I observe the styling, **Then** all empty states follow the same visual pattern (centered layout, consistent icon size, same text hierarchy, same button styling)

---

### Edge Cases

- **What happens when theme is switched during a form submission?** The form submission should complete successfully, and the loading state should remain visible until completion, then the new theme should be fully applied.

- **What happens when an operator resizes the browser window from desktop to mobile width?** The layout should automatically adapt to the new viewport size without requiring a page reload, maintaining all state (form data, scroll position).

- **What happens when a form has many sections and doesn't fit on one screen?** The form should scroll naturally, with the save/cancel buttons remaining accessible (either sticky at bottom or scrolling with content), and section headings should provide clear landmarks for navigation.

- **What happens when a button's loading state is active and the user navigates away?** The navigation should either wait for the operation to complete or cancel the operation and warn the user about losing unsaved changes.

- **What happens when glassmorphism effects are not supported by the browser?** The interface should gracefully degrade to solid backgrounds while maintaining readability and visual hierarchy.

- **What happens when an operator uses keyboard navigation exclusively?** All interactive elements (buttons, form fields, theme toggle) should be reachable via Tab key, have visible focus indicators, and be activatable via Enter/Space keys.

---

## Requirements *(mandatory)*

### Functional Requirements

**Visual Consistency**:

- **FR-001**: System MUST display all pages (homepage, agents page, chat view) with the same background color and visual theme
- **FR-002**: System MUST apply glassmorphism effects (semi-transparent backgrounds with blur) consistently across all card surfaces
- **FR-003**: System MUST use consistent spacing between elements across all pages (e.g., same padding for cards, same margins between sections)
- **FR-004**: System MUST use consistent typography hierarchy across all pages (same font sizes, weights, and colors for headings, body text, captions)

**Form Design**:

- **FR-005**: System MUST display form sections with clear visual separation and descriptive headings
- **FR-006**: System MUST display form field labels above inputs with consistent styling
- **FR-007**: System MUST display error messages below invalid fields in a distinct visual style (color, icon)
- **FR-008**: System MUST indicate required fields visually on form labels
- **FR-009**: System MUST maintain consistent form input styling (border, padding, background, focus states) across all forms
- **FR-010**: System MUST provide consistent spacing between form fields and sections

**Interactive Elements**:

- **FR-011**: System MUST style primary action buttons with the accent color (--color-accent-primary)
- **FR-012**: System MUST style secondary action buttons with a muted color
- **FR-013**: System MUST style destructive action buttons (delete) with a warning color (red)
- **FR-014**: System MUST display button hover states with visual feedback (glow or color change)
- **FR-015**: System MUST display loading states on buttons during async operations (spinner or loading text)
- **FR-016**: System MUST disable buttons during loading states to prevent duplicate submissions
- **FR-017**: System MUST display disabled buttons with reduced opacity and no hover effects
- **FR-018**: System MUST maintain consistent button styling (same variant, same style) across all pages

**Theme Switching**:

- **FR-019**: System MUST support dark, light, and high-contrast themes
- **FR-020**: System MUST complete theme changes in under 200 milliseconds (measured from onClick event to final browser paint, verified via Chrome DevTools Performance tab)
- **FR-021**: System MUST persist theme preference across page reloads
- **FR-022**: System MUST prevent flash of unstyled content (FOUC) when loading saved theme preference
- **FR-023**: System MUST disable glassmorphism effects in high-contrast mode
- **FR-024**: System MUST ensure all text in high-contrast mode meets WCAG AAA contrast ratios (7:1 minimum)

**Responsive Design**:

- **FR-025**: System MUST adapt layouts to mobile viewports (< 768px width) without horizontal scrolling
- **FR-026**: System MUST stack cards and form fields vertically on mobile viewports
- **FR-027**: System MUST maintain readable text sizes on mobile devices (minimum 16px for body text)
- **FR-028**: System MUST provide adequate touch target sizes for buttons on mobile (minimum 44x44 pixels)
- **FR-029**: System MUST adapt layouts dynamically when viewport size changes (no reload required)

**Empty States**:

- **FR-030**: System MUST display empty states with centered layout when no data exists (no conversations, no agents)
- **FR-031**: System MUST display empty states with a heading, descriptive text, and call-to-action button
- **FR-032**: System MUST maintain consistent empty state styling across all pages
- **FR-033**: System MUST navigate to creation flow when empty state CTA is clicked

**Accessibility**:

- **FR-034**: System MUST support keyboard navigation for all interactive elements (Tab, Enter, Space)
- **FR-035**: System MUST display visible focus indicators on all focusable elements
- **FR-036**: System MUST provide ARIA labels for icon-only buttons
- **FR-037**: System MUST link error messages to form fields via ARIA attributes (aria-describedby)
- **FR-038**: System MUST indicate required fields via ARIA attributes (aria-required)
- **FR-039**: System MUST indicate invalid fields via ARIA attributes (aria-invalid)

**Code Quality & Migration** (Engineering Requirements):

- **FR-040**: Codebase MUST NOT contain any CSS file imports in component files (e.g., `import './Component.css'`)
- **FR-041**: Codebase MUST NOT contain any inline style attributes on elements (e.g., `style={{color: '#fff'}}`)
- **FR-042**: Codebase MUST NOT contain any Tailwind utility classes with hardcoded values (e.g., `text-purple-500`, `p-5`)
- **FR-043**: Codebase MUST NOT contain any standalone CSS files in the client application directory (all CSS files must be deleted: AgentForm.css, BasicInfoSection.css, LLMConfigSection.css, MemoryConfigSection.css, AutonomyConfigSection.css, FieldError.css, ValidationMessage.css)
- **FR-044**: All UI components MUST use design system primitives exclusively (Box, Stack, Text, Button, Input, Textarea, Select from `@workspace/ui`)
- **FR-045**: All layout structures MUST use Stack or Box components (no raw `<div>` elements with custom styling)
- **FR-046**: All typography MUST use Text component with semantic variants (no raw `<h1>`, `<p>`, `<span>` elements with custom styling)
- **FR-047**: All interactive elements MUST use Button component with approved variants (no raw `<button>` elements with custom styling)
- **FR-048**: All form inputs MUST use Input, Textarea, or Select components from design library (no raw `<input>`, `<textarea>`, `<select>` elements with custom styling)
- **FR-049**: All colors MUST reference design tokens via CSS variables (e.g., `var(--color-accent-primary)`) - no hardcoded hex/rgb values
- **FR-050**: All spacing MUST reference design tokens via CSS variables (e.g., `var(--space-4)`) - no hardcoded pixel/rem values
- **FR-051**: Build process MUST fail if any CSS imports, inline styles, or hardcoded values are detected (automated enforcement)

### Key Entities

*No new data entities are introduced by this feature. This is a pure UI/UX improvement that affects the presentation layer only.*

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Visual Quality**:

- **SC-001**: 100% of pages (homepage, agents page, chat view) display with visually consistent styling (same colors, same spacing, same effects) as verified by manual smoke testing
- **SC-002**: 100% of form inputs across all forms have identical styling (border, padding, background, focus states)
- **SC-003**: 100% of buttons of the same type (primary, secondary, destructive) have identical visual styling across all pages

**Performance**:

- **SC-004**: Theme switching completes in under 200 milliseconds (measured from onClick event to final browser paint, verified via Chrome DevTools Performance tab Main thread timeline)
- **SC-005**: Page load time decreases by at least 5% compared to current implementation (due to reduced CSS bundle size)
- **SC-006**: Theme switching produces zero React component re-renders (verified via React DevTools profiler)

**User Experience**:

- **SC-007**: Operators can complete agent creation task 20% faster due to improved form visual hierarchy (measured via task completion time)
- **SC-008**: Zero visual inconsistencies reported during QA testing (all pages match design system)
- **SC-009**: 100% of interactive elements provide immediate visual feedback on hover/click (verified manually)

**Accessibility**:

- **SC-010**: 100% of pages pass WCAG AA automated accessibility tests (via axe-core)
- **SC-011**: 100% of interactive elements are keyboard accessible (verified via keyboard-only navigation test)
- **SC-012**: High-contrast theme meets WCAG AAA contrast requirements (7:1 minimum) for all text

**Responsive Design**:

- **SC-013**: 100% of pages display without horizontal scrolling on mobile viewports (375px width)
- **SC-014**: 100% of buttons have adequate touch target size (44x44 pixels minimum) on mobile viewports
- **SC-015**: All text remains readable on mobile viewports without zooming (16px minimum for body text)

**Code Quality** (Engineering Metrics - for verification only):

- **SC-016**: Zero inline styles remain in component code (verified via automated script)
- **SC-017**: Zero CSS file imports remain in component code (verified via automated script)
- **SC-018**: CSS bundle size decreases by at least 20% (measured via build output)
- **SC-019**: Zero raw HTML elements with custom styling remain (`<div>`, `<button>`, `<h1>`, etc. must use design system primitives)
- **SC-020**: 100% of components import from `@workspace/ui` (verified via automated script)
- **SC-021**: Zero hardcoded color values remain (hex, rgb, named colors - must use design tokens)
- **SC-022**: Zero hardcoded spacing values remain (px, rem, em - must use design tokens)
- **SC-023**: 7 CSS files deleted: AgentForm.css, BasicInfoSection.css, LLMConfigSection.css, MemoryConfigSection.css, AutonomyConfigSection.css, FieldError.css, ValidationMessage.css

**Migration Completeness**:

- **SC-024**: 100% of client components migrated to design system (no legacy styling remains)
- **SC-025**: ESLint rules enforced (build fails on inline styles, CSS imports, hardcoded values)
- **SC-026**: Pre-commit hooks prevent legacy patterns from being committed

---

## Assumptions

1. **Single-Operator Deployment**: This spec assumes the primary use case is a single operator accessing the application from a desktop browser, with mobile support as a convenience feature, not a primary requirement.

2. **Modern Browser Support**: This spec assumes operators use modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) that support CSS custom properties, backdrop-filter (glassmorphism), and other modern CSS features.

3. **Accessibility Standards**: This spec assumes WCAG 2.1 Level AA compliance as the baseline, with Level AAA for high-contrast mode.

4. **Design System Exists**: This spec assumes the Neon Flux design system (Spec 013) is already fully implemented and ready for adoption. No design system components need to be created as part of this spec.

5. **No Breaking Changes**: This spec assumes the migration should not break existing functionality - all features that work today should continue working after the migration.

6. **Incremental Rollout**: This spec assumes the migration can happen incrementally (page by page, component by component) without requiring a big-bang release.

7. **No New Features**: This spec focuses purely on visual/UX improvements. No new functional features (new pages, new workflows, new capabilities) are included.

8. **Theme Preference Storage**: This spec assumes browser localStorage is available and reliable for persisting theme preferences across sessions.

---

## Out of Scope

The following are explicitly **NOT** included in this spec:

1. **New Functional Features**: No new pages, workflows, or capabilities beyond what exists today
2. **Backend Changes**: No changes to API contracts, database schemas, or server-side logic
3. **Authentication/Authorization**: No changes to user authentication or access control
4. **Data Migration**: No changes to how data is stored or retrieved (database remains unchanged)
5. **Performance Optimization Beyond Theme Switching**: While we expect overall performance improvements, this spec does not target specific non-visual performance issues (e.g., API response times, database query optimization)
6. **Browser Compatibility Polyfills**: No work to support legacy browsers (IE11, old mobile browsers)
7. **Internationalization**: No translation or locale-specific formatting changes
8. **Analytics/Telemetry**: No new tracking or analytics instrumentation for UX metrics
9. **Custom Theming**: Operators cannot create custom color themes beyond the three provided (dark, light, high-contrast)
10. **Animation Library**: No complex animations or transitions beyond hover effects and loading states
11. **Server-Side Rendering (SSR)**: No changes to rendering strategy (remains client-side React)
12. **New Page Components**: No new page-level components or HTML elements beyond what's needed for forms (existing pages remain unchanged in structure)

---

## Clarifications

### Session 2025-11-05

- Q: How should form inputs (`<input>`, `<textarea>`, `<select>`) be styled during migration? → A: Expand design library with Input, Textarea, Select primitives in `@workspace/ui` (removed from out-of-scope to allow design system expansion for form components)
- Q: If a migrated page breaks or has visual issues in production, what's the recovery strategy? → A: No rollback needed - work on feature branch, validate before merge (hobby project, not production SaaS)
- Q: How should visual regression testing be performed for this migration? → A: Manual smoke testing - operator will decide when visual quality is acceptable (hobby project context, manual validation preferred over automated tooling)

---

## Components to Migrate (Engineering Reference)

The following components must be migrated from legacy styling to design system primitives:

### Components with CSS Files (MUST DELETE CSS):

1. **AgentForm.tsx** → Migrate to Box/Stack/Text/Button, delete AgentForm.css
2. **BasicInfoSection.tsx** → Migrate to Stack/Text primitives, delete BasicInfoSection.css
3. **LLMConfigSection.tsx** → Migrate to Stack/Text primitives, delete LLMConfigSection.css
4. **MemoryConfigSection.tsx** → Migrate to Stack/Text primitives, delete MemoryConfigSection.css
5. **AutonomyConfigSection.tsx** → Migrate to Stack/Text primitives, delete AutonomyConfigSection.css
6. **FieldError.tsx** → Migrate to Text component with error variant, delete FieldError.css
7. **ValidationMessage.tsx** → Migrate to Text component with caption variant, delete ValidationMessage.css

### Components with Inline Styles (MUST REMOVE):

- **All components**: Remove `style={{...}}` attributes, replace with design token props or className with token references

### Components with Tailwind Utility Classes (MUST REPLACE):

- **All components**: Replace hardcoded Tailwind classes (e.g., `text-purple-500`, `p-5`) with design system props (e.g., `color="accent-primary"`, `p="5"`)

### Pages Requiring Full Migration:

1. **AgentsPage.tsx** - Agent list view, agent cards, create/edit forms
2. **ThreadListPage.tsx** (Homepage) - Thread list, empty states
3. **AgentFormPage.tsx** - All form sections

### Already Migrated (Reference - No Action Needed):

- **ChatPage.tsx** - Uses MessageBubble (already migrated)
- **MessageBubble.tsx** - Already uses design tokens
- **CodeBlock.tsx** - Already uses design tokens
- **App.tsx** - Theme provider already integrated

---

## Dependencies

1. **Spec 013 (Neon Flux Design System)**: This spec depends on the Neon Flux design system being fully implemented (Box, Stack, Text, Button primitives, token system, theme system, Storybook catalog). Additionally, this spec will expand the design library with Input, Textarea, and Select primitives in `@workspace/ui` to support form migration.

2. **Modern Browser APIs**: This spec depends on browser support for CSS custom properties (CSS variables), backdrop-filter (for glassmorphism), and localStorage (for theme persistence).

3. **Existing Application Functionality**: This spec assumes all existing features (agent management, conversation threads, chat interface) work correctly and should continue working after migration.

---

## Success Validation Plan

After implementation, the following validation steps will confirm success:

1. **Visual Regression Testing**: Capture screenshots of all pages before and after migration. Compare side-by-side to verify visual improvements and consistency.

2. **Theme Switching Performance Test**: Use browser DevTools Performance profiler to measure theme switching time. Verify it completes in under 200ms.

3. **Accessibility Audit**: Run axe-core automated tests on all pages. Manually verify keyboard navigation and screen reader compatibility.

4. **Responsive Testing**: Test all pages on real mobile devices (iOS, Android) and browser emulators at various viewport sizes (375px, 768px, 1024px, 1440px).

5. **Cross-Browser Testing**: Verify visual consistency and functionality in Chrome, Firefox, Safari, and Edge (latest versions).

6. **Task Completion Time Test**: Measure time for operators to complete common tasks (create agent, start conversation) before and after migration to verify improvements.

7. **Code Quality Verification**: Run automated scripts to verify:
   - Zero CSS file imports (`grep -r "import.*\.css" apps/client/src/`)
   - Zero inline styles (`grep -r "style={{" apps/client/src/`)
   - Zero hardcoded colors (`grep -r "#[0-9a-fA-F]\{6\}" apps/client/src/`)
   - 7 CSS files deleted (verify files no longer exist)
   - All components import from `@workspace/ui`

8. **ESLint Enforcement**: Verify build fails when attempting to add:
   - CSS imports
   - Inline styles
   - Hardcoded color/spacing values
   - Raw HTML elements with custom styling

9. **Pre-commit Hook Validation**: Attempt to commit legacy patterns and verify pre-commit hook blocks the commit.

10. **User Acceptance Testing**: Have the operator (repository owner) review and approve all visual changes before merging to main.

---

## Engineering Enforcement Mechanisms

To ensure long-term compliance with design system standards, the following enforcement mechanisms must be implemented:

### ESLint Rules (Build-Time Enforcement):

```javascript
// .eslintrc.cjs additions
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ImportDeclaration[source.value=/\\.css$/]',
      message: 'CSS file imports are not allowed. Use design system primitives from @workspace/ui instead.',
    },
    {
      selector: 'JSXAttribute[name.name="style"]',
      message: 'Inline styles are not allowed. Use design system props or CSS variables instead.',
    },
  ],
  'no-restricted-imports': [
    'error',
    {
      patterns: ['!@workspace/ui', '!react', '!react-dom', /* other allowed imports */],
      message: 'Components must import UI primitives from @workspace/ui only.',
    },
  ],
}
```

### Pre-commit Hooks (Commit-Time Enforcement):

```bash
# .husky/pre-commit additions
# Detect CSS imports
if git diff --cached --name-only | grep "\.tsx$" | xargs grep -l "import.*\.css"; then
  echo "❌ CSS imports detected. Use design system primitives instead."
  exit 1
fi

# Detect inline styles
if git diff --cached --name-only | grep "\.tsx$" | xargs grep -l "style={{"; then
  echo "❌ Inline styles detected. Use design system props instead."
  exit 1
fi

# Detect hardcoded colors
if git diff --cached --name-only | grep "\.tsx$" | xargs grep -E "#[0-9a-fA-F]{6}|rgb\(|rgba\("; then
  echo "❌ Hardcoded colors detected. Use design tokens instead."
  exit 1
fi
```

### CI/CD Checks (Merge-Time Enforcement):

```yaml
# GitHub Actions workflow addition
- name: Verify Design System Compliance
  run: |
    # Check for CSS imports
    ! grep -r "import.*\.css" apps/client/src/ || (echo "CSS imports found" && exit 1)
    
    # Check for inline styles
    ! grep -r "style={{" apps/client/src/ || (echo "Inline styles found" && exit 1)
    
    # Check for hardcoded colors
    ! grep -rE "#[0-9a-fA-F]{6}|rgb\(|rgba\(" apps/client/src/ || (echo "Hardcoded colors found" && exit 1)
    
    # Verify CSS files deleted
    [ ! -f apps/client/src/components/AgentForm.css ] || (echo "AgentForm.css still exists" && exit 1)
    [ ! -f apps/client/src/components/BasicInfoSection.css ] || (echo "BasicInfoSection.css still exists" && exit 1)
    # ... check all 7 CSS files
```

### TypeScript Strict Mode (Compile-Time Type Safety):

```json
// tsconfig.json - already configured, but referenced here
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

This ensures all design system component props are type-checked, catching errors like `color="purple-500"` (invalid) vs `color="accent-primary"` (valid).

