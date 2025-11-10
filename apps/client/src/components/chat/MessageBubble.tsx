import { Box, Text } from '@workspace/ui';
import type { ReactNode } from 'react';

export interface MessageBubbleProps {
  /**
   * Type of message - determines gradient background
   * - 'user': purple-pink gradient
   * - 'agent': blue-purple gradient
   */
  messageType: 'user' | 'agent';

  /**
   * Message content
   */
  children: ReactNode;

  /**
   * Glow intensity on hover
   * - 'low': 40% opacity
   * - 'medium': 60% opacity (default)
   * - 'high': 80% opacity
   */
  glowIntensity?: 'low' | 'medium' | 'high';

  /**
   * Sender name to display
   */
  senderName?: string;

  /**
   * Message timestamp
   */
  timestamp?: Date | string;

  /**
   * Optional latency display
   */
  latencyMs?: number;

  /**
   * Optional token usage display
   */
  tokenUsage?: {
    utilisationPct: number;
    recentTokens: number;
    budget: number;
  };

  /**
   * Message status
   */
  status?: 'streaming' | 'complete' | 'error';
}

/**
 * MessageBubble - Neon Flux styled chat message component
 *
 * Features:
 * - Gradient backgrounds (purple-pink for user, blue-purple for agent)
 * - Hover glow effects with configurable intensity
 * - Fade-in animation on render
 * - Asymmetric layout (user right-aligned, agent left-aligned)
 */
export function MessageBubble({
  messageType,
  children,
  glowIntensity = 'medium',
  senderName,
  timestamp,
  latencyMs,
  tokenUsage,
  status,
}: MessageBubbleProps): JSX.Element {
  // Map glow intensity to shadow opacity
  const glowShadow = {
    low: messageType === 'user' ? 'shadow-glow-purple/40' : 'shadow-glow-blue/40',
    medium: messageType === 'user' ? 'shadow-glow-purple' : 'shadow-glow-blue',
    high: messageType === 'user' ? 'shadow-glow-purple/80' : 'shadow-glow-blue/80',
  }[glowIntensity];

  // Convert timestamp to Date if it's a string (from API)
  const timestampDate = timestamp
    ? typeof timestamp === 'string'
      ? new Date(timestamp)
      : timestamp
    : undefined;

  // Gradient and alignment based on message type
  const isUser = messageType === 'user';
  const gradientClass = isUser
    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-accent-primary/30'
    : 'bg-gradient-to-br from-blue-500/15 to-purple-500/15 border-accent-secondary/20';
  const alignmentClass = isUser ? 'ml-12' : 'mr-12';
  const hoverGlowClass = `hover:${glowShadow}`;

  return (
    <Box
      className={`rounded-2xl border backdrop-blur-md transition-all duration-200 ease-out animate-fade-in ${gradientClass} ${alignmentClass} ${hoverGlowClass} overflow-hidden`}
    >
      {/* Header - compact sender info and metadata */}
      {senderName && (
        <Box className="px-3 py-1.5 border-b border-white/5 bg-black/10 flex items-center justify-between gap-2">
          <Box className="flex items-center gap-2">
            <Text as="div" className="font-semibold text-xs opacity-90">
              {senderName}
            </Text>
            {/* Timestamp */}
            {timestampDate && (
              <Text as="span" className="text-[10px] text-text-tertiary opacity-70">
                {timestampDate.toLocaleDateString('sv-SE')} ·{' '}
                {timestampDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </Box>

          <Box className="flex items-center gap-2 text-[10px] text-text-tertiary">
            {/* Latency in seconds */}
            {latencyMs != null && (
              <Text as="span" aria-label="latency">
                {Math.round(latencyMs / 1000)}s
              </Text>
            )}

            {/* Token usage */}
            {tokenUsage && (
              <>
                <Text as="span" className="text-border-default">
                  ·
                </Text>
                <Text as="span" aria-label="token usage">
                  {tokenUsage.utilisationPct}% ctx
                </Text>
              </>
            )}

            {/* Status indicator */}
            {status === 'streaming' && (
              <>
                <Text as="span" className="text-border-default">
                  ·
                </Text>
                <Text as="span" className="text-accent-primary" aria-label="streaming">
                  Streaming…
                </Text>
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Message content */}
      <Box className="p-4">
        <Text as="p" className="text-base leading-relaxed">
          {children}
        </Text>
      </Box>
    </Box>
  );
}
