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
import { Box, Stack, Text, Input, Button } from '@workspace/ui';

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
    <Box as="form" onSubmit={handleSubmit} className="p-3 border-b border-gray-200 bg-gray-50">
      <Stack direction="horizontal" gap="2" align="center">
        {/* Search Input */}
        <Input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search memories..."
          disabled={isLoading}
          className="flex-1"
          aria-label="Search memories"
        />

        {/* Search Button */}
        {!isSearchActive ? (
          <Button type="submit" disabled={!query.trim() || isLoading} variant="default" size="sm">
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleClear}
            variant="outline"
            size="sm"
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            Clear
          </Button>
        )}
      </Stack>

      {/* Search hint */}
      {!isSearchActive && (
        <Text variant="caption" className="text-muted mt-2 text-[0.6875rem]">
          Search using natural language (e.g., &ldquo;preferences&rdquo;, &ldquo;chocolate&rdquo;)
        </Text>
      )}
    </Box>
  );
}
