# Theme API Contract

**Feature**: Professional Design System with Neon Flux Theme  
**Version**: 1.0.0  
**Date**: 2025-11-02

---

## Overview

This contract defines the theming system API, including the `Theme` component, `useTheme` hook, CSS class switching mechanism, and localStorage persistence.

---

## Theme Component

### Purpose

Root-level component that provides theme context and manages CSS class application.

### Props Interface

```typescript
type ThemeProps = {
  /** Theme appearance (dark, light, high-contrast) */
  appearance?: 'dark' | 'light' | 'high-contrast';
  
  /** Accent color variant */
  accentColor?: 'purple' | 'blue' | 'pink' | 'cyan';
  
  /** Enable glassmorphism effects (Neon Flux aesthetic) */
  glassmorphism?: boolean;
  
  /** Force theme (ignore system preference and localStorage) */
  forcedTheme?: 'dark' | 'light' | 'high-contrast';
  
  /** Disable localStorage persistence */
  disableStorage?: boolean;
  
  /** Disable smooth transitions on theme change */
  disableTransitions?: boolean;
  
  /** Custom CSS class prefix (default: 'theme-') */
  classPrefix?: string;
  
  /** Children components */
  children: React.ReactNode;
};

export function Theme(props: ThemeProps): JSX.Element;
```

### Default Behavior

```typescript
// Default props
const defaultProps: ThemeProps = {
  appearance: 'dark',          // Default to Neon Flux dark
  accentColor: 'purple',       // Purple accent
  glassmorphism: true,         // Enable Neon Flux aesthetic
  forcedTheme: undefined,      // Respect user preference
  disableStorage: false,       // Persist to localStorage
  disableTransitions: false,   // Smooth transitions enabled
  classPrefix: 'theme-',       // CSS classes: .theme-dark, .theme-light
};
```

### Usage Examples

**Basic Setup**:
```tsx
import { Theme } from '@workspace/ui/theme';

function App() {
  return (
    <Theme appearance="dark" accentColor="purple">
      <AppContent />
    </Theme>
  );
}
```

**Respect System Preference**:
```tsx
import { Theme } from '@workspace/ui/theme';

function App() {
  // Read system preference
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  
  return (
    <Theme appearance={systemTheme}>
      <AppContent />
    </Theme>
  );
}
```

**Force Theme (Ignore User Preference)**:
```tsx
// Always dark (e.g., for marketing page)
<Theme forcedTheme="dark">
  <MarketingPage />
</Theme>
```

**Disable Transitions** (for testing):
```tsx
<Theme disableTransitions>
  <AppContent />
</Theme>
```

**Custom Class Prefix**:
```tsx
// CSS classes: .cerebro-dark, .cerebro-light
<Theme classPrefix="cerebro-">
  <AppContent />
</Theme>
```

---

## useTheme Hook

### Purpose

Access and manipulate theme state from any component.

### Hook Interface

```typescript
type ThemeState = {
  /** Current theme appearance */
  appearance: 'dark' | 'light' | 'high-contrast';
  
  /** Current accent color */
  accentColor: 'purple' | 'blue' | 'pink' | 'cyan';
  
  /** Glassmorphism enabled */
  glassmorphism: boolean;
  
  /** System preference (if available) */
  systemPreference: 'dark' | 'light' | null;
  
  /** Whether theme is forced */
  isForced: boolean;
};

type ThemeActions = {
  /** Set theme appearance */
  setAppearance: (appearance: 'dark' | 'light' | 'high-contrast') => void;
  
  /** Set accent color */
  setAccentColor: (color: 'purple' | 'blue' | 'pink' | 'cyan') => void;
  
  /** Toggle between dark/light */
  toggleAppearance: () => void;
  
  /** Enable/disable glassmorphism */
  setGlassmorphism: (enabled: boolean) => void;
  
  /** Reset to system preference */
  resetToSystem: () => void;
};

type UseThemeReturn = ThemeState & ThemeActions;

export function useTheme(): UseThemeReturn;
```

### Usage Examples

**Read Theme State**:
```tsx
import { useTheme } from '@workspace/ui/theme';

function ThemeDisplay() {
  const { appearance, accentColor } = useTheme();
  
  return (
    <div>
      Current theme: {appearance} with {accentColor} accent
    </div>
  );
}
```

**Toggle Theme**:
```tsx
import { useTheme } from '@workspace/ui/theme';

function ThemeToggle() {
  const { appearance, toggleAppearance } = useTheme();
  
  return (
    <button onClick={toggleAppearance}>
      Switch to {appearance === 'dark' ? 'light' : 'dark'} mode
    </button>
  );
}
```

**Set Accent Color**:
```tsx
import { useTheme } from '@workspace/ui/theme';

function AccentColorPicker() {
  const { accentColor, setAccentColor } = useTheme();
  
  return (
    <div>
      {(['purple', 'blue', 'pink', 'cyan'] as const).map((color) => (
        <button
          key={color}
          onClick={() => setAccentColor(color)}
          className={accentColor === color ? 'selected' : ''}
        >
          {color}
        </button>
      ))}
    </div>
  );
}
```

**Reset to System**:
```tsx
import { useTheme } from '@workspace/ui/theme';

function ThemeSettings() {
  const { appearance, systemPreference, resetToSystem } = useTheme();
  
  return (
    <div>
      <p>Current: {appearance}</p>
      <p>System: {systemPreference ?? 'Not available'}</p>
      <button onClick={resetToSystem}>Use system preference</button>
    </div>
  );
}
```

**Conditional Rendering Based on Theme**:
```tsx
import { useTheme } from '@workspace/ui/theme';

function Logo() {
  const { appearance } = useTheme();
  
  return (
    <img
      src={appearance === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="Cerebrobot"
    />
  );
}
```

---

## CSS Class Switching

### Mechanism

Theme appearance is applied via CSS class on `<html>` element:

```html
<!-- Dark theme (default) -->
<html class="theme-dark">

<!-- Light theme -->
<html class="theme-light">

<!-- High-contrast theme -->
<html class="theme-high-contrast">
```

### Token Overrides

```css
/* Base tokens (dark theme) */
:root {
  --color-text-primary: 240 5% 97%;
  --color-bg-surface: 240 20% 5%;
  --shadow-glow-purple: 0 0 20px rgba(168, 85, 247, 0.3);
}

/* Light theme overrides */
.theme-light {
  --color-text-primary: 222 47% 11%;
  --color-bg-surface: 240 5% 96%;
  --shadow-glow-purple: none; /* No glow in light mode */
}

/* High-contrast overrides */
.theme-high-contrast {
  --color-text-primary: #ffffff;
  --color-bg-surface: #000000;
  --color-border-subtle: #ffffff;
  --shadow-glow-purple: none; /* No decorative shadows */
}
```

### Accent Color Classes

Accent color variants use additional classes:

```html
<html class="theme-dark accent-purple">
<html class="theme-dark accent-blue">
<html class="theme-dark accent-pink">
<html class="theme-dark accent-cyan">
```

```css
/* Purple accent (default) */
.accent-purple {
  --color-accent-primary: 277 92% 62%;
  --shadow-glow-accent: var(--shadow-glow-purple);
}

/* Blue accent */
.accent-blue {
  --color-accent-primary: 221 91% 60%;
  --shadow-glow-accent: var(--shadow-glow-blue);
}

/* Pink accent */
.accent-pink {
  --color-accent-primary: 330 81% 60%;
  --shadow-glow-accent: var(--shadow-glow-pink);
}

/* Cyan accent */
.accent-cyan {
  --color-accent-primary: 187 95% 43%;
  --shadow-glow-accent: var(--shadow-glow-cyan);
}
```

### Glassmorphism Toggle

```html
<!-- Glassmorphism enabled (default) -->
<html class="theme-dark glassmorphism">

<!-- Glassmorphism disabled (better performance) -->
<html class="theme-dark">
```

```css
/* Glassmorphism effects (only when enabled) */
.glassmorphism .glassmorphic-surface {
  background: hsl(var(--color-bg-surface) / 0.2);
  backdrop-filter: blur(var(--blur-md));
  border: 1px solid hsl(var(--color-border-subtle) / 0.3);
}

/* Fallback (solid background) */
.glassmorphic-surface {
  background: hsl(var(--color-bg-surface));
}
```

---

## localStorage Persistence

### Storage Key

```typescript
const THEME_STORAGE_KEY = 'cerebro-theme';
```

### Data Structure

```typescript
type StoredTheme = {
  appearance: 'dark' | 'light' | 'high-contrast';
  accentColor: 'purple' | 'blue' | 'pink' | 'cyan';
  glassmorphism: boolean;
  version: '1.0.0'; // Schema version for future migrations
};
```

### Persistence Flow

```typescript
// Save theme to localStorage
function saveTheme(theme: StoredTheme) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
}

// Load theme from localStorage
function loadTheme(): StoredTheme | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const parsed = JSON.parse(stored);
    // Validate schema version
    if (parsed.version !== '1.0.0') {
      console.warn('Theme schema mismatch, using defaults');
      return null;
    }
    return parsed;
  } catch {
    console.error('Failed to parse stored theme');
    return null;
  }
}

// Theme component initialization
function Theme({ appearance, accentColor, glassmorphism, disableStorage }: ThemeProps) {
  // Load from localStorage on mount (if not disabled)
  const [theme, setTheme] = useState(() => {
    if (disableStorage) return { appearance, accentColor, glassmorphism };
    const stored = loadTheme();
    return stored ?? { appearance, accentColor, glassmorphism };
  });
  
  // Save to localStorage on change
  useEffect(() => {
    if (!disableStorage) {
      saveTheme({ ...theme, version: '1.0.0' });
    }
  }, [theme, disableStorage]);
  
  // ...
}
```

### Migration Strategy

When schema version changes (e.g., new theme properties):

```typescript
function migrateTheme(stored: any): StoredTheme | null {
  if (!stored.version) {
    // Migrate from v0 (no version) to v1.0.0
    return {
      appearance: stored.theme ?? 'dark',
      accentColor: 'purple', // New in v1.0.0
      glassmorphism: true,   // New in v1.0.0
      version: '1.0.0',
    };
  }
  
  if (stored.version === '1.0.0') {
    return stored; // No migration needed
  }
  
  // Unknown version, reset
  return null;
}
```

---

## SSR Compatibility

### Prevent FOUC (Flash of Unstyled Content)

**Problem**: Server renders default theme, client hydrates with stored theme → flicker

**Solution**: Inline script before React hydration

```html
<!DOCTYPE html>
<html>
<head>
  <script>
    // Run BEFORE first paint
    (function() {
      const stored = localStorage.getItem('cerebro-theme');
      if (stored) {
        try {
          const { appearance, accentColor, glassmorphism } = JSON.parse(stored);
          document.documentElement.className = [
            `theme-${appearance}`,
            `accent-${accentColor}`,
            glassmorphism ? 'glassmorphism' : '',
          ].filter(Boolean).join(' ');
        } catch {}
      }
    })();
  </script>
  <!-- CSS loaded after theme class is set -->
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root"></div>
  <script src="/main.js"></script>
</body>
</html>
```

### Next.js Integration

```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('cerebro-theme');
                if (stored) {
                  try {
                    const { appearance, accentColor, glassmorphism } = JSON.parse(stored);
                    document.documentElement.className = [
                      'theme-' + appearance,
                      'accent-' + accentColor,
                      glassmorphism ? 'glassmorphism' : '',
                    ].filter(Boolean).join(' ');
                  } catch {}
                }
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

---

## Theme Transition Performance

### Success Criterion

**Target**: Theme switch < 150ms (perceived instant)

### Optimization Strategies

#### 1. CSS Variable Updates (Fastest)

```css
/* All color/spacing changes via CSS variables */
:root {
  --color-text-primary: 240 5% 97%;
  transition: none; /* Don't animate custom properties */
}

.theme-light {
  --color-text-primary: 222 47% 11%;
}

/* Animate derived properties only */
.text-primary {
  color: hsl(var(--color-text-primary));
  transition: color 150ms ease-in-out;
}
```

#### 2. Class Switching (Fast)

```typescript
// Single class update on <html>
document.documentElement.className = 'theme-light accent-purple glassmorphism';
```

#### 3. Disable Transitions During Switch (Optional)

```typescript
function setTheme(appearance: string) {
  // Disable all transitions temporarily
  document.documentElement.classList.add('no-transitions');
  
  // Update theme class
  document.documentElement.className = `theme-${appearance}`;
  
  // Re-enable after next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
    });
  });
}
```

```css
/* Disable transitions during theme switch */
.no-transitions,
.no-transitions * {
  transition: none !important;
}
```

#### 4. Measure Performance

```typescript
function measureThemeSwitch(newTheme: string) {
  const start = performance.now();
  
  setTheme(newTheme);
  
  requestAnimationFrame(() => {
    const end = performance.now();
    const duration = end - start;
    
    console.log(`Theme switch took ${duration.toFixed(2)}ms`);
    
    if (duration > 150) {
      console.warn('⚠️ Theme switch exceeded 150ms target');
    }
  });
}
```

---

## ThemeConfig Interface

### Purpose

Advanced theme customization (for power users, operators).

### Interface

```typescript
type ThemeConfig = {
  /** Base theme to extend */
  base: 'dark' | 'light' | 'high-contrast';
  
  /** Token overrides */
  tokens?: {
    colors?: Partial<ColorTokens>;
    spacing?: Partial<SpacingTokens>;
    typography?: Partial<TypographyTokens>;
    elevation?: Partial<ElevationTokens>;
    radius?: Partial<RadiusTokens>;
    blur?: Partial<BlurTokens>;
  };
  
  /** Gradient definitions (Neon Flux) */
  gradients?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  
  /** Glassmorphism settings */
  glassmorphism?: {
    enabled: boolean;
    blurIntensity?: 'sm' | 'md' | 'lg';
    borderOpacity?: number; // 0-1
    backgroundOpacity?: number; // 0-1
  };
  
  /** Animation settings */
  animations?: {
    duration?: number; // ms
    easing?: string;   // CSS easing function
  };
};

export function createTheme(config: ThemeConfig): ThemeProps;
```

### Usage Example

```typescript
import { createTheme, Theme } from '@workspace/ui/theme';

const customTheme = createTheme({
  base: 'dark',
  tokens: {
    colors: {
      'accent-primary': '330 81% 60%', // Pink instead of purple
    },
    spacing: {
      '4': '1.5rem', // Larger base spacing
    },
  },
  gradients: {
    primary: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
  },
  glassmorphism: {
    enabled: true,
    blurIntensity: 'lg',
    backgroundOpacity: 0.15,
  },
  animations: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
});

function App() {
  return (
    <Theme {...customTheme}>
      <AppContent />
    </Theme>
  );
}
```

---

## Testing Strategies

### Unit Tests

**Theme Context**:
```typescript
import { render, screen } from '@testing-library/react';
import { Theme, useTheme } from './theme';

function ThemeConsumer() {
  const { appearance } = useTheme();
  return <div>Theme: {appearance}</div>;
}

test('provides theme context', () => {
  render(
    <Theme appearance="dark">
      <ThemeConsumer />
    </Theme>
  );
  
  expect(screen.getByText('Theme: dark')).toBeInTheDocument();
});
```

**Theme Toggle**:
```typescript
import { renderHook, act } from '@testing-library/react';
import { Theme, useTheme } from './theme';

test('toggles between dark/light', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Theme appearance="dark">{children}</Theme>
  );
  
  const { result } = renderHook(() => useTheme(), { wrapper });
  
  expect(result.current.appearance).toBe('dark');
  
  act(() => {
    result.current.toggleAppearance();
  });
  
  expect(result.current.appearance).toBe('light');
});
```

**localStorage Persistence**:
```typescript
test('persists theme to localStorage', () => {
  const { result } = renderHook(() => useTheme(), {
    wrapper: ({ children }) => (
      <Theme appearance="dark">{children}</Theme>
    ),
  });
  
  act(() => {
    result.current.setAppearance('light');
  });
  
  const stored = localStorage.getItem('cerebro-theme');
  expect(stored).toBeTruthy();
  expect(JSON.parse(stored!).appearance).toBe('light');
});
```

### Integration Tests (Playwright)

**Theme Switch Performance**:
```typescript
import { test, expect } from '@playwright/test';

test('theme switch completes in <150ms', async ({ page }) => {
  await page.goto('/');
  
  const start = Date.now();
  await page.click('[data-testid="theme-toggle"]');
  
  // Wait for transition to complete
  await page.waitForFunction(() => {
    return document.documentElement.classList.contains('theme-light');
  });
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(150);
});
```

**FOUC Prevention**:
```typescript
test('no flash of unstyled content', async ({ page }) => {
  // Set localStorage before navigation
  await page.addInitScript(() => {
    localStorage.setItem('cerebro-theme', JSON.stringify({
      appearance: 'light',
      accentColor: 'blue',
      glassmorphism: true,
      version: '1.0.0',
    }));
  });
  
  await page.goto('/');
  
  // Check initial HTML class (before hydration)
  const initialClass = await page.evaluate(() => {
    return document.documentElement.className;
  });
  
  expect(initialClass).toContain('theme-light');
  expect(initialClass).toContain('accent-blue');
});
```

**Visual Regression**:
```typescript
test('theme variants render consistently', async ({ page }) => {
  await page.goto('/');
  
  // Dark theme
  await expect(page).toHaveScreenshot('theme-dark.png');
  
  // Switch to light
  await page.click('[data-testid="theme-toggle"]');
  await expect(page).toHaveScreenshot('theme-light.png');
  
  // High-contrast
  await page.evaluate(() => {
    document.documentElement.className = 'theme-high-contrast';
  });
  await expect(page).toHaveScreenshot('theme-high-contrast.png');
});
```

---

## Migration from Existing Code

### Current State (spec 012)

```tsx
// No centralized theming
// Dark mode hardcoded in globals.css
.dark {
  --color-message-user-bg: 277 92% 62%;
  --color-message-agent-bg: 221 91% 60%;
}
```

### Migration Steps

**Step 1**: Wrap app in Theme component
```tsx
// apps/client/src/main.tsx
import { Theme } from '@workspace/ui/theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme appearance="dark" accentColor="purple">
      <App />
    </Theme>
  </StrictMode>
);
```

**Step 2**: Replace `.dark` class with `.theme-dark`
```css
/* Old */
.dark {
  --color-message-user-bg: 277 92% 62%;
}

/* New */
.theme-dark {
  --color-accent-primary: 277 92% 62%;
}
```

**Step 3**: Add theme toggle UI
```tsx
import { useTheme } from '@workspace/ui/theme';

function ThemeToggle() {
  const { appearance, toggleAppearance } = useTheme();
  
  return (
    <button onClick={toggleAppearance} data-testid="theme-toggle">
      {appearance === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

**Step 4**: Test localStorage persistence
```typescript
// Verify theme persists across page reloads
localStorage.setItem('cerebro-theme', JSON.stringify({
  appearance: 'light',
  accentColor: 'blue',
  glassmorphism: false,
  version: '1.0.0',
}));

// Reload page
location.reload();

// Should restore light theme
```

---

**Next**: See [migration-strategy.md](migration-strategy.md) for backward-compatible refactor plan.
