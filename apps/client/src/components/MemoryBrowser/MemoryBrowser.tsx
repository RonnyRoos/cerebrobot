/**
 * MemoryBrowser Component
 *
 * Sidebar component that displays agent memories in real-time.
 * Features:
 * - Toggle open/closed with localStorage persistence
 * - Real-time updates via memory.created WebSocket events
 * - Semantic search with similarity scores (US2: T039)
 * - Displays chronological list of memories
 */

import { useState } from 'react';
import { Box, Text, Button } from '@workspace/ui';
import type { MemoryEntry, MemorySearchResult, MemoryStatsResponse } from '@cerebrobot/chat-shared';
import { MemoryList } from './MemoryList.js';
import { MemorySearch } from './MemorySearch.js';
import { MemoryCreateForm } from './MemoryCreateForm.js';

interface MemoryBrowserProps {
  /** Array of memory entries to display */
  memories: MemoryEntry[];

  /** Search results (when search is active) */
  searchResults?: MemorySearchResult[] | null;

  /** Memory capacity stats (US5: T078) */
  stats?: MemoryStatsResponse | null;

  /** Loading state */
  isLoading?: boolean;

  /** Search loading state */
  isSearching?: boolean;

  /** Error message if fetch failed */
  error?: string | null;

  /** Signal to auto-open sidebar (e.g., when new memory created) */
  autoOpen?: boolean;

  /** Memory ID to highlight temporarily (US4: T068) */
  highlightMemoryId?: string | null;

  /** Callback to search memories */
  onSearch?: (query: string) => void;

  /** Callback to clear search */
  onClearSearch?: () => void;

  /** Callback to update a memory (US3: T054) */
  onUpdateMemory?: (memoryId: string, content: string) => Promise<void>;

  /** Callback to delete a memory (US3: T054) */
  onDeleteMemory?: (memoryId: string) => Promise<void>;

  /** Callback to create a memory (US4: T062) */
  onCreateMemory?: (content: string) => Promise<void>;
}

export function MemoryBrowser({
  memories,
  searchResults = null,
  stats = null,
  isLoading,
  isSearching = false,
  error,
  // autoOpen removed - not used after Panel refactor
  highlightMemoryId = null,
  onSearch,
  onClearSearch,
  onUpdateMemory,
  onDeleteMemory,
  onCreateMemory,
}: MemoryBrowserProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Determine if search is active and what to display
  const isSearchActive = searchResults !== null;
  const displayMemories: (MemoryEntry | MemorySearchResult)[] = isSearchActive
    ? searchResults
    : memories;
  const displayLoading = isSearchActive ? isSearching : isLoading;

  const handleSearch = (query: string): void => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleClearSearch = (): void => {
    setSearchQuery('');
    onClearSearch?.();
  };

  return (
    <>
      <Box className="flex flex-col h-full">
        {/* Header */}
        <Box
          as="header"
          className="p-4 border-b border-border-default bg-bg-elevated/50 backdrop-blur-sm"
        >
          <Text as="h2" variant="heading" size="lg" className="mb-1">
            Memory
          </Text>
          <Text variant="caption" size="sm" className="text-text-secondary">
            {stats
              ? `${stats.count} ${stats.count === 1 ? 'memory' : 'memories'} stored`
              : 'Real-time memory as the agent learns'}
          </Text>
        </Box>

        {/* Capacity Warning Banner (US5: T079) */}
        {stats && stats.showWarning && (
          <Box
            role="alert"
            className="p-3 bg-warning/10 border-b border-warning/30 flex items-center gap-2"
          >
            <span className="text-xl">⚠️</span>
            <Box className="flex-1">
              <Text variant="body" size="sm" className="text-warning font-semibold mb-0.5">
                Memory capacity at {Math.round(stats.capacityPercent * 100)}%
              </Text>
              <Text variant="caption" size="sm" className="text-warning/90">
                {stats.count} of {stats.maxMemories} memories used. Consider deleting old memories.
              </Text>
            </Box>
          </Box>
        )}

        {/* Memory List Container */}
        <Box className="flex-1 overflow-y-auto p-4">
          {/* Search Component (US2: T039) */}
          <MemorySearch
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isSearchActive={isSearchActive}
            isLoading={isSearching}
          />

          {/* Memory List (displays either all memories or search results) */}
          <MemoryList
            memories={displayMemories}
            isLoading={displayLoading}
            error={error}
            isSearchResults={isSearchActive}
            searchQuery={searchQuery}
            highlightMemoryId={highlightMemoryId}
            onUpdateMemory={onUpdateMemory}
            onDeleteMemory={onDeleteMemory}
          />
        </Box>

        {/* Create Button (Footer) */}
        {onCreateMemory && (
          <Box className="p-4 border-t border-border-default bg-bg-elevated/50 backdrop-blur-sm">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full shadow-sm"
              variant="primary"
              size="md"
              title="Create a new memory"
            >
              + Create Memory
            </Button>
          </Box>
        )}
      </Box>

      {/* Create Memory Modal (US4: T063) */}
      {showCreateModal && (
        <Box
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-memory-title"
          className="fixed inset-0 bg-bg-overlay/80 backdrop-blur-sm flex items-center justify-center z-[2000]"
        >
          <Box
            role="document"
            className="bg-bg-surface/95 backdrop-blur-md rounded-lg p-6 max-w-lg w-[90%] shadow-modal border border-border-default"
          >
            <Text id="create-memory-title" as="h3" variant="heading" size="lg" className="mb-4">
              Create New Memory
            </Text>
            <MemoryCreateForm
              onSave={async (content: string) => {
                await onCreateMemory?.(content);
                setShowCreateModal(false);
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          </Box>
        </Box>
      )}
    </>
  );
}
