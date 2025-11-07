/**
 * EmptyState Component
 * Reusable empty state with icon, heading, description, and CTA button
 * Migrated to design system primitives (T087-T088)
 */

import { Box, Stack, Text, Button } from '@workspace/ui';

interface EmptyStateProps {
  icon: string; // Emoji icon (e.g., '💬', '🤖')
  heading: string; // Main heading text
  description: string; // Descriptive explanation
  buttonText: string; // CTA button label
  onButtonClick: () => void; // CTA button action
}

export function EmptyState({
  icon,
  heading,
  description,
  buttonText,
  onButtonClick,
}: EmptyStateProps) {
  return (
    <Box className="flex-1 flex items-center justify-center p-8">
      <Box className="max-w-md rounded-2xl border border-border bg-surface/50 backdrop-blur-md p-12 text-center shadow-lg">
        <Stack gap="6" align="center">
          {/* Icon */}
          <Text as="div" className="text-6xl" role="img" aria-label="Empty state icon">
            {icon}
          </Text>

          {/* Heading */}
          <Text as="h2" variant="heading" size="2xl" className="font-bold">
            {heading}
          </Text>

          {/* Description */}
          <Text variant="body" size="lg" className="text-text-secondary">
            {description}
          </Text>

          {/* CTA Button */}
          <Button variant="primary" size="lg" onClick={onButtonClick} className="mt-2">
            {buttonText}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
