/**
 * MemoryEditor Component
 *
 * Inline editor for memory content with validation and character count.
 * Used for both editing existing memories and creating new ones.
 *
 * Implementation: User Story 3 (T048)
 */

import { useState, useEffect } from 'react';
import type { MemoryEntry } from '@cerebrobot/chat-shared';

interface MemoryEditorProps {
  /** Memory being edited (null for create mode) */
  memory: MemoryEntry | null;

  /** Callback when user saves changes */
  onSave: (content: string) => void;

  /** Callback when user cancels editing */
  onCancel: () => void;

  /** Whether save operation is in progress */
  isSaving?: boolean;

  /** Error message to display */
  error?: string | null;
}

const MIN_LENGTH = 1;
const MAX_LENGTH = 10000;

/**
 * Validate memory content length
 */
function validateContent(content: string): string | null {
  if (content.length < MIN_LENGTH) {
    return 'Content cannot be empty';
  }
  if (content.length > MAX_LENGTH) {
    return `Content must be ${MAX_LENGTH} characters or less`;
  }
  return null;
}

export function MemoryEditor({
  memory,
  onSave,
  onCancel,
  isSaving = false,
  error = null,
}: MemoryEditorProps): JSX.Element {
  const [content, setContent] = useState(memory?.content ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset content when memory prop changes
  useEffect(() => {
    setContent(memory?.content ?? '');
    setValidationError(null);
  }, [memory]);

  const handleSave = () => {
    const error = validateContent(content);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    onSave(content);
  };

  const handleCancel = () => {
    setContent(memory?.content ?? '');
    setValidationError(null);
    onCancel();
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > MAX_LENGTH;
  const isValid = characterCount >= MIN_LENGTH && characterCount <= MAX_LENGTH;

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
      }}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isSaving}
        placeholder="Enter memory content..."
        style={{
          width: '100%',
          minHeight: '100px',
          padding: '0.5rem',
          border: `1px solid ${isOverLimit ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
        aria-label="Memory content"
        aria-invalid={!isValid}
        aria-describedby="character-count validation-error api-error"
      />

      {/* Character count */}
      <div
        id="character-count"
        style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: isOverLimit ? '#ef4444' : '#6b7280',
          textAlign: 'right',
        }}
      >
        {characterCount} / {MAX_LENGTH} characters
      </div>

      {/* Validation error */}
      {validationError && (
        <div
          id="validation-error"
          role="alert"
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {validationError}
        </div>
      )}

      {/* API error */}
      {error && (
        <div
          id="api-error"
          role="alert"
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          marginTop: '1rem',
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={handleCancel}
          disabled={isSaving}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isValid && !isSaving ? '#3b82f6' : '#9ca3af',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: isValid && !isSaving ? 'pointer' : 'not-allowed',
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
