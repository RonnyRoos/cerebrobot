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
import { Box, Stack, Text, Textarea, Button } from '@workspace/ui';

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
    <Box>
      {/* Duplicate warning banner (T082) - shown until dismissed */}
      {showDuplicateWarning && content.length > 0 && (
        <Box className="p-3 bg-yellow-100 border border-yellow-200 rounded-md mb-4">
          <Stack direction="horizontal" gap="2" align="start" className="justify-between">
            <Text variant="body" size="sm" className="text-yellow-800">
              <strong>💡 Tip:</strong> Duplicate memories are automatically detected and blocked.
              Similar content (≥95%) will be rejected.
            </Text>
            <Button
              onClick={() => setShowDuplicateWarning(false)}
              variant="ghost"
              size="sm"
              className="text-yellow-800 hover:bg-yellow-200 px-2 py-1 text-xs font-semibold"
              aria-label="Dismiss warning"
            >
              ✕
            </Button>
          </Stack>
        </Box>
      )}

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter memory content..."
        disabled={isSaving}
        className="min-h-[8rem] mb-2 resize-y"
      />

      {/* Character Count */}
      <Text
        variant="caption"
        size="sm"
        className={`mb-4 text-right block ${charCount > MAX_LENGTH ? 'text-destructive' : 'text-muted'}`}
      >
        {charCount} / {MAX_LENGTH}
        {charCount > MAX_LENGTH && ' (exceeds maximum)'}
        {charCount < MIN_LENGTH && ' (minimum 1 character)'}
      </Text>

      {/* Error Message */}
      {error && (
        <Box className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
          <Text variant="body" size="sm" className="text-destructive">
            {error}
          </Text>
        </Box>
      )}

      {/* Buttons */}
      <Stack direction="horizontal" gap="3" className="justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid || isSaving} variant="primary">
          {isSaving ? 'Creating...' : 'Create'}
        </Button>
      </Stack>
    </Box>
  );
}
