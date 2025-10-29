/**
 * MemorySearch Component
 *
 * Search input for semantic memory search.
 * Features:
 * - Text input with submit on Enter or button click
 * - Clear button to reset search
 * - Loading state during search
 */

import { useState, type FormEvent, type ChangeEvent } from 'react';

interface MemorySearchProps {
  /** Callback when search is submitted */
  onSearch: (query: string) => void;

  /** Callback when search is cleared */
  onClear: () => void;

  /** Whether search is currently active */
  isSearchActive: boolean;

  /** Whether search is in progress */
  isLoading?: boolean;
}

export function MemorySearch({
  onSearch,
  onClear,
  isSearchActive,
  isLoading = false,
}: MemorySearchProps): JSX.Element {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      onSearch(trimmedQuery);
    }
  };

  const handleClear = (): void => {
    setQuery('');
    onClear();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '0.75rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* Search Input */}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search memories..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '0.5rem',
            fontSize: '0.875rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            outline: 'none',
            backgroundColor: isLoading ? '#f3f4f6' : 'white',
          }}
          aria-label="Search memories"
        />

        {/* Search Button */}
        {!isSearchActive ? (
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              backgroundColor: query.trim() && !isLoading ? '#3b82f6' : '#9ca3af',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: query.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#dc2626',
              backgroundColor: 'white',
              border: '1px solid #dc2626',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Search hint */}
      {!isSearchActive && (
        <p
          style={{
            margin: '0.5rem 0 0 0',
            fontSize: '0.6875rem',
            color: '#6b7280',
          }}
        >
          Search using natural language (e.g., &ldquo;preferences&rdquo;, &ldquo;chocolate&rdquo;)
        </p>
      )}
    </form>
  );
}
