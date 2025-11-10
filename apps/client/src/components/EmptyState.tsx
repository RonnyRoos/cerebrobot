/**
 * EmptyState Component
 * Reusable empty state with icon, heading, description, and CTA button
 * Migrated to design system primitives (T087-T088)
 * Enhanced with fade-in animation (T080)
 */

import { Brain } from 'lucide-react';
import { Box, Stack, Text, Button } from '@workspace/ui';

interface EmptyStateProps {
  icon?: string; // Optional emoji icon (e.g., '💬', '🤖')
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
    <Box className="flex h-full items-center justify-center p-8">
      <Box className="max-w-md animate-fade-in rounded-2xl border border-border bg-surface/50 p-12 text-center shadow-lg backdrop-blur-md">
        <Stack gap="6" align="center">
          {/* Icon - Brain icon or emoji (T080) */}
          {icon ? (
            <Text as="div" className="text-6xl" role="img" aria-label="Empty state icon">
              {icon}
            </Text>
          ) : (
            <Brain size={48} className="text-accent-primary" aria-label="No conversations" />
          )}

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
