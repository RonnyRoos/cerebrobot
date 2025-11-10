/**
 * MemoryList Component
 *
 * Displays a chronological list of memory entries with timestamps.
 * Features:
 * - Empty state with onboarding hint
 * - Chronological sorting (newest first by default)
 * - Readable timestamp formatting
 * - Similarity scores for search results
 * - Inline editing and deletion (US3: T054)
 */

import { useState } from 'react';
import { Box, Stack, Text, Button } from '@workspace/ui';
import type { MemoryEntry, MemorySearchResult } from '@cerebrobot/chat-shared';
import { MemoryEditor } from './MemoryEditor.js';
import { ConfirmDialog } from './ConfirmDialog.js';

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

  /** Memory ID to highlight temporarily (US4: T068) */
  highlightMemoryId?: string | null;

  /** Callback to update a memory (US3: T054) */
  onUpdateMemory?: (memoryId: string, content: string) => Promise<void>;

  /** Callback to delete a memory (US3: T054) */
  onDeleteMemory?: (memoryId: string) => Promise<void>;
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
  highlightMemoryId = null,
  onUpdateMemory,
  onDeleteMemory,
}: MemoryListProps): JSX.Element {
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  // Handle edit save (US3: T054)
  const handleEditSave = async (content: string) => {
    if (!editingMemoryId || !onUpdateMemory) return;

    setIsSaving(true);
    setOperationError(null);

    try {
      await onUpdateMemory(editingMemoryId, content);
      setEditingMemoryId(null);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to update memory');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingMemoryId(null);
    setOperationError(null);
  };

  // Handle delete confirm (US3: T054)
  const handleDeleteConfirm = async () => {
    if (!deletingMemoryId || !onDeleteMemory) return;

    setIsDeleting(true);
    setOperationError(null);

    try {
      await onDeleteMemory(deletingMemoryId);
      setDeletingMemoryId(null);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Failed to delete memory');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeletingMemoryId(null);
    setOperationError(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <Box role="status" aria-live="polite" className="text-center py-8 px-4">
        <Text variant="body" size="sm" className="text-muted">
          Loading memories...
        </Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box role="alert" className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
        <Text variant="body" size="sm" className="text-red-900 font-semibold">
          Failed to load memories
        </Text>
        <Text variant="caption" size="sm" className="text-red-800 mt-2">
          {error}
        </Text>
      </Box>
    );
  }

  // Empty state
  if (memories.length === 0) {
    // Empty search results (T036)
    if (isSearchResults) {
      return (
        <Box className="text-center py-8 px-4">
          <Text className="text-3xl mb-2">🔍</Text>
          <Text variant="body" size="sm" className="text-muted font-medium mb-2">
            No matching memories found
          </Text>
          <Text variant="caption" size="sm" className="text-text-tertiary leading-relaxed">
            {searchQuery ? `No memories match "${searchQuery}".` : 'No memories match your search.'}{' '}
            Try different terms or browse all memories.
          </Text>
        </Box>
      );
    }

    // Empty memory list
    return (
      <Box className="text-center py-8 px-4">
        <Text className="text-3xl mb-2">🧠</Text>
        <Text variant="body" size="sm" className="text-muted font-medium mb-2">
          No memories yet
        </Text>
        <Text variant="caption" size="sm" className="text-gray-400 leading-relaxed">
          Memories will appear here as your agent learns about you during conversations.
        </Text>
      </Box>
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
      <Stack
        direction="horizontal"
        gap="0"
        align="center"
        className="justify-between mb-3 pb-3 border-b border-border"
      >
        <Text variant="caption" size="sm" className="text-muted font-medium">
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
        </Text>
        <Button
          onClick={() => setSortNewestFirst((prev) => !prev)}
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:bg-blue-50 px-2 py-1 text-xs font-medium"
          aria-label={`Sort by ${sortNewestFirst ? 'oldest' : 'newest'} first`}
        >
          {sortNewestFirst ? '↓ Newest first' : '↑ Oldest first'}
        </Button>
      </Stack>

      <Box as="ul" className="list-none m-0 p-0">
        {sortedMemories.map((memory) => {
          // Type guard to check if this is a search result with similarity
          const isSearchResult = 'similarity' in memory;
          const similarity = isSearchResult ? (memory as MemorySearchResult).similarity : undefined;
          const isEditing = editingMemoryId === memory.id;
          const isHighlighted = highlightMemoryId === memory.id;

          return (
            <Box
              key={memory.id}
              as="li"
              className={`p-3 mb-2 rounded-md border transition-all duration-300 ${
                isHighlighted
                  ? 'bg-accent-primary/20 border-accent-primary shadow-lg shadow-accent-primary/50'
                  : similarity !== undefined && similarity >= 0.9
                    ? 'bg-green-50 border-green-300 shadow-sm shadow-green-100'
                    : 'bg-surface border-border'
              }`}
            >
              {/* Similarity score badge (T035, enhanced in T075/T081) */}
              {similarity !== undefined && (
                <Box
                  className={`inline-block mb-2 px-2 py-0.5 text-xs font-semibold rounded ${
                    similarity >= 0.9
                      ? 'text-green-700 bg-green-200 border border-green-700'
                      : similarity >= 0.7
                        ? 'text-blue-700 bg-blue-100'
                        : 'text-muted bg-muted'
                  }`}
                  title={`Similarity: ${similarity.toFixed(3)} (${similarity >= 0.95 ? 'Exact match' : similarity >= 0.9 ? 'Very close match' : similarity >= 0.7 ? 'Related memory' : 'Weak match'})`}
                >
                  {similarity >= 0.9 ? '✨ ' : ''}
                  {Math.round(similarity * 100)}% match
                </Box>
              )}

              {/* Editing mode */}
              {isEditing ? (
                <MemoryEditor
                  memory={memory}
                  onSave={handleEditSave}
                  onCancel={handleEditCancel}
                  isSaving={isSaving}
                  error={operationError}
                />
              ) : (
                <>
                  {/* Memory content */}
                  <Text variant="body" size="sm" className="text-text-primary leading-relaxed mb-2">
                    {memory.content}
                  </Text>

                  {/* Footer with timestamp and action buttons */}
                  <Stack direction="horizontal" gap="2" align="center" className="justify-between">
                    {/* Timestamp */}
                    <Text
                      as="time"
                      dateTime={
                        typeof memory.createdAt === 'string'
                          ? memory.createdAt
                          : memory.createdAt.toISOString()
                      }
                      variant="caption"
                      size="sm"
                      className="text-muted"
                    >
                      {formatRelativeTime(memory.createdAt)}
                    </Text>

                    {/* Edit/Delete buttons (US3: T054) */}
                    {(onUpdateMemory || onDeleteMemory) && (
                      <Stack direction="horizontal" gap="2">
                        {onUpdateMemory && (
                          <Button
                            onClick={() => setEditingMemoryId(memory.id)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 px-2 py-1 text-xs"
                            aria-label="Edit memory"
                          >
                            ✏️ Edit
                          </Button>
                        )}
                        {onDeleteMemory && (
                          <Button
                            onClick={() => setDeletingMemoryId(memory.id)}
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive hover:bg-red-50 px-2 py-1 text-xs"
                            aria-label="Delete memory"
                          >
                            🗑️ Delete
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>

                  {/* Optional: Show key if it's meaningful (not a UUID) */}
                  {memory.key &&
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                      memory.key,
                    ) && (
                      <Text
                        variant="caption"
                        size="sm"
                        className="text-text-tertiary font-mono mt-2 block"
                      >
                        {memory.key}
                      </Text>
                    )}
                </>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Delete confirmation dialog (US3: T053) */}
      <ConfirmDialog
        isOpen={deletingMemoryId !== null}
        title="Delete Memory"
        message="Are you sure you want to delete this memory? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isProcessing={isDeleting}
      />
    </>
  );
}
