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
      <button
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Close memory sidebar' : 'Open memory sidebar'}
        aria-expanded={isOpen}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          zIndex: 1001,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        {isOpen ? '✕ Close' : '🧠 Memory'}
      </button>

      {/* Sidebar Panel */}
      {isOpen && (
        <aside
          aria-label="Memory browser"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '24rem',
            height: '100vh',
            backgroundColor: 'white',
            borderLeft: '1px solid #e5e7eb',
            boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <header
            style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
              }}
            >
              🧠 Agent Memory
            </h2>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.75rem',
                color: '#6b7280',
              }}
            >
              {stats
                ? `${stats.count} ${stats.count === 1 ? 'memory' : 'memories'} stored`
                : 'Real-time memory as the agent learns'}
            </p>
          </header>

          {/* Capacity Warning Banner (US5: T079) */}
          {stats && stats.showWarning && (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef3c7',
                borderBottom: '1px solid #fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#92400e',
                  }}
                >
                  Memory capacity at {Math.round(stats.capacityPercent * 100)}%
                </p>
                <p
                  style={{
                    margin: '0.125rem 0 0 0',
                    fontSize: '0.75rem',
                    color: '#78350f',
                  }}
                >
                  {stats.count} of {stats.maxMemories} memories used. Consider deleting old
                  memories.
                </p>
              </div>
            </div>
          )}

          {/* Memory List Container */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
            }}
          >
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
          </div>

          {/* Create Button (Footer) */}
          {onCreateMemory && (
            <div 
              style={{ 
                padding: '1rem', 
                borderTop: '1px solid #e5e7eb',
                backgroundColor: 'white',
              }}
            >
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                }}
                title="Create a new memory"
              >
                + Create Memory
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Create Memory Modal (US4: T063) */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-memory-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            role="document"
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              maxWidth: '32rem',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              id="create-memory-title"
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
              }}
            >
              Create New Memory
            </h3>
            <MemoryCreateForm
              onSave={async (content: string) => {
                await onCreateMemory?.(content);
                setShowCreateModal(false);
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
