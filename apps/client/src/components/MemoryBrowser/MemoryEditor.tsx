/**
 * MemoryEditor Component
 *
 * Inline editor for memory content with validation and character count.
 * Used for both editing existing memories and creating new ones.
 *
 * Implementation: User Story 3 (T048)
 */

import { useState, useEffect } from 'react';
import { Box, Stack, Text, Textarea, Button } from '@workspace/ui';
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
    <Box className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isSaving}
        placeholder="Enter memory content..."
        className={`min-h-[100px] resize-y ${isOverLimit ? 'border-destructive' : ''}`}
        aria-label="Memory content"
        aria-invalid={!isValid}
        aria-describedby="character-count validation-error api-error"
      />

      {/* Character count */}
      <Text
        id="character-count"
        variant="caption"
        size="sm"
        className={`mt-2 text-right block ${isOverLimit ? 'text-destructive' : 'text-muted'}`}
      >
        {characterCount} / {MAX_LENGTH} characters
      </Text>

      {/* Validation error */}
      {validationError && (
        <Box
          id="validation-error"
          role="alert"
          className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md"
        >
          <Text variant="body" size="sm" className="text-red-900">
            {validationError}
          </Text>
        </Box>
      )}

      {/* API error */}
      {error && (
        <Box
          id="api-error"
          role="alert"
          className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md"
        >
          <Text variant="body" size="sm" className="text-red-900">
            {error}
          </Text>
        </Box>
      )}

      {/* Action buttons */}
      <Stack direction="horizontal" gap="2" className="mt-4 justify-end">
        <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          variant="default"
          className={!isValid || isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </Stack>
    </Box>
  );
}
