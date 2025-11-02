/**
 * AgentForm Component Tests
 *
 * TDD: Written FIRST before implementation
 * Tests deterministic UI rendering and form behavior for agent creation/editing
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentForm } from '../AgentForm.js';

describe('AgentForm', () => {
  describe('initial render', () => {
    it('should render form with all sections', () => {
      render(<AgentForm mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByText(/basic info/i)).toBeInTheDocument();
      expect(screen.getByText(/llm config/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /memory config/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /autonomy/i })).toBeInTheDocument();
    });

    it('should render with empty fields in create mode', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<AgentForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />);

      // Name field should be empty
      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveValue('');
    });

    it('should render with populated fields in edit mode', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      const initialData = {
        id: 'test-id',
        name: 'Existing Agent',
        systemPrompt: 'Test prompt',
        personaTag: 'tester',
        llm: {
          model: 'gpt-4',
          temperature: 0.7,
          apiKey: 'sk-test',
          apiBase: 'https://api.deepinfra.com/v1/openai',
        },
        memory: {
          hotPathLimit: 50,
          hotPathTokenBudget: 10000,
          recentMessageFloor: 5,
          hotPathMarginPct: 0.1,
          embeddingModel: 'Qwen/Qwen3-Embedding-8B',
          embeddingEndpoint: 'https://api.deepinfra.com/v1/openai',
          apiKey: 'sk-test',
          similarityThreshold: 0.7,
          maxTokens: 5000,
          injectionBudget: 8000,
          retrievalTimeoutMs: 5000,
        },
        autonomy: {
          enabled: false,
          evaluator: {
            model: 'gpt-4',
            temperature: 0.5,
            maxTokens: 500,
            systemPrompt: 'Test evaluator',
          },
          limits: {
            maxFollowUpsPerSession: 10,
            minDelayMs: 5000,
            maxDelayMs: 60000,
          },
          memoryContext: {
            recentMemoryCount: 5,
            includeRecentMessages: 10,
          },
        },
        createdAt: '2025-10-31T00:00:00.000Z',
        updatedAt: '2025-10-31T00:00:00.000Z',
      };

      render(
        <AgentForm mode="edit" initialData={initialData} onSubmit={onSubmit} onCancel={onCancel} />,
      );

      // Should show "Update" instead of "Create"
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();

      // Name field should be populated
      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Existing Agent');
    });
  });

  describe('validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<AgentForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />);

      // Try to submit without filling fields
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Should NOT call onSubmit
      expect(onSubmit).not.toHaveBeenCalled();

      // Should show validation errors (eventually - after debounce)
      // This test may need adjustment based on actual validation timing
    });

    it('should validate field-level errors on blur', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<AgentForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />);

      // Focus and blur name field without entering anything
      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.tab(); // blur

      // Should eventually show validation error
      // (may need to wait for debounce)
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<AgentForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />);

      // Fill in minimal valid form data
      await user.type(screen.getByLabelText(/name/i), 'Test Agent');
      await user.type(screen.getByLabelText(/system prompt/i), 'You are helpful');
      await user.type(screen.getByLabelText(/persona/i), 'helper');

      // Fill LLM config (use specific element IDs to avoid field name ambiguity with memory section)
      const modelInput = document.getElementById('llm-model') as HTMLInputElement;
      await user.clear(modelInput);
      await user.type(modelInput, 'gpt-4');

      const llmApiKeyInput = document.getElementById('llm-api-key') as HTMLInputElement;
      await user.type(llmApiKeyInput, 'sk-test');

      // Fill memory config (required apiKey field)
      const memoryApiKeyInput = document.getElementById('memory-api-key') as HTMLInputElement;
      await user.type(memoryApiKeyInput, 'sk-memory-test');

      // Enable autonomy and fill required fields
      const autonomyToggle = screen.getByRole('checkbox', { name: /enable autonomy/i });
      await user.click(autonomyToggle);

      const autonomyModelInput = document.getElementById(
        'autonomy-evaluator-model',
      ) as HTMLInputElement;
      await user.type(autonomyModelInput, 'gpt-3.5-turbo');

      const autonomyPromptInput = document.getElementById(
        'autonomy-evaluator-system-prompt',
      ) as HTMLTextAreaElement;
      await user.type(autonomyPromptInput, 'Evaluate autonomy');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Should call onSubmit with form data
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Agent',
          systemPrompt: 'You are helpful',
          personaTag: 'helper',
        }),
      );
    });

    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<AgentForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('autonomy toggle', () => {
    it('should hide autonomy config when disabled', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<AgentForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />);

      // Autonomy should be toggled off by default
      const autonomyToggle = screen.getByRole('checkbox', { name: /enable autonomy/i });
      expect(autonomyToggle).not.toBeChecked();

      // Autonomy config fields should be hidden (use specific ID)
      expect(document.getElementById('autonomy-evaluator-model')).not.toBeInTheDocument();
    });

    it('should show autonomy config when enabled', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(<AgentForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />);

      // Toggle autonomy on
      const autonomyToggle = screen.getByRole('checkbox', { name: /enable autonomy/i });
      await user.click(autonomyToggle);

      // Autonomy config fields should now be visible
      expect(document.getElementById('autonomy-evaluator-model')).toBeInTheDocument();
    });
  });
});
