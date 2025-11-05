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

import { useState, useEffect } from 'react';
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

const STORAGE_KEY = 'cerebrobot:memory-browser:open';

/**
 * Load initial sidebar state from localStorage
 */
function loadInitialState(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false; // Default to closed
  }
}

/**
 * Save sidebar state to localStorage
 */
function saveState(isOpen: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, isOpen ? 'true' : 'false');
  } catch {
    // Ignore localStorage errors (e.g., private browsing mode)
  }
}

export function MemoryBrowser({
  memories,
  searchResults = null,
  stats = null,
  isLoading,
  isSearching = false,
  error,
  autoOpen = false,
  highlightMemoryId = null,
  onSearch,
  onClearSearch,
  onUpdateMemory,
  onDeleteMemory,
  onCreateMemory,
}: MemoryBrowserProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(loadInitialState);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Determine if search is active and what to display
  const isSearchActive = searchResults !== null;
  const displayMemories: (MemoryEntry | MemorySearchResult)[] = isSearchActive
    ? searchResults
    : memories;
  const displayLoading = isSearchActive ? isSearching : isLoading;

  // Save state changes to localStorage
  useEffect(() => {
    saveState(isOpen);
  }, [isOpen]);

  // Auto-open sidebar when autoOpen prop changes to true
  useEffect(() => {
    if (autoOpen && !isOpen) {
      setIsOpen(true);
    }
  }, [autoOpen, isOpen]);

  const toggleSidebar = (): void => {
    setIsOpen((prev) => !prev);
  };

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
      {/* Toggle Button (Always Visible) */}
      <Button
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Close memory sidebar' : 'Open memory sidebar'}
        aria-expanded={isOpen}
        className="fixed top-4 right-4 z-[1001] shadow-md"
        variant="default"
        size="sm"
      >
        {isOpen ? '✕ Close' : '🧠 Memory'}
      </Button>

      {/* Sidebar Panel */}
      {isOpen && (
        <Box
          as="aside"
          aria-label="Memory browser"
          className="fixed top-0 right-0 w-96 h-screen bg-background border-l border-gray-200 shadow-xl z-[1000] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <Box as="header" className="p-4 border-b border-gray-200 bg-gray-50">
            <Text as="h2" variant="heading" size="lg" className="mb-1">
              🧠 Agent Memory
            </Text>
            <Text variant="caption" size="sm" className="text-muted">
              {stats
                ? `${stats.count} ${stats.count === 1 ? 'memory' : 'memories'} stored`
                : 'Real-time memory as the agent learns'}
            </Text>
          </Box>

          {/* Capacity Warning Banner (US5: T079) */}
          {stats && stats.showWarning && (
            <Box
              role="alert"
              className="p-3 bg-yellow-100 border-b border-yellow-400 flex items-center gap-2"
            >
              <span className="text-xl">⚠️</span>
              <Box className="flex-1">
                <Text variant="body" size="sm" className="text-yellow-900 font-semibold mb-0.5">
                  Memory capacity at {Math.round(stats.capacityPercent * 100)}%
                </Text>
                <Text variant="caption" size="sm" className="text-yellow-800">
                  {stats.count} of {stats.maxMemories} memories used. Consider deleting old
                  memories.
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
            <Box className="p-4 border-t border-gray-200 bg-background">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-green-600 hover:bg-green-700 shadow-sm"
                variant="default"
                size="md"
                title="Create a new memory"
              >
                + Create Memory
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Create Memory Modal (US4: T063) */}
      {showCreateModal && (
        <Box
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-memory-title"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
        >
          <Box role="document" className="bg-background rounded-lg p-6 max-w-lg w-[90%] shadow-2xl">
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
