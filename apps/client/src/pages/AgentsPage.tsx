/**
 * AgentsPage Component
 * Main page for viewing and managing agents with create/edit/delete forms
 */

import { useState } from 'react';
import type { AgentConfig } from '@cerebrobot/chat-shared';
import { Box, Button, Text } from '@workspace/ui';
import { useAgents } from '../hooks/useAgents.js';
import { useAgent } from '../hooks/useAgent.js';
import { useCreateAgent } from '../hooks/useCreateAgent.js';
import { useUpdateAgent } from '../hooks/useUpdateAgent.js';
import { useDeleteAgent } from '../hooks/useDeleteAgent.js';
import { AgentList } from '../components/AgentList.js';
import { AgentForm } from '../components/AgentForm.js';
import { AgentWizardModal } from '../components/agent-wizard/AgentWizardModal.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';

interface AgentsPageProps {
  onViewThreads?: (agentId: string, agentName: string) => void;
  onNewThread?: (agentId: string) => void;
}

export function AgentsPage({ onViewThreads, onNewThread }: AgentsPageProps) {
  const { agents, loading, error, refetch } = useAgents();
  const { createAgent, error: createError } = useCreateAgent();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch agent data when editing
  const {
    agent: editingAgent,
    loading: loadingAgent,
    error: loadAgentError,
  } = useAgent(editingAgentId);
  const { updateAgent, error: updateError } = useUpdateAgent();
  const { deleteAgent, error: deleteError, isLoading: isDeleting } = useDeleteAgent();

  const handleNewAgent = () => {
    setShowCreateWizard(true);
    setEditingAgentId(null); // Clear edit state
    setSuccessMessage(null);
  };

  const handleEditAgent = (agentId: string) => {
    setEditingAgentId(agentId);
    setShowCreateWizard(false); // Clear create state
    setSuccessMessage(null);
  };

  const handleDeleteAgent = (agentId: string) => {
    setDeletingAgentId(agentId);
    setSuccessMessage(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAgentId) return;

    const success = await deleteAgent(deletingAgentId);
    setDeletingAgentId(null);

    if (success) {
      setSuccessMessage('Agent deleted successfully');
      await refetch();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleCancelDelete = () => {
    setDeletingAgentId(null);
  };

  const handleCancelCreate = () => {
    setShowCreateWizard(false);
  };

  const handleCancelEdit = () => {
    setEditingAgentId(null);
  };

  const handleSubmitCreate = async (config: AgentConfig) => {
    await createAgent(config);

    // If successful (no error), close wizard and refresh list
    if (!createError) {
      setShowCreateWizard(false);
      setSuccessMessage('Agent created successfully');
      await refetch();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleSubmitEdit = async (config: AgentConfig) => {
    if (!editingAgentId) return;

    await updateAgent(editingAgentId, config);

    // If successful (no error), close form and refresh list
    if (!updateError) {
      setEditingAgentId(null);
      setSuccessMessage('Agent updated successfully');
      await refetch();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Get agent name for deletion confirmation
  const deletingAgent = agents.find((a) => a.id === deletingAgentId);

  // Show edit form
  if (editingAgentId) {
    // Loading agent data
    if (loadingAgent) {
      return (
        <Box>
          <Box className="p-4 border-b border-border flex items-center gap-4">
            <Button variant="ghost" onClick={handleCancelEdit}>
              ← Back to Agents
            </Button>
            <Text as="h1" variant="heading" size="2xl">
              Edit Agent
            </Text>
          </Box>
          <Box className="p-8 flex items-center justify-center">
            <Text variant="body" size="lg" className="text-text-tertiary">
              Loading agent data...
            </Text>
          </Box>
        </Box>
      );
    }

    // Error loading agent
    if (loadAgentError) {
      return (
        <Box>
          <Box className="p-4 border-b border-border flex items-center gap-4">
            <Button variant="ghost" onClick={handleCancelEdit}>
              ← Back to Agents
            </Button>
            <Text as="h1" variant="heading" size="2xl">
              Edit Agent
            </Text>
          </Box>
          <Box className="p-4 bg-error/10 border-l-4 border-error" role="alert">
            <Text variant="body" className="text-error">
              Error loading agent: {loadAgentError}
            </Text>
          </Box>
        </Box>
      );
    }

    // Agent not found
    if (!editingAgent) {
      return (
        <Box>
          <Box className="p-4 border-b border-border flex items-center gap-4">
            <Button variant="ghost" onClick={handleCancelEdit}>
              ← Back to Agents
            </Button>
            <Text as="h1" variant="heading" size="2xl">
              Edit Agent
            </Text>
          </Box>
          <Box className="p-4 bg-error/10 border-l-4 border-error" role="alert">
            <Text variant="body" className="text-error">
              Agent not found
            </Text>
          </Box>
        </Box>
      );
    }

    // Show edit form with loaded agent data
    return (
      <Box className="h-full flex flex-col overflow-hidden">
        <Box className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <Button variant="ghost" onClick={handleCancelEdit}>
            ← Back to Agents
          </Button>
          <Text as="h1" variant="heading" size="xl" className="md:text-2xl">
            Edit Agent
          </Text>
        </Box>
        {updateError && (
          <Box className="p-4 bg-error/10 border-l-4 border-error flex-shrink-0" role="alert">
            <Text variant="body" className="text-error">
              {updateError}
            </Text>
          </Box>
        )}
        <Box className="flex-1 overflow-y-auto">
          <AgentForm
            mode="edit"
            initialData={editingAgent}
            onSubmit={handleSubmitEdit}
            onCancel={handleCancelEdit}
          />
        </Box>
      </Box>
    );
  }

  // Show agent list
  if (loading) {
    return (
      <Box className="flex h-full items-center justify-center">
        <Text variant="body" size="lg" className="text-text-tertiary">
          Loading agents...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="flex h-full flex-col">
        <Box className="p-4 bg-error/10 border-l-4 border-error" role="alert">
          <Text variant="body" className="text-error">
            Error loading agents: {error}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="flex h-full flex-col overflow-hidden">
      {/* Toast messages */}
      {successMessage && (
        <Box className="p-3 bg-success/10 border-b border-success/20" role="status">
          <Text className="text-sm text-success">{successMessage}</Text>
        </Box>
      )}
      {deleteError && (
        <Box className="p-3 bg-error/10 border-b border-error/20" role="alert">
          <Text className="text-sm text-error">{deleteError}</Text>
        </Box>
      )}
      {createError && (
        <Box className="p-3 bg-error/10 border-b border-error/20" role="alert">
          <Text className="text-sm text-error">{createError}</Text>
        </Box>
      )}

      {/* Agent list - takes full height */}
      <Box className="flex-1 overflow-hidden">
        <AgentList
          agents={agents}
          onNewAgent={handleNewAgent}
          onEditAgent={handleEditAgent}
          onDeleteAgent={handleDeleteAgent}
          onViewThreads={onViewThreads}
          onNewThread={onNewThread}
        />
      </Box>

      {/* Agent Creation Wizard */}
      <AgentWizardModal
        isOpen={showCreateWizard}
        onClose={handleCancelCreate}
        onSubmit={handleSubmitCreate}
      />

      {/* Agent Deletion Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingAgentId && !isDeleting}
        title="Delete Agent"
        message={`Are you sure you want to delete "${deletingAgent?.name}"? This will also delete all associated threads and conversation history. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  );
}
