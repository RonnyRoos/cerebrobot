/**
 * MemoryList Component
 *
 * Displays a chronological list of memory entries with timestamps.
 * Features:
 * - Empty state with onboarding hint
 * - Chronological sorting (newest first by default)
 * - Readable timestamp formatting
 * - Similarity scores for search results
 */

import { useState } from 'react';
import type { MemoryEntry, MemorySearchResult } from '@cerebrobot/chat-shared';

interface MemoryListProps {
  /** Array of memory entries to display */
  memories: (MemoryEntry | MemorySearchResult)[];

  /** Loading state */
  isLoading?: boolean;

  /** Error message if fetch failed */
  error?: string | null;

  /** Whether displaying search results */
  isSearchResults?: boolean;

  /** Search query (for empty search state) */
  searchQuery?: string;
}

/**
 * Format timestamp as relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;

  // For older entries, show date
  return dateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function MemoryList({
  memories,
  isLoading,
  error,
  isSearchResults = false,
  searchQuery,
}: MemoryListProps): JSX.Element {
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  // Loading state
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          color: '#6b7280',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading memories...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        role="alert"
        style={{
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
        }}
      >
        <strong style={{ color: '#991b1b', fontSize: '0.875rem' }}>Failed to load memories</strong>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#7f1d1d' }}>{error}</p>
      </div>
    );
  }

  // Empty state
  if (memories.length === 0) {
    // Empty search results (T036)
    if (isSearchResults) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            color: '#9ca3af',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>
            No matching memories found
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', lineHeight: '1.5' }}>
            {searchQuery ? `No memories match "${searchQuery}".` : 'No memories match your search.'}{' '}
            Try different terms or browse all memories.
          </p>
        </div>
      );
    }

    // Empty memory list
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          color: '#9ca3af',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧠</div>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>
          No memories yet
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', lineHeight: '1.5' }}>
          Memories will appear here as your agent learns about you during conversations.
        </p>
      </div>
    );
  }

  // Sort memories based on toggle state
  const sortedMemories = [...memories].sort((a, b) => {
    const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;

    return sortNewestFirst
      ? dateB.getTime() - dateA.getTime() // Newest first
      : dateA.getTime() - dateB.getTime(); // Oldest first
  });

  // Memory list
  return (
    <>
      {/* Sort Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
        </span>
        <button
          onClick={() => setSortNewestFirst((prev) => !prev)}
          style={{
            fontSize: '0.75rem',
            color: '#3b82f6',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontWeight: '500',
          }}
          aria-label={`Sort by ${sortNewestFirst ? 'oldest' : 'newest'} first`}
        >
          {sortNewestFirst ? '↓ Newest first' : '↑ Oldest first'}
        </button>
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {sortedMemories.map((memory) => {
          // Type guard to check if this is a search result with similarity
          const isSearchResult = 'similarity' in memory;
          const similarity = isSearchResult ? (memory as MemorySearchResult).similarity : undefined;

          return (
            <li
              key={memory.id}
              style={{
                padding: '0.75rem',
                marginBottom: '0.5rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
              }}
            >
              {/* Similarity score badge (T035) */}
              {similarity !== undefined && (
                <div
                  style={{
                    display: 'inline-block',
                    marginBottom: '0.5rem',
                    padding: '0.125rem 0.5rem',
                    fontSize: '0.6875rem',
                    fontWeight: '600',
                    color:
                      similarity >= 0.9 ? '#059669' : similarity >= 0.7 ? '#3b82f6' : '#6b7280',
                    backgroundColor:
                      similarity >= 0.9 ? '#d1fae5' : similarity >= 0.7 ? '#dbeafe' : '#f3f4f6',
                    borderRadius: '0.25rem',
                  }}
                  title={`Similarity score: ${similarity.toFixed(3)}`}
                >
                  {Math.round(similarity * 100)}% match
                </div>
              )}

              {/* Memory content */}
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#111827',
                  lineHeight: '1.5',
                }}
              >
                {memory.content}
              </p>

              {/* Timestamp */}
              <time
                dateTime={
                  typeof memory.createdAt === 'string'
                    ? memory.createdAt
                    : memory.createdAt.toISOString()
                }
                style={{
                  display: 'block',
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                }}
              >
                {formatRelativeTime(memory.createdAt)}
              </time>

              {/* Optional: Show key if it's meaningful (not a UUID) */}
              {memory.key &&
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  memory.key,
                ) && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.6875rem',
                      color: '#9ca3af',
                      fontFamily: 'monospace',
                    }}
                  >
                    {memory.key}
                  </div>
                )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
