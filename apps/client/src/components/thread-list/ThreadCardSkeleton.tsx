import { Box, Stack } from '@workspace/ui';

/**
 * ThreadCardSkeleton Component
 *
 * Loading skeleton for ThreadCard with animate-pulse.
 * Shows glassmorphic rectangles matching card layout during fetch.
 *
 * Spec: Feature 015 - User Story 5 (T081)
 */
export function ThreadCardSkeleton(): JSX.Element {
  return (
    <div className="flex w-full animate-pulse rounded-lg border border-border-default bg-surface/50 p-4 backdrop-blur-sm">
      {/* Gradient Accent Bar Skeleton */}
      <div className="w-[3px] rounded-l-lg bg-gradient-blue-purple opacity-50" aria-hidden="true" />

      {/* Content Skeleton */}
      <div className="flex-1 p-4">
        <Stack gap="2">
          {/* Title + Badge Row Skeleton */}
          <Stack direction="horizontal" align="center" justify="between">
            {/* Title skeleton */}
            <div className="h-6 w-48 rounded-md bg-text-secondary/20" />
            {/* Badge skeleton */}
            <div className="ml-2 h-6 w-16 rounded-full bg-accent-primary/20" />
          </Stack>

          {/* Message Preview Skeleton */}
          <div className="h-4 w-full rounded-md bg-text-secondary/20" />
          <div className="h-4 w-3/4 rounded-md bg-text-secondary/20" />

          {/* Metadata Row Skeleton */}
          <Stack direction="horizontal" gap="2" align="center">
            <div className="h-3 w-16 rounded-md bg-text-secondary/20" />
            <div className="h-3 w-3 rounded-full bg-text-secondary/20" />
            <div className="h-4 w-6 rounded-full bg-text-secondary/20" />
            <div className="h-3 w-20 rounded-md bg-text-secondary/20" />
          </Stack>
        </Stack>
      </div>
    </div>
  );
}

/**
 * ThreadListSkeleton Component
 *
 * Renders 3 ThreadCardSkeleton components for loading state.
 */
export function ThreadListSkeleton(): JSX.Element {
  return (
    <Box className="flex-1 space-y-2 p-4">
      <ThreadCardSkeleton />
      <ThreadCardSkeleton />
      <ThreadCardSkeleton />
    </Box>
  );
}
