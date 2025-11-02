# Current State Audit: Cerebrobot UI

**Date**: 2025-11-02  
**Purpose**: Document existing UI implementation before design system migration  
**Method**: Playwright browser inspection + codebase analysis

---

## Executive Summary

**Current State**: Cerebrobot has a **working dark-themed UI** with Neon Flux aesthetics already partially implemented in chat components. The UI uses:
- **Light theme for non-chat pages** (Agents list, Thread list) - basic Bootstrap-like styling
- **Dark theme with glassmorphism for chat** - purple/blue gradients, backdrop blur, glow effects
- **CSS custom properties** already in use (`--color-message-user-bg`, `--color-code-block-bg`, etc.)
- **Tailwind CSS** for utility classes
- **Hardcoded HSL values** in CSS (not tokenized)

**Gap Analysis**: 
1. ❌ **No design tokens** - colors/spacing hardcoded in CSS and components
2. ❌ **Inconsistent theming** - chat is dark (Neon Flux), other pages are light (plain)
3. ❌ **No theme switching** - cannot toggle between light/dark
4. ❌ **No component primitives** - raw divs/buttons everywhere
5. ✅ **Good foundation** - CSS custom properties structure exists, Tailwind configured

---

## Current Routes & Pages

### 1. Home Page (`/`)
- **URL**: `http://localhost:5173/`
- **Component**: `ThreadListView`
- **Theme**: **Light** (white background, gray text)
- **Styling**: Minimal, no glassmorphism
- **Elements**:
  - "Conversations" heading
  - "⚙️ Manage Agents" button (outlined, blue accent)
  - "+ New Conversation" button (filled, blue)
  - Empty state: "No conversations yet. Start a new one!"
  - "Start Your First Conversation" button (filled, blue)

**Screenshot**:
![Home Page](../.playwright-mcp/current-app-home.png)

**Visual Issues**:
- No dark mode
- Inconsistent button styles (icon emoji vs text)
- No visual hierarchy (headings not bold enough)
- No Neon Flux aesthetic (plain white, no gradients/glass)

---

### 2. Agents Page (`/agents`)
- **URL**: `http://localhost:5173/agents`
- **Component**: `AgentsPage`
- **Theme**: **Dark** (black background, but not Neon Flux)
- **Styling**: Minimal dark mode, no glassmorphism
- **Elements**:
  - "← Back to Threads" button (dark bg, white text)
  - "Agents" heading
  - "2 agents" count
  - "New Agent" button (blue filled)
  - Agent cards (dark cards with metadata)
    - Agent name (h3)
    - "Autonomy Enabled" badge
    - Created/Updated timestamps
    - "View", "Edit", "Delete" buttons

**Screenshot**:
![Agents Page](../.playwright-mcp/agents-list.png)

**Visual Issues**:
- Dark theme but **NOT Neon Flux** (no purple/pink, no glassmorphism)
- Screenshot is mostly black (content not visible) - likely CSS rendering issue
- No consistency with chat components' Neon Flux style
- Agent cards lack visual polish (no glow, no gradients)

---

### 3. Chat Page (Not Captured)
- **URL**: `/` (when activeThread exists)
- **Component**: `ChatView`
- **Theme**: **Dark with Neon Flux** (purple/blue, glassmorphism)
- **Styling**: Fully styled with Neon Flux aesthetic
- **Components Used**:
  - `MessageBubble` - glassmorphic bubbles with glow effects
  - `CodeBlock` - syntax-highlighted code with purple borders
  - `TypingIndicator` - animated glowing dots
  - `Avatar` - user/agent avatars

**Styling from Code**:
```tsx
// User message
ml-auto bg-message-user-bg/20 text-message-user-text border-message-user-bg/30 
shadow-[0_0_20px_rgba(168,85,247,0.3)] // Purple glow

// Agent message
mr-auto bg-message-agent-bg/15 text-message-agent-text border-message-agent-bg/20 
shadow-[0_0_20px_rgba(59,130,246,0.3)] // Blue glow
```

**Visual Characteristics**:
- ✅ Glassmorphism (`backdrop-blur-md`)
- ✅ Purple/blue gradient glow shadows
- ✅ Rounded corners (`rounded-2xl`)
- ✅ Transparent backgrounds with opacity
- ✅ Neon Flux colors (purple #a855f7, blue #3b82f6, cyan #06b6d4)

---

## Current CSS Architecture

### File Structure
```
packages/ui/src/
├── theme/
│   ├── globals.css         # Tailwind imports + CSS custom properties
│   └── chat-colors.css     # (mentioned in comment, not found)
├── chat/
│   ├── message-bubble.tsx  # Glassmorphic message component
│   ├── code-block.tsx
│   ├── copy-button.tsx
│   ├── timestamp.tsx
│   ├── typing-indicator.tsx
│   └── avatar.tsx
└── utils/
    ├── cn.ts               # Tailwind class merging utility
    └── markdown.ts         # Markdown component configs

apps/client/src/components/
├── AgentForm.css           # Form styling (per-component CSS)
├── BasicInfoSection.css
├── LLMConfigSection.css
├── MemoryConfigSection.css
├── AutonomyConfigSection.css
├── FieldError.css
└── ValidationMessage.css
```

### CSS Custom Properties (Current)

**From `packages/ui/src/theme/globals.css`**:

```css
:root {
  /* Light Mode */
  --color-message-user-bg: 239 84% 67%;     /* Soft blue HSL */
  --color-message-user-text: 222 47% 11%;   /* Dark text */
  --color-message-agent-bg: 240 5% 96%;     /* Light gray */
  --color-message-agent-text: 222 47% 11%;
  --color-code-block-bg: 0 0% 98%;
  --color-code-block-border: 0 0% 89%;
  --color-code-inline-bg: 0 0% 95%;
  --color-timestamp: 240 4% 46%;
  --color-link: 221 83% 53%;
  --color-link-hover: 221 83% 43%;
  --color-copy-button: 0 0% 60%;
  --color-copy-button-success: 142 71% 45%;
}

.dark {
  /* Dark Mode (Neon Flux) */
  --color-message-user-bg: 277 92% 62%;     /* Purple #a855f7 */
  --color-message-user-text: 240 5% 97%;    /* Light text */
  --color-message-agent-bg: 221 91% 60%;    /* Blue #3b82f6 */
  --color-message-agent-text: 240 5% 97%;
  --color-code-block-bg: 240 20% 5%;        /* Dark bg */
  --color-code-block-border: 277 92% 62%;   /* Purple border */
  --color-code-inline-bg: 240 21% 15%;
  --color-timestamp: 215 16% 47%;
  --color-link: 187 95% 43%;                /* Cyan #06b6d4 */
  --color-link-hover: 187 95% 53%;
  --color-copy-button: 277 92% 62%;         /* Purple */
  --color-copy-button-success: 142 71% 55%;
}
```

**Issues**:
1. ❌ **HSL format without `hsl()` wrapper** - Tailwind convention (opacity control), not standard CSS
2. ❌ **Chat-specific only** - no tokens for buttons, backgrounds, borders (non-chat UI)
3. ❌ **No token tiers** - all flat, no primitive → semantic → component structure
4. ❌ **No spacing/typography/radius tokens** - only colors
5. ❌ **Hardcoded in Tailwind classes** - `shadow-[0_0_20px_rgba(168,85,247,0.3)]` not tokenized

---

## Component Analysis

### Existing Chat Components (`packages/ui/src/chat/`)

#### 1. **MessageBubble** (`message-bubble.tsx`)
- **Props**: `content`, `sender`, `timestamp`, `avatar`, `className`
- **Styling**: CVA (class-variance-authority) for variants
- **Neon Flux Features**:
  - ✅ Glassmorphism (`backdrop-blur-md`)
  - ✅ Transparent backgrounds (`bg-message-user-bg/20`)
  - ✅ Glow shadows (`shadow-[0_0_20px_rgba(168,85,247,0.3)]`)
  - ✅ Rounded corners (`rounded-2xl`)
  - ✅ Border with opacity (`border-message-user-bg/30`)
- **Tokens Used**: `--color-message-user-bg`, `--color-message-user-text`, `--color-message-agent-bg`, `--color-message-agent-text`
- **Hardcoded**: Shadow values, border-radius values, opacity percentages

**Code Snippet**:
```tsx
const messageBubbleVariants = cva(
  'rounded-2xl px-5 py-4 max-w-[65%] backdrop-blur-md border shadow-lg',
  {
    variants: {
      sender: {
        user: 'ml-auto bg-message-user-bg/20 text-message-user-text border-message-user-bg/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        agent: 'mr-auto bg-message-agent-bg/15 text-message-agent-text border-message-agent-bg/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
      },
    },
  },
);
```

#### 2. **CodeBlock** (`code-block.tsx`)
- **Props**: `children`, `language`, `className`
- **Tokens Used**: `--color-code-block-bg`, `--color-code-block-border`
- **Features**: Syntax highlighting, copy button, line numbers

#### 3. **TypingIndicator** (`typing-indicator.tsx`)
- **Props**: `className`
- **Neon Flux Features**: Animated glowing dots (blue glow `box-shadow: 0 0 12px hsl(221, 91%, 60%)`)
- **Tokens Used**: None (hardcoded blue color)

#### 4. **Timestamp** (`timestamp.tsx`)
- **Props**: `date`, `className`
- **Tokens Used**: `--color-timestamp`

#### 5. **CopyButton** (`copy-button.tsx`)
- **Props**: `content`, `className`
- **Tokens Used**: `--color-copy-button`, `--color-copy-button-success`

#### 6. **Avatar** (`avatar.tsx`)
- **Props**: `src`, `name`, `className`
- **Tokens Used**: None

---

### Non-Chat Components (`apps/client/src/components/`)

#### 1. **AgentList** (`AgentList.tsx`)
- **Styling**: Per-component CSS (`AgentList.css` not found in search results)
- **Elements**: Grid layout, agent cards
- **Theme**: Appears to use light theme (from screenshot)
- **No Neon Flux styling**

#### 2. **AgentCard** (`AgentCard.tsx`)
- **Styling**: Per-component CSS
- **Elements**: Agent name, metadata, action buttons
- **No Neon Flux styling**

#### 3. **AgentForm** (`AgentForm.tsx`)
- **Styling**: `AgentForm.css` (found in search)
- **Elements**: Form sections, inputs, validation
- **No Neon Flux styling**

#### 4. **ThreadListView** (`ThreadListView.tsx`)
- **Styling**: Inline styles or global CSS
- **Elements**: Thread list, empty state, action buttons
- **Theme**: Light mode (white background)
- **No Neon Flux styling**

---

## Styling Gaps

### 1. **No Unified Theme System**
- Chat components: Dark (Neon Flux)
- Agent pages: Dark (plain)
- Thread list: Light (plain)
- No way to toggle between themes

### 2. **No Design Tokens**
- **Colors**: Hardcoded HSL values in CSS, hardcoded hex in shadows
- **Spacing**: Hardcoded Tailwind classes (`px-5`, `py-4`, `gap-4`)
- **Typography**: Hardcoded Tailwind classes (`text-2xl`, `text-xs`)
- **Border Radius**: Hardcoded values (`rounded-2xl`, `rounded-lg`)
- **Elevation (Shadows)**: Hardcoded box-shadow values

### 3. **No Component Primitives**
- No `<Box>`, `<Stack>`, `<Text>`, `<Button>` primitives
- Every component reinvents layout/styling
- Inconsistent spacing, alignment, typography

### 4. **Inconsistent Glassmorphism**
- Chat components: Full Neon Flux (backdrop-blur, glow, transparent backgrounds)
- Other pages: No glassmorphism at all

### 5. **No Accessibility Tokens**
- No documented contrast ratios
- No focus ring tokens
- No high-contrast theme

---

## Migration Strategy Recommendations

### Phase 1: Token Extraction (P1)
1. **Extract existing colors** from `globals.css` into token structure:
   - Primitive: `--color-purple-500: #a855f7` (from HSL 277 92% 62%)
   - Semantic: `--color-text-primary`, `--color-bg-surface`
   - Component: `--color-message-user-bg`, `--color-button-primary-bg`

2. **Add missing tokens**:
   - Spacing: `--space-1` through `--space-9` (4px base unit)
   - Typography: `--font-size-xs`, `--font-size-base`, `--line-height-tight`
   - Border radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`
   - Elevation: `--shadow-sm`, `--shadow-md`, `--shadow-glow-purple`, `--shadow-glow-blue`

3. **Create Tailwind config extensions**:
   ```js
   // tailwind.config.ts
   theme: {
     extend: {
       colors: {
         'text-primary': 'hsl(var(--color-text-primary))',
         'bg-surface': 'hsl(var(--color-bg-surface))',
       },
       spacing: {
         '1': 'var(--space-1)',
         '4': 'var(--space-4)',
       },
       borderRadius: {
         'sm': 'var(--radius-sm)',
         'md': 'var(--radius-md)',
       },
       boxShadow: {
         'glow-purple': 'var(--shadow-glow-purple)',
         'glow-blue': 'var(--shadow-glow-blue)',
       }
     }
   }
   ```

### Phase 2: Migrate Existing Components (P1)
1. **MessageBubble**: Replace hardcoded shadows with token-based shadows
   ```tsx
   // Before
   shadow-[0_0_20px_rgba(168,85,247,0.3)]
   
   // After
   shadow-glow-purple
   ```

2. **All chat components**: Ensure consistent token usage

3. **Keep existing API**: Don't break `sender` prop or other APIs

### Phase 3: Extend to Non-Chat UI (P2)
1. **Apply Neon Flux theme** to Agents page, Thread list
2. **Create component primitives**: Box, Stack, Button
3. **Refactor AgentList**, ThreadListView to use primitives

### Phase 4: Theme Switching (P2)
1. **Add Theme component**: `<Theme appearance="dark" />`
2. **localStorage persistence**: Remember user preference
3. **CSS class switching**: `.theme-dark`, `.theme-light`

### Phase 5: Documentation (P3)
1. **Document existing components**: MessageBubble, CodeBlock
2. **Create token reference**: Color swatches, contrast ratios
3. **Accessibility guide**: WCAG compliance, keyboard navigation

---

## Key Findings for Spec 013

### What Already Exists ✅
- CSS custom properties foundation (`--color-*` variables)
- Neon Flux aesthetic in chat components (purple/blue, glassmorphism)
- Tailwind CSS integration
- `cn()` utility for class merging
- Component library structure (`packages/ui`)

### What's Missing ❌
- Design token architecture (primitive → semantic → component)
- Theme switching mechanism
- Component primitives (Box, Stack, Text, Button)
- Consistent theming across all pages (currently chat-only)
- Documentation/catalog
- Accessibility token documentation

### Critical Decisions Needed
1. **Backward Compatibility**: How to migrate existing components without breaking?
   - **Recommendation**: Keep existing API, refactor internals to use tokens
   
2. **Theme Default**: Dark (Neon Flux) or Light?
   - **Current**: Chat is dark, other pages are light (inconsistent)
   - **Recommendation**: Default to dark (Neon Flux) for consistency, add theme toggle

3. **Token Format**: Keep HSL without `hsl()` wrapper (Tailwind convention) or switch to standard CSS?
   - **Current**: `277 92% 62%` (Tailwind opacity support)
   - **Recommendation**: Keep Tailwind convention for compatibility, document in token reference

4. **Glassmorphism Everywhere**: Apply to all pages or keep minimal for non-chat?
   - **Current**: Chat only
   - **Recommendation**: Apply to all pages with same Neon Flux aesthetic (brand consistency)

---

## Screenshots Reference

1. **Home Page (Light)**: `/Users/ronny/dev/cerebrobot/.playwright-mcp/current-app-home.png`
   - White background, minimal styling, no Neon Flux

2. **Agents Page (Dark but not Neon Flux)**: `/Users/ronny/dev/cerebrobot/.playwright-mcp/agents-list.png`
   - Black background, no glassmorphism, content not visible in screenshot

---

## Next Steps

1. ✅ **Update research.md** with current state findings
2. ✅ **Update plan.md** with migration strategy (Phase 1: Extract tokens from existing code)
3. ✅ **Update data-model.md** with token structure matching existing CSS custom properties
4. ⏳ **Create contracts/migration-strategy.md** - backward compatibility plan for existing components
5. ⏳ **Update quickstart.md** - how to migrate existing components to use new token system
6. ⏳ **Run `/speckit.tasks`** to generate implementation tasks

---

**Audit Complete**: 2025-11-02  
**Audited By**: GitHub Copilot (Playwright MCP + Codebase Analysis)
