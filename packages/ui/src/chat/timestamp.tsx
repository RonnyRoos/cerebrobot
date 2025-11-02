import { forwardRef, useState, useEffect } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import { cn } from '../utils/cn';
import { formatTimestamp as formatTimestampUtil } from '../utils/format-timestamp';

/**
 * Props for the Timestamp component
 */
export interface TimestampProps
  extends Omit<ComponentPropsWithoutRef<'time'>, 'children' | 'dateTime'> {
  /**
   * The date/time to display.
   */
  date: Date;

  /**
   * How to format the timestamp:
   * - 'relative': Always relative ("5m ago")
   * - 'absolute': Always absolute ("3:45 PM")
   * - 'auto': Relative for recent (<24h), absolute for older
   * @default 'auto'
   */
  format?: 'relative' | 'absolute' | 'auto';

  /**
   * How often to update the timestamp (in milliseconds).
   * Set to 0 to disable auto-updates.
   * @default 60000 (1 minute)
   */
  updateInterval?: number;
}

/**
 * Element ref type for the Timestamp component
 */
export type TimestampElement = ElementRef<'time'>;

/**
 * Timestamp Component
 *
 * Displays a formatted timestamp with automatic updates.
 * Recent messages show relative time ("5m ago"), older messages show absolute time.
 *
 * @example
 * ```tsx
 * // Auto format (default)
 * <Timestamp date={new Date()} />
 *
 * // Always relative
 * <Timestamp date={new Date()} format="relative" />
 *
 * // Custom update interval (30 seconds)
 * <Timestamp date={new Date()} updateInterval={30000} />
 *
 * // No auto-updates
 * <Timestamp date={new Date()} updateInterval={0} />
 * ```
 */
export const Timestamp = forwardRef<TimestampElement, TimestampProps>(
  ({ date, format = 'auto', updateInterval = 60000, className, ...props }, ref) => {
    const [formattedTime, setFormattedTime] = useState(() => formatTimestampUtil(date, format));

    useEffect(() => {
      // Update immediately on mount or when props change
      setFormattedTime(formatTimestampUtil(date, format));

      // Set up auto-update if enabled
      if (updateInterval > 0) {
        const intervalId = setInterval(() => {
          setFormattedTime(formatTimestampUtil(date, format));
        }, updateInterval);

        return () => clearInterval(intervalId);
      }
    }, [date, format, updateInterval]);

    return (
      <time
        ref={ref}
        dateTime={date.toISOString()}
        className={cn('text-timestamp text-chat-timestamp', className)}
        {...props}
      >
        {formattedTime}
      </time>
    );
  },
);

Timestamp.displayName = 'Timestamp';
