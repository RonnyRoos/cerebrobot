/**
 * AgentsPage Component
 * Main page for viewing and managing agents with create/edit/delete forms
 */

import { useState } from 'react';
import type { AgentConfig } from '@cerebrobot/chat-shared';
import { useAgents } from '../hooks/useAgents.js';
import { useAgent } from '../hooks/useAgent.js';
import { useCreateAgent } from '../hooks/useCreateAgent.js';
import { useUpdateAgent } from '../hooks/useUpdateAgent.js';
import { useDeleteAgent } from '../hooks/useDeleteAgent.js';
import { AgentList } from '../components/AgentList.js';
import { AgentForm } from '../components/AgentForm.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';

export function AgentsPage() {
  const { agents, loading, error, refetch } = useAgents();
  const { createAgent, error: createError } = useCreateAgent();
  const [showCreateForm, setShowCreateForm] = useState(false);
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
    setShowCreateForm(true);
    setEditingAgentId(null); // Clear edit state
    setSuccessMessage(null);
  };

  const handleEditAgent = (agentId: string) => {
    setEditingAgentId(agentId);
    setShowCreateForm(false); // Clear create state
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
    setShowCreateForm(false);
  };

  const handleCancelEdit = () => {
    setEditingAgentId(null);
  };

  const handleSubmitCreate = async (config: AgentConfig) => {
    await createAgent(config);

    // If successful (no error), close form and refresh list
    if (!createError) {
      setShowCreateForm(false);
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

  // Show create form
  if (showCreateForm) {
    return (
      <div className="agents-page">
        <div className="agents-page-header">
          <button onClick={handleCancelCreate} className="btn btn-secondary">
            ← Back to Agents
          </button>
          <h1>Create New Agent</h1>
        </div>
        {createError && (
          <div className="error-message" role="alert">
            {createError}
          </div>
        )}
        <AgentForm mode="create" onSubmit={handleSubmitCreate} onCancel={handleCancelCreate} />
      </div>
    );
  }

  // Show edit form
  if (editingAgentId) {
    // Loading agent data
    if (loadingAgent) {
      return (
        <div className="agents-page">
          <div className="agents-page-header">
            <button onClick={handleCancelEdit} className="btn btn-secondary">
              ← Back to Agents
            </button>
            <h1>Edit Agent</h1>
          </div>
          <div className="loading-state">Loading agent data...</div>
        </div>
      );
    }

    // Error loading agent
    if (loadAgentError) {
      return (
        <div className="agents-page">
          <div className="agents-page-header">
            <button onClick={handleCancelEdit} className="btn btn-secondary">
              ← Back to Agents
            </button>
            <h1>Edit Agent</h1>
          </div>
          <div className="error-message" role="alert">
            Error loading agent: {loadAgentError}
          </div>
        </div>
      );
    }

    // Agent not found
    if (!editingAgent) {
      return (
        <div className="agents-page">
          <div className="agents-page-header">
            <button onClick={handleCancelEdit} className="btn btn-secondary">
              ← Back to Agents
            </button>
            <h1>Edit Agent</h1>
          </div>
          <div className="error-message" role="alert">
            Agent not found
          </div>
        </div>
      );
    }

    // Show edit form with loaded agent data
    return (
      <div className="agents-page">
        <div className="agents-page-header">
          <button onClick={handleCancelEdit} className="btn btn-secondary">
            ← Back to Agents
          </button>
          <h1>Edit Agent</h1>
        </div>
        {updateError && (
          <div className="error-message" role="alert">
            {updateError}
          </div>
        )}
        <AgentForm
          mode="edit"
          initialData={editingAgent}
          onSubmit={handleSubmitEdit}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

  // Show agent list
  if (loading) {
    return (
      <div className="agents-page">
        <div className="loading-state">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agents-page">
        <div className="error-state">
          <p>Error loading agents: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agents-page">
      {successMessage && (
        <div className="success-message" role="status">
          {successMessage}
        </div>
      )}
      {deleteError && (
        <div className="error-message" role="alert">
          {deleteError}
        </div>
      )}
      <AgentList
        agents={agents}
        onNewAgent={handleNewAgent}
        onEditAgent={handleEditAgent}
        onDeleteAgent={handleDeleteAgent}
      />
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
    </div>
  );
}
