import { useState, useEffect } from 'react';
import { Box, Text, Stack, Button } from '@workspace/ui';
import { Settings, Save, AlertCircle } from 'lucide-react';

/**
 * Settings Page
 *
 * Global Agent Configuration (Spec 017 - User Story 4)
 * - Enable markdown responses for all agents
 * - Include tool references in system prompts
 */

interface GlobalConfig {
  enableMarkdownResponses: boolean;
  includeToolReferences: boolean;
}

export function SettingsPage() {
  const [config, setConfig] = useState<GlobalConfig>({
    enableMarkdownResponses: false,
    includeToolReferences: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to load configuration');
        }
        const data = await response.json();
        setConfig({
          enableMarkdownResponses: data.enableMarkdownResponses,
          includeToolReferences: data.includeToolReferences,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box className="p-8">
        <Stack gap="4" className="max-w-2xl mx-auto">
          <Text variant="body" className="text-text-secondary">
            Loading settings...
          </Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box className="p-8">
      <Stack gap="8" className="max-w-2xl mx-auto">
        {/* Header */}
        <Stack gap="4">
          <Stack direction="horizontal" gap="3" align="center">
            <Settings size={32} className="text-accent-primary" />
            <Text as="h1" variant="heading" size="2xl">
              Settings
            </Text>
          </Stack>
          <Text variant="body" className="text-text-secondary">
            Configure global settings that apply to all agents
          </Text>
        </Stack>

        {/* Error Display */}
        {error && (
          <Stack
            direction="horizontal"
            gap="3"
            align="center"
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <AlertCircle size={20} className="text-red-500" />
            <Text variant="body" className="text-red-500">
              {error}
            </Text>
          </Stack>
        )}

        {/* Success Display */}
        {successMessage && (
          <Stack
            direction="horizontal"
            gap="3"
            align="center"
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
          >
            <AlertCircle size={20} className="text-green-500" />
            <Text variant="body" className="text-green-500">
              {successMessage}
            </Text>
          </Stack>
        )}

        {/* Global Agent Configuration Section */}
        <Stack gap="6" className="p-6 bg-bg-elevated border border-border-default rounded-lg">
          <Text as="h2" variant="heading" size="lg">
            Global Agent Configuration
          </Text>

          <Stack gap="4">
            {/* Markdown Responses Toggle */}
            <div className="flex items-start gap-4">
              <input
                id="enableMarkdownResponses"
                type="checkbox"
                checked={config.enableMarkdownResponses}
                onChange={(e) =>
                  setConfig({ ...config, enableMarkdownResponses: e.target.checked })
                }
                className="mt-1 w-5 h-5 rounded border-2 border-border-default bg-bg-surface checked:bg-accent-primary checked:border-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 cursor-pointer"
              />
              <label
                htmlFor="enableMarkdownResponses"
                className="flex-1 flex flex-col gap-1 cursor-pointer"
              >
                <span className="text-base font-medium">Enable Markdown Responses</span>
                <span className="text-sm text-text-secondary">
                  Instructs all agents to respond using markdown formatting for better readability
                  (headers, lists, code blocks, bold, italic)
                </span>
              </label>
            </div>

            {/* Tool References Toggle */}
            <div className="flex items-start gap-4">
              <input
                id="includeToolReferences"
                type="checkbox"
                checked={config.includeToolReferences}
                onChange={(e) => setConfig({ ...config, includeToolReferences: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-2 border-border-default bg-bg-surface checked:bg-accent-primary checked:border-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 cursor-pointer"
              />
              <label
                htmlFor="includeToolReferences"
                className="flex-1 flex flex-col gap-1 cursor-pointer"
              >
                <span className="text-base font-medium">Include Tool References</span>
                <span className="text-sm text-text-secondary">
                  Automatically includes a list of available LangChain tools in all agent system
                  prompts (useful for tool-aware agents)
                </span>
              </label>
            </div>
          </Stack>

          {/* Save Button */}
          <Stack direction="horizontal" gap="3" justify="end">
            <Button onClick={handleSave} disabled={saving} className="min-w-32">
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Stack>
        </Stack>

        {/* Info Box */}
        <Stack gap="3" className="p-4 bg-bg-surface border border-border-default rounded-lg">
          <Text variant="body" size="sm" className="text-text-secondary">
            <strong>Note:</strong> Global settings are applied to all agents automatically. Changes
            take effect immediately for new conversations. Existing conversations will use the
            updated settings on the next message.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
