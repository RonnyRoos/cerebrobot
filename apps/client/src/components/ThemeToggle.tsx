/**
 * ThemeToggle Component (T059)
 *
 * Purpose: Demo component for theme switching functionality
 * User Story: US3 - Theme Switching (Priority P2)
 *
 * Features:
 * - Toggle between dark, light, and high-contrast themes
 * - System theme preference option
 * - Visual indicators for active theme
 * - Accessible keyboard navigation
 */

import { useTheme, Button, Stack, Text } from '@workspace/ui';

export function ThemeToggle() {
  const { theme, setTheme, useSystemTheme, toggleSystemTheme } = useTheme();

  return (
    <Stack spacing="4" p="4" bg="bg-surface" rounded="lg" border="1">
      <Text variant="label" weight="bold">
        Theme Settings
      </Text>

      {/* Theme Buttons */}
      <Stack direction="row" spacing="2" align="center">
        <Button
          variant={theme === 'dark' && !useSystemTheme ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTheme('dark')}
        >
          🌙 Dark
        </Button>

        <Button
          variant={theme === 'light' && !useSystemTheme ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTheme('light')}
        >
          ☀️ Light
        </Button>

        <Button
          variant={theme === 'high-contrast' && !useSystemTheme ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTheme('high-contrast')}
        >
          ⚡ High Contrast
        </Button>
      </Stack>

      {/* System Theme Toggle */}
      <Stack direction="row" spacing="2" align="center">
        <Button
          variant={useSystemTheme ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleSystemTheme}
        >
          💻 Use System Theme
        </Button>

        {useSystemTheme && (
          <Text variant="caption" color="text-secondary">
            Following system preference ({theme})
          </Text>
        )}
      </Stack>

      {/* Current Theme Display */}
      <Stack spacing="1">
        <Text variant="caption" color="text-secondary">
          Current theme: <strong>{theme}</strong>
        </Text>
        <Text variant="caption" color="text-secondary">
          System theme: {useSystemTheme ? 'enabled' : 'disabled'}
        </Text>
      </Stack>
    </Stack>
  );
}
