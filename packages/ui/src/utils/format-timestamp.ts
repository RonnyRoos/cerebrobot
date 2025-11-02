/**
 * Format a timestamp for display in chat messages.
 * Uses native Intl APIs for localized formatting.
 *
 * @param date - The date to format
 * @param format - The format type:
 *   - 'relative': Always relative ("5m ago", "2h ago")
 *   - 'absolute': Always absolute ("3:45 PM", "Mar 15, 2024")
 *   - 'auto': Relative for recent (<24h), absolute for older
 * @returns Formatted timestamp string
 */
export function formatTimestamp(
  date: Date,
  format: 'relative' | 'absolute' | 'auto' = 'auto',
): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future timestamps (clock skew)
  if (diffMs < 0) {
    console.warn(
      `formatTimestamp: Future timestamp detected (${date.toISOString()}). Possible clock skew.`,
    );
    return 'just now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Determine which format to use
  const shouldUseRelative = format === 'relative' || (format === 'auto' && diffHours < 24);

  if (shouldUseRelative) {
    // Use relative time formatting
    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return formatRelativeTime(-diffMinutes, 'minute');
    } else if (diffHours < 24) {
      return formatRelativeTime(-diffHours, 'hour');
    } else {
      return formatRelativeTime(-diffDays, 'day');
    }
  } else {
    // Use absolute time formatting
    return formatAbsoluteTime(date);
  }
}

/**
 * Format a relative time using Intl.RelativeTimeFormat
 */
function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
  return rtf.format(value, unit);
}

/**
 * Format an absolute time using Intl.DateTimeFormat
 * - Same day: "3:45 PM"
 * - Same year: "Mar 15, 3:45 PM"
 * - Different year: "Mar 15, 2024, 3:45 PM"
 */
function formatAbsoluteTime(date: Date): string {
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const isSameYear = date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    // Just time: "3:45 PM"
    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } else if (isSameYear) {
    // Month, day, time: "Mar 15, 3:45 PM"
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } else {
    // Month, day, year, time: "Mar 15, 2024, 3:45 PM"
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}
