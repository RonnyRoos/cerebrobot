/**
 * MemoryBrowser Component
 *
 * Sidebar component that displays agent memories in real-time.
 * Features:
 * - Toggle open/closed with localStorage persistence
 * - Real-time updates via memory.created WebSocket events
 * - Displays chronological list of memories
 */

import { useState, useEffect } from 'react';
import type { MemoryEntry } from '@cerebrobot/chat-shared';
import { MemoryList } from './MemoryList.js';

interface MemoryBrowserProps {
  /** Array of memory entries to display */
  memories: MemoryEntry[];

  /** Loading state */
  isLoading?: boolean;

  /** Error message if fetch failed */
  error?: string | null;
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

export function MemoryBrowser({ memories, isLoading, error }: MemoryBrowserProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(loadInitialState);

  // Save state changes to localStorage
  useEffect(() => {
    saveState(isOpen);
  }, [isOpen]);

  const toggleSidebar = (): void => {
    setIsOpen((prev) => !prev);
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
              Real-time memory as the agent learns
            </p>
          </header>

          {/* Memory List Container */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
            }}
          >
            <MemoryList memories={memories} isLoading={isLoading} error={error} />
          </div>
        </aside>
      )}
    </>
  );
}
