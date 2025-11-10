# Design Specification: Cerebrobot Navigation & Flow Redesign

**Spec ID**: 015  
**Status**: Draft  
**Created**: 2025-11-07  
**Implementation Guide for Engineers**

---

## Overview

This spec defines the **implementation details** for redesigning Cerebrobot's UX architecture with:
- Collapsible sidebar navigation (icon rail → full drawer)
- Memory panel overlay (toggle on/off during chat)
- Agent creation wizard (multi-step form)
- Enhanced chat experience (rich message bubbles, typing indicators)

**Prerequisites**: 
- Spec 013 (Neon Flux Design System) implemented ✅
- Spec 014 (Design System Migration) completed ✅
- `@workspace/ui` design library available with Box, Stack, Text, Button, Input, Textarea primitives ✅

**Phase**: 1.5 (Foundations - UX Architecture)

**Prototypes**: See `specs/draft-spec/prototypes/` for working HTML demos:
- `01-collapsed-sidebar-chat.html` - Default chat view with hover-expandable sidebar
- `02-expanded-sidebar-memory-panel.html` - Memory panel overlay demonstration
- `03-agent-creation-wizard.html` - Multi-step form with progress indicator

**Prototype Insights**:
- Hover-to-expand sidebar works well; prevents accidental clicks while maintaining accessibility
- Memory panel backdrop (`rgba(0, 0, 0, 0.4)` + `backdrop-filter: blur(8px)`) provides sufficient contrast without being obtrusive
- Progress dots at 12px diameter with 16px gap optimal for visibility and touch targets
- Message gradient backgrounds require `backdrop-filter: blur(24px)` to maintain text readability
- Sidebar z-index: 50, Memory panel: 50, Backdrop: 40 prevents layering conflicts

---

## Component Architecture

### 1. NavigationSidebar Component

**File**: `apps/client/src/components/NavigationSidebar.tsx`

**Purpose**: Persistent sidebar navigation with collapsible drawer, glassmorphic styling.

**Props**:
```typescript
interface NavigationSidebarProps {
  /** Current active route (for highlighting) */
  activeRoute: 'threads' | 'agents' | 'memory' | 'settings';
  
  /** Callback when nav item clicked */
  onNavigate: (route: string) => void;
  
  /** Controlled expanded state (optional, defaults to localStorage) */
  isExpanded?: boolean;
  
  /** Callback when sidebar toggle clicked */
  onToggle?: () => void;
}
```

**Structure**:
```tsx
import { Box, Stack, Button, Text } from '@workspace/ui';
import { useState, useEffect } from 'react';

export function NavigationSidebar({ 
  activeRoute, 
  onNavigate, 
  isExpanded: controlledExpanded, 
  onToggle 
}: NavigationSidebarProps) {
  // Local state for expanded/collapsed (if not controlled)
  const [expanded, setExpanded] = useState(() => {
    if (controlledExpanded !== undefined) return controlledExpanded;
    return localStorage.getItem('sidebar-expanded') === 'true';
  });

  // Persist state to localStorage
  useEffect(() => {
    if (controlledExpanded === undefined) {
      localStorage.setItem('sidebar-expanded', String(expanded));
    }
  }, [expanded, controlledExpanded]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <Box
      className={cn(
        'fixed left-0 top-0 h-screen',
        'bg-surface/80 backdrop-blur-xl border-r border-border',
        'transition-all duration-200 ease-out',
        'z-50', // Ensure sidebar above content
        expanded ? 'w-[280px]' : 'w-[48px]'
      )}
    >
      <Stack direction="vertical" gap="2" className="p-2">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          onClick={handleToggle}
          className="w-full justify-start hover:shadow-glow-purple"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="text-2xl">☰</span>
          {expanded && <Text className="ml-3">Menu</Text>}
        </Button>

        {/* Nav Items */}
        <NavItem
          icon="💬"
          label="Threads"
          active={activeRoute === 'threads'}
          expanded={expanded}
          onClick={() => onNavigate('threads')}
        />
        <NavItem
          icon="🤖"
          label="Agents"
          active={activeRoute === 'agents'}
          expanded={expanded}
          onClick={() => onNavigate('agents')}
        />
        <NavItem
          icon="🧠"
          label="Memory"
          active={activeRoute === 'memory'}
          expanded={expanded}
          onClick={() => onNavigate('memory')}
        />
        <NavItem
          icon="⚙"
          label="Settings"
          active={activeRoute === 'settings'}
          expanded={expanded}
          onClick={() => onNavigate('settings')}
        />
      </Stack>
    </Box>
  );
}

// NavItem subcomponent
interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, expanded, onClick }: NavItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'w-full justify-start',
        'transition-all duration-150',
        active && 'bg-accent-primary/10 border-l-2 border-accent-primary shadow-glow-purple',
        !active && 'hover:bg-surface hover:shadow-glow-purple/50'
      )}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <span className="text-2xl">{icon}</span>
      {expanded && (
        <Text className="ml-3" variant={active ? 'body-bold' : 'body'}>
          {label}
        </Text>
      )}
    </Button>
  );
}
```

**Styling Notes**:
- Sidebar width: 48px collapsed, 280px expanded
- Glassmorphic: `bg-surface/80`, `backdrop-blur-xl`
- Active item: Purple glow (`shadow-glow-purple`), left border accent
- Hover: Slight brightness increase, subtle glow
- Animation: `transition-all duration-200 ease-out`

**Mobile Variant**:
- Bottom bar instead of sidebar (56px height)
- Icons only, no labels
- Fixed position: `bottom-0`, full-width
- Tap opens full-screen navigation modal (future enhancement)

---

### 2. MemoryPanel Component

**File**: `apps/client/src/components/MemoryPanel.tsx`

**Purpose**: Overlay panel for memory graph inspection during chat, slides in from right.

**Props**:
```typescript
interface MemoryPanelProps {
  /** Whether panel is visible */
  isOpen: boolean;
  
  /** Callback when panel closed */
  onClose: () => void;
  
  /** User ID for memory context */
  userId: string;
  
  /** Agent ID for scoped memory */
  agentId: string;
}
```

**Structure**:
```tsx
import { Box, Stack, Button, Text, Input } from '@workspace/ui';
import { useMemories } from '../hooks/useMemories';
import { MemoryBrowser } from './MemoryBrowser/MemoryBrowser'; // Existing component

export function MemoryPanel({ isOpen, onClose, userId, agentId }: MemoryPanelProps) {
  // Reuse existing memory hook
  const {
    memories,
    searchResults,
    stats,
    fetchMemories,
    searchMemories,
    createMemory,
    updateMemory,
    deleteMemory,
  } = useMemories();

  // Fetch memories when panel opens
  useEffect(() => {
    if (isOpen) {
      void fetchMemories();
    }
  }, [isOpen, fetchMemories]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <Box
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <Box
        className={cn(
          'fixed right-0 top-0 h-screen w-[400px]',
          'bg-surface/90 backdrop-blur-xl border-l border-border',
          'shadow-2xl z-50',
          'transform transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <Stack direction="vertical" gap="4" className="h-full p-4">
          {/* Header */}
          <Stack direction="horizontal" className="justify-between items-center">
            <Text variant="heading-3">🧠 Memory</Text>
            <Button
              variant="ghost"
              onClick={onClose}
              aria-label="Close memory panel"
              className="hover:shadow-glow-purple"
            >
              ✕
            </Button>
          </Stack>

          {/* Reuse existing MemoryBrowser component */}
          <Box className="flex-1 overflow-auto">
            <MemoryBrowser
              userId={userId}
              agentId={agentId}
              memories={memories}
              searchResults={searchResults}
              stats={stats}
              onSearch={searchMemories}
              onCreate={createMemory}
              onUpdate={updateMemory}
              onDelete={deleteMemory}
            />
          </Box>
        </Stack>
      </Box>
    </>
  );
}
```

**Animation**:
- Slide-in from right: `transform: translateX(100%)` → `translateX(0)`, 200ms ease-out
- Backdrop fade-in: `opacity: 0` → `opacity: 1`, 150ms

**Mobile**:
- Full-screen modal overlay (w-full h-full)
- Slide-up animation from bottom instead of right

---

### 3. AgentWizard Component

**File**: `apps/client/src/components/AgentWizard.tsx`

**Purpose**: Multi-step form for agent creation, replaces single-page AgentForm.

**Props**:
```typescript
interface AgentWizardProps {
  /** Initial agent data (for edit mode) */
  initialAgent?: Agent;
  
  /** Callback when wizard completes */
  onComplete: (agent: AgentConfig) => void;
  
  /** Callback when wizard cancelled */
  onCancel: () => void;
}
```

**Structure**:
```tsx
import { useState } from 'react';
import { Box, Stack, Button, Text, Input, Textarea, Checkbox } from '@workspace/ui';
import type { AgentConfig } from '@cerebrobot/chat-shared';

type WizardStep = 'basic' | 'llm' | 'memory' | 'autonomy';

export function AgentWizard({ initialAgent, onComplete, onCancel }: AgentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [formData, setFormData] = useState<Partial<AgentConfig>>(
    initialAgent || {
      name: '',
      description: '',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepinfra.com/v1/openai',
      temperature: 0.7,
      enableMemory: true,
      memoryNamespace: '',
      enableAutonomy: false,
      maxIterations: 10,
    }
  );

  const steps: WizardStep[] = ['basic', 'llm', 'memory', 'autonomy'];
  const stepIndex = steps.indexOf(currentStep);
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(steps[stepIndex + 1]);
    } else {
      onComplete(formData as AgentConfig);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1]);
    }
  };

  return (
    <Box className="max-w-2xl mx-auto p-8">
      {/* Progress Indicator */}
      <Stack direction="horizontal" gap="2" className="justify-center mb-8">
        {steps.map((step, index) => (
          <Box
            key={step}
            className={cn(
              'w-3 h-3 rounded-full transition-all duration-200',
              index === stepIndex && 'bg-accent-primary shadow-glow-purple scale-125',
              index < stepIndex && 'bg-accent-primary/50',
              index > stepIndex && 'bg-surface border border-border'
            )}
            aria-label={`Step ${index + 1} of ${steps.length}`}
          />
        ))}
      </Stack>

      {/* Step Content */}
      <Box className="bg-surface/80 backdrop-blur-xl rounded-lg border border-border p-6">
        {currentStep === 'basic' && (
          <BasicInfoStep formData={formData} onChange={setFormData} />
        )}
        {currentStep === 'llm' && (
          <LLMConfigStep formData={formData} onChange={setFormData} />
        )}
        {currentStep === 'memory' && (
          <MemoryConfigStep formData={formData} onChange={setFormData} />
        )}
        {currentStep === 'autonomy' && (
          <AutonomyConfigStep formData={formData} onChange={setFormData} />
        )}
      </Box>

      {/* Navigation */}
      <Stack direction="horizontal" gap="4" className="justify-between mt-6">
        <Button
          variant="secondary"
          onClick={stepIndex === 0 ? onCancel : handleBack}
        >
          {stepIndex === 0 ? 'Cancel' : '← Back'}
        </Button>
        <Button
          variant="primary"
          onClick={handleNext}
          className="shadow-glow-purple"
        >
          {isLastStep ? 'Create Agent' : 'Next →'}
        </Button>
      </Stack>
    </Box>
  );
}

// Step Components (simplified - reuse existing form section components)
function BasicInfoStep({ formData, onChange }: StepProps) {
  return (
    <Stack direction="vertical" gap="4">
      <Text variant="heading-3">Basic Info</Text>
      <Input
        label="Agent Name"
        value={formData.name || ''}
        onChange={(e) => onChange({ ...formData, name: e.target.value })}
        required
      />
      <Textarea
        label="Description"
        value={formData.description || ''}
        onChange={(e) => onChange({ ...formData, description: e.target.value })}
      />
    </Stack>
  );
}

// Similar for LLMConfigStep, MemoryConfigStep, AutonomyConfigStep...
```

**Progress Indicator Design**:
- 4 dots representing steps
- Active step: Large purple dot with glow (`shadow-glow-purple`, `scale-125`)
- Completed steps: Medium purple dot (`bg-accent-primary/50`)
- Upcoming steps: Small gray dot with border (`bg-surface`, `border-border`)

**Validation**:
- "Next" button disabled if required fields empty
- Inline error messages below invalid fields (red text, red glow)

---

### 4. Enhanced ChatView Component

**File**: `apps/client/src/components/ChatView.tsx` (existing - enhancements)

**Enhancements**:

#### A. Chat Header with Memory Toggle

```tsx
// Add to ChatView component (around line 100)
const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);

// In JSX (before message list):
<Box className="sticky top-0 z-10 bg-surface/90 backdrop-blur-xl border-b border-border p-4">
  <Stack direction="horizontal" className="justify-between items-center">
    <Stack direction="horizontal" gap="3" className="items-center">
      <Button variant="ghost" onClick={onBack} aria-label="Back to threads">
        ←
      </Button>
      <Text variant="heading-3">🤖 {agentName}</Text>
    </Stack>
    
    <Button
      variant="ghost"
      onClick={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
      aria-label="Toggle memory panel"
      className={cn(
        'hover:shadow-glow-purple',
        isMemoryPanelOpen && 'bg-accent-primary/10 shadow-glow-purple'
      )}
    >
      🧠 Memory
    </Button>
  </Stack>
</Box>
```

#### B. Enhanced Message Bubbles

```tsx
// Update MessageBubble component (existing file)
// apps/client/src/components/MessageBubble.tsx

function MessageBubble({ message, agentName }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAgent = message.role === 'assistant';

  return (
    <Box
      className={cn(
        'max-w-[80%] p-4 rounded-lg',
        'backdrop-blur-xl border',
        isUser && [
          'ml-auto',
          'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
          'border-purple-500/30',
          'shadow-glow-purple',
        ],
        isAgent && [
          'mr-auto',
          'bg-gradient-to-br from-blue-500/20 to-purple-500/20',
          'border-blue-500/30',
          'shadow-glow-blue',
        ]
      )}
    >
      {isAgent && (
        <Text variant="caption" className="text-accent-secondary mb-2">
          {agentName}
        </Text>
      )}
      <Text variant="body">{message.content}</Text>
      
      {/* Memory update badge (if applicable) */}
      {message.metadata?.memoryUpdated && (
        <Box className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-accent-primary/10 border border-accent-primary/30">
          <span>🧠</span>
          <Text variant="caption" className="text-accent-primary">
            Memory Updated
          </Text>
        </Box>
      )}
    </Box>
  );
}
```

**Gradient Backgrounds**:
- User messages: Purple → Pink gradient (`from-purple-500/20 to-pink-500/20`)
- Agent messages: Blue → Purple gradient (`from-blue-500/20 to-purple-500/20`)
- Both: Glassmorphic (`backdrop-blur-xl`), glowing border, shadow glow

#### C. Typing Indicator (Future Enhancement)

```tsx
// Add when streaming message in progress
{isStreaming && (
  <Box className="flex gap-1 p-4">
    <Box className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
    <Box className="w-2 h-2 rounded-full bg-accent-primary animate-pulse delay-75" />
    <Box className="w-2 h-2 rounded-full bg-accent-primary animate-pulse delay-150" />
  </Box>
)}
```

---

## Layout Implementation

### App.tsx Modifications

**Current routing**: Manual state management (`showAgentsPage`, `activeThread`)  
**Proposed enhancement**: Add sidebar state management

```tsx
// apps/client/src/App.tsx (modifications)

export function App(): JSX.Element {
  const { userId, showUserSetup, handleUserIdReady } = useUserId();
  
  // Navigation state
  const [activeRoute, setActiveRoute] = useState<'threads' | 'agents' | 'memory' | 'settings'>('threads');
  const [activeThread, setActiveThread] = useState<{ threadId: string; agentId: string } | null>(null);
  
  // Memory panel state (global - persists across chat views)
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);

  const handleNavigate = (route: string) => {
    setActiveRoute(route as any);
    setActiveThread(null); // Exit chat view when navigating
    
    // Update URL
    window.history.pushState({}, '', route === 'threads' ? '/' : `/${route}`);
  };

  // Show user setup if no userId
  if (showUserSetup) {
    return <UserSetup onUserIdReady={handleUserIdReady} />;
  }

  return (
    <Box className="flex h-screen">
      {/* Sidebar Navigation */}
      <NavigationSidebar
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
      />

      {/* Main Content (shifted right to account for sidebar) */}
      <Box className="flex-1 ml-[48px]"> {/* or ml-[280px] if expanded */}
        {activeRoute === 'threads' && !activeThread && (
          <ThreadListView
            userId={userId}
            onSelectThread={(threadId, agentId) => setActiveThread({ threadId, agentId })}
            onNewThread={...}
          />
        )}
        
        {activeRoute === 'agents' && <AgentsPage />}
        
        {activeRoute === 'memory' && <MemoryStandalonePage />}
        
        {activeThread && (
          <ChatView
            userId={userId}
            agentId={activeThread.agentId}
            threadId={activeThread.threadId}
            onBack={() => setActiveThread(null)}
            isMemoryPanelOpen={isMemoryPanelOpen}
            onToggleMemory={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
          />
        )}
      </Box>

      {/* Memory Panel Overlay (if in chat view) */}
      {activeThread && (
        <MemoryPanel
          isOpen={isMemoryPanelOpen}
          onClose={() => setIsMemoryPanelOpen(false)}
          userId={userId}
          agentId={activeThread.agentId}
        />
      )}
    </Box>
  );
}
```

**Key Changes**:
- Wrap app in `<Box className="flex">` for sidebar + main content layout
- Sidebar always visible (collapsible via internal state)
- Main content shifted right by sidebar width (`ml-[48px]` or `ml-[280px]`)
- Memory panel as overlay (doesn't affect layout)

---

## Responsive Breakpoints

### Desktop (≥1024px)
- Sidebar: Collapsible (48px → 280px)
- Memory Panel: Side overlay (400px)
- Chat Canvas: Flex-grow (remaining width)

### Tablet (768px - 1023px)
- Sidebar: Icon-only rail (48px, no expand on hover)
- Memory Panel: Full-screen modal
- Chat Canvas: Full-width minus sidebar

### Mobile (<768px)
- Sidebar: Bottom bar (56px height), icons only
- Memory Panel: Full-screen modal
- Chat Canvas: Full-width, full-height
- Forms: Stack vertically, full-width inputs

**Tailwind Utilities**:
```tsx
// Sidebar mobile variant
<Box className={cn(
  'fixed z-50',
  'lg:left-0 lg:top-0 lg:h-screen lg:w-[48px]', // Desktop: left sidebar
  'max-lg:bottom-0 max-lg:left-0 max-lg:w-full max-lg:h-[56px]' // Mobile: bottom bar
)}>
```

---

## Animation Specifications

### Sidebar Expand/Collapse
- **Duration**: 200ms
- **Easing**: ease-out
- **Property**: `width` (48px ↔ 280px)
- **CSS**: `transition: width 200ms ease-out`
- **Label fade**: `transition: opacity 200ms ease-out` (0 → 1 on expand)

### Memory Panel Slide-In
- **Duration**: 200ms
- **Easing**: ease-out
- **Property**: `transform: translateX(100%)` → `translateX(0)`
- **CSS**: `transition: transform 200ms ease-out`
- **Backdrop**: `background: rgba(0, 0, 0, 0.4)`, `backdrop-filter: blur(8px)`, fade-in 150ms

### Button Hover Glow
- **Duration**: 150ms
- **Easing**: ease-in-out (smooth both ways)
- **Property**: `box-shadow` and `transform: translateY(-1px)`
- **CSS**: `transition: all 150ms ease-in-out`
- **Hover shadow**: `0 0 30px rgba(168, 85, 247, 0.6)`
- **Rest shadow**: `0 0 20px rgba(168, 85, 247, 0.4)`

### Progress Indicator (Wizard)
- **Duration**: 200ms
- **Easing**: ease-out
- **Property**: `scale` (1.0 → 1.25), `background-color`, `box-shadow`
- **Active dot**: `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }` (1.5s infinite)

---

## Design Tokens Usage

### Colors
- **Sidebar background**: `rgba(26, 26, 46, 0.8)` with `backdrop-filter: blur(24px)`
- **Active nav item**: `rgba(168, 85, 247, 0.1)` background, `#a855f7` border-left, `0 0 20px rgba(168, 85, 247, 0.4)` shadow
- **Memory panel**: `rgba(26, 26, 46, 0.9)` (higher opacity for more solid feel)
- **User message bubble**: `linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))` with `rgba(168, 85, 247, 0.3)` border
- **Agent message bubble**: `linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))` with `rgba(59, 130, 246, 0.3)` border
- **Background gradient**: `linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)`

### Spacing
- **Sidebar padding**: `8px` (tight for icon-only mode)
- **Nav item gap**: `8px` between items (vertical stack)
- **Nav item padding**: `12px` internal padding
- **Panel padding**: `24px` (more generous for readability)
- **Form field gap**: `24px` vertical spacing (wizard steps)
- **Message gap**: `16px` between chat bubbles
- **Progress dots**: `16px` gap, `12px` diameter
- **Input wrapper**: `12px` gap between textarea and send button

### Typography
- **Nav labels**: `14px`, `font-weight: 500`, hidden when collapsed (opacity: 0)
- **Nav icons**: `24px` emoji/font size, flex-shrink: 0
- **Panel header**: `24px`, `font-weight: 600`
- **Message content**: `15px`, `line-height: 1.6`
- **Message header**: `12px`, `color: #a0a0a0` (muted)
- **Step title**: `28px`, `font-weight: 600`, gradient text fill
- **Form labels**: `14px`, `font-weight: 500`, `color: #c0c0c0`
- **Form hints**: `12px`, `color: #808080`

### Shadows
- **Sidebar**: `border-right: 1px solid rgba(255, 255, 255, 0.1)` (subtle right border)
- **Memory panel**: `box-shadow: -10px 0 50px rgba(0, 0, 0, 0.5)` (dramatic shadow for overlay)
- **Active nav item**: `box-shadow: 0 0 20px rgba(168, 85, 247, 0.4)` (purple glow)
- **Message bubbles**: `box-shadow: 0 0 20px rgba(168, 85, 247, 0.3)` (user) or `rgba(59, 130, 246, 0.3)` (agent)

### Z-Index Layering
- **Sidebar**: `z-index: 50` (above content, below modals)
- **Memory panel backdrop**: `z-index: 40`
- **Memory panel**: `z-index: 50`
- **Chat header**: `z-index: 10` (sticky, above messages)
- **Main content**: `z-index: 0` (default)

### Scrollbar Styling
```css
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.7);
}
```

### Z-Index Layering
- **Sidebar**: `z-index: 50` (above content, below modals)
- **Memory panel backdrop**: `z-index: 40`
- **Memory panel**: `z-index: 50`
- **Chat header**: `z-index: 10` (sticky, above messages)
- **Main content**: `z-index: 0` (default)

---

## Accessibility Implementation

### Keyboard Shortcuts
```tsx
// Add to App.tsx useEffect
useEffect(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    // Ctrl+/ - Toggle sidebar
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      setSidebarExpanded(!sidebarExpanded);
    }
    
    // Ctrl+M - Toggle memory panel
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      setIsMemoryPanelOpen(!isMemoryPanelOpen);
    }
    
    // Ctrl+N - New conversation
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      handleNewThread();
    }
    
    // Esc - Close modals/panels
    if (e.key === 'Escape') {
      setIsMemoryPanelOpen(false);
    }
  };

  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}, [sidebarExpanded, isMemoryPanelOpen]);
```

### ARIA Attributes
- **Sidebar nav items**: `aria-current="page"` for active item
- **Memory panel**: `aria-modal="true"`, `role="dialog"`
- **Wizard progress**: `aria-label="Step X of Y"`
- **Icon buttons**: `aria-label="Clear description"`

### Focus Management
- **Panel open**: Focus first interactive element (search input)
- **Panel close**: Return focus to trigger button (memory icon)
- **Wizard step change**: Focus first field in new step

---

## Testing Strategy

### Manual Smoke Tests
1. **Sidebar Collapse/Expand**: Click hamburger, verify width change, labels show/hide
2. **Navigation Flow**: Click Threads → Agents → Memory, verify route changes, active highlighting
3. **Memory Panel**: Open from chat, close via X or backdrop click, verify animation smooth
4. **Wizard Steps**: Create agent through all 4 steps, verify progress indicator, back button works
5. **Keyboard Shortcuts**: Test Ctrl+/, Ctrl+M, Ctrl+N, Esc
6. **Mobile Responsive**: Resize to <768px, verify bottom bar appears, sidebar hidden

### Component Unit Tests (Vitest)
```tsx
// NavigationSidebar.test.tsx
describe('NavigationSidebar', () => {
  it('renders collapsed by default', () => {
    render(<NavigationSidebar activeRoute="threads" onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('Threads')).toBeInTheDocument();
    expect(screen.queryByText('Threads')).not.toBeInTheDocument(); // Label hidden
  });

  it('expands when toggle clicked', async () => {
    render(<NavigationSidebar activeRoute="threads" onNavigate={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Expand sidebar'));
    expect(screen.getByText('Threads')).toBeInTheDocument(); // Label visible
  });

  it('calls onNavigate when item clicked', async () => {
    const handleNavigate = vi.fn();
    render(<NavigationSidebar activeRoute="threads" onNavigate={handleNavigate} />);
    await userEvent.click(screen.getByLabelText('Agents'));
    expect(handleNavigate).toHaveBeenCalledWith('agents');
  });
});
```

### Accessibility Tests (axe-core)
```tsx
// All components should pass axe-core
it('has no accessibility violations', async () => {
  const { container } = render(<NavigationSidebar activeRoute="threads" onNavigate={vi.fn()} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Implementation Phases

### Phase 1: Navigation Sidebar (P1 - CRITICAL)
- Create `NavigationSidebar.tsx` component
- Update `App.tsx` to integrate sidebar
- Add route state management (`activeRoute`)
- Test collapse/expand, navigation, localStorage persistence

**Estimated Effort**: 4 hours

---

### Phase 2: Memory Panel Overlay (P1 - CRITICAL)
- Create `MemoryPanel.tsx` component
- Integrate with `ChatView.tsx` (add toggle button in header)
- Reuse existing `MemoryBrowser` component
- Add slide-in animation, backdrop overlay
- Test open/close, keyboard shortcuts

**Estimated Effort**: 3 hours

---

### Phase 3: Agent Creation Wizard (P2 - HIGH)
- Create `AgentWizard.tsx` component
- Extract step components from existing `AgentForm.tsx`
- Add progress indicator
- Wire up navigation (Next, Back, Create)
- Replace old form in `AgentsPage.tsx`

**Estimated Effort**: 5 hours

---

### Phase 4: Enhanced Chat Experience (P2 - HIGH)
- Update `MessageBubble.tsx` with gradient backgrounds, glows
- Add memory update badges
- Improve chat header with agent name, back button
- Add typing indicator (during streaming)

**Estimated Effort**: 3 hours

---

### Phase 5: Mobile Responsiveness (P3 - MEDIUM)
- Add bottom bar variant for `NavigationSidebar`
- Make `MemoryPanel` full-screen modal on mobile
- Test touch targets (44x44px minimum)
- Verify no horizontal scrolling

**Estimated Effort**: 3 hours

---

## Success Criteria

### Visual Quality
- ✅ Sidebar expands/collapses smoothly (200ms, no jank)
- ✅ Memory panel slides in from right with backdrop fade
- ✅ Glassmorphic effects render correctly (blur, transparency)
- ✅ Active nav item glows purple, border-left visible
- ✅ Message bubbles have gradient backgrounds, colored glows

### Functional Requirements
- ✅ Sidebar state persists in localStorage
- ✅ Navigation updates URL and active route
- ✅ Memory panel toggles without affecting chat layout
- ✅ Wizard validates each step before allowing "Next"
- ✅ Keyboard shortcuts work (Ctrl+/, Ctrl+M, Ctrl+N, Esc)

### Accessibility
- ✅ WCAG AA compliance (4.5:1 contrast, 44px touch targets)
- ✅ Keyboard navigation works (Tab, Enter, Esc)
- ✅ Screen readers announce nav items, panel state
- ✅ Focus management correct (panels, modals, wizards)

### Performance
- ✅ Sidebar expand/collapse: 200ms (no layout shift)
- ✅ Memory panel open: 200ms (smooth animation)
- ✅ No dropped frames during transitions (60fps)

---

## Open Questions

1. **Agent Switcher Dropdown**: Should chat header include quick agent switcher? (Deferred to future spec)
2. **Memory Graph Visualization**: Dedicated memory view with node graph? (Phase 2+, out of scope)
3. **Settings Page**: What settings should be configurable? (Future spec)
4. **Thread Search**: Search across all conversations? (Future enhancement)

---

## Dependencies

- ✅ `@workspace/ui` design library (Box, Stack, Text, Button, Input, Textarea)
- ✅ Neon Flux design tokens (colors, spacing, shadows)
- ✅ Tailwind CSS 3.4.15+ (animations, responsive utilities)
- ✅ CVA (class-variance-authority) for component variants
- ✅ Existing `useMemories` hook (memory CRUD operations)

---

## References

- [Spec 013: Neon Flux Design System](../013-neon-flux-design-system/spec.md)
- [Spec 014: Design System Migration](../014-design-system-migration/spec.md)
- [UX Requirements Document](./ux-requirements.md)
- [Storybook Component Catalog](http://localhost:6006)
