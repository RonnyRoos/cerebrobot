import { Box, Text, Stack } from '@workspace/ui';
import { Settings } from 'lucide-react';

/**
 * Settings Page (Placeholder)
 *
 * Future: Application configuration and preferences
 * Phase 6+ feature - not part of MVP
 */
export function SettingsPage() {
  return (
    <Box className="p-8">
      <Stack gap="6" align="center" className="max-w-2xl mx-auto mt-16">
        <Settings size={64} className="text-accent-primary opacity-50" />
        <Text as="h1" variant="heading" size="2xl" className="text-center">
          Settings
        </Text>
        <Text variant="body" size="lg" className="text-text-secondary text-center">
          Application settings and preferences coming soon.
        </Text>
        <Text variant="body" className="text-text-tertiary text-center">
          This feature will allow you to configure themes, notification preferences, default agent
          settings, and other application-wide options.
        </Text>
      </Stack>
    </Box>
  );
}
