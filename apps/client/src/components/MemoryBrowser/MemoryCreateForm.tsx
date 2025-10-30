/**
 * MemoryCreateForm Component
 *
 * Form for creating a new memory manually.
 * Features:
 * - Textarea with character count (1-8192)
 * - Create/Cancel buttons
 * - Validation and error handling
 */

import { useState } from 'react';

interface MemoryCreateFormProps {
  /** Callback when save is clicked */
  onSave: (content: string) => Promise<void>;

  /** Callback when cancel is clicked */
  onCancel: () => void;
}

const MIN_LENGTH = 1;
const MAX_LENGTH = 8192;

export function MemoryCreateForm({ onSave, onCancel }: MemoryCreateFormProps): JSX.Element {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(true);

  const isValid = content.length >= MIN_LENGTH && content.length <= MAX_LENGTH;
  const charCount = content.length;

  const handleSave = async (): Promise<void> => {
    if (!isValid || isSaving) return;

    try {
      setError(null);
      setIsSaving(true);
      await onSave(content);
      // Parent component will close modal on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create memory');
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Duplicate warning banner (T082) - shown until dismissed */}
      {showDuplicateWarning && content.length > 0 && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '0.375rem',
            color: '#92400e',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <strong>💡 Tip:</strong> Duplicate memories are automatically detected and blocked.
            Similar content (≥95%) will be rejected.
          </div>
          <button
            onClick={() => setShowDuplicateWarning(false)}
            style={{
              marginLeft: '0.5rem',
              padding: '0.125rem 0.25rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#92400e',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
            }}
            aria-label="Dismiss warning"
          >
            ✕
          </button>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter memory content..."
        disabled={isSaving}
        style={{
          width: '100%',
          minHeight: '8rem',
          padding: '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: '0.5rem',
        }}
      />

      {/* Character Count */}
      <div
        style={{
          fontSize: '0.75rem',
          color: charCount > MAX_LENGTH ? '#dc2626' : '#6b7280',
          marginBottom: '1rem',
          textAlign: 'right',
        }}
      >
        {charCount} / {MAX_LENGTH}
        {charCount > MAX_LENGTH && ' (exceeds maximum)'}
        {charCount < MIN_LENGTH && ' (minimum 1 character)'}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#dc2626',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={onCancel}
          disabled={isSaving}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
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
            backgroundColor: isValid && !isSaving ? '#10b981' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isValid && !isSaving ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          {isSaving ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}
