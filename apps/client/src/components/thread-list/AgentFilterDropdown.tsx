import { Filter, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Box,
  Stack,
} from '@workspace/ui';

export interface AgentFilterDropdownProps {
  /**
   * List of available agents for filtering
   */
  agents: Array<{ id: string; name: string }>;

  /**
   * Currently selected agent ID (null if showing all)
   */
  selectedAgentId: string | null;

  /**
   * Callback when agent filter changes
   */
  onFilterChange: (agentId: string, agentName: string) => void;

  /**
   * Callback when filter is cleared
   */
  onClearFilter: () => void;

  /**
   * Optional label text
   * @default "Filter by Agent"
   */
  label?: string;
}

/**
 * AgentFilterDropdown - Neon Flux styled dropdown for filtering threads by agent
 *
 * Features:
 * - Glassmorphic Select component from @workspace/ui
 * - Filter icon with purple gradient on hover
 * - Clear button (X icon) when filter active
 * - Dropdown shows all available agents
 * - Smooth transitions and hover effects
 *
 * Usage:
 * ```tsx
 * <AgentFilterDropdown
 *   agents={[{ id: '1', name: 'Agent 1' }]}
 *   selectedAgentId={filteredAgentId}
 *   onFilterChange={(id, name) => setFilter(id, name)}
 *   onClearFilter={() => clearFilter()}
 * />
 * ```
 */
export function AgentFilterDropdown({
  agents,
  selectedAgentId,
  onFilterChange,
  onClearFilter,
  label = 'Filter by Agent',
}: AgentFilterDropdownProps): JSX.Element {
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <Stack direction="horizontal" gap="2" align="center">
      <Box className="flex items-center gap-2">
        <Filter size={16} className="text-accent-primary" />
        <Select
          value={selectedAgentId ?? 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              onClearFilter();
            } else {
              const agent = agents.find((a) => a.id === value);
              if (agent) {
                onFilterChange(agent.id, agent.name);
              }
            }
          }}
        >
          <SelectTrigger
            className="w-[200px] glassmorphic border-border-default hover:border-accent-primary/50 transition-all duration-200"
            aria-label={label}
          >
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent className="glassmorphic border-border-default">
            <SelectItem value="all" className="hover:bg-surface/30">
              All Agents
            </SelectItem>
            {agents.map((agent) => (
              <SelectItem
                key={agent.id}
                value={agent.id}
                className="hover:bg-surface/30 transition-colors"
              >
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Box>

      {/* Clear filter button (only shown when filter active) */}
      {selectedAgent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilter}
          className="hover:shadow-glow-purple transition-all duration-200"
          aria-label="Clear agent filter"
        >
          <X size={16} />
        </Button>
      )}
    </Stack>
  );
}
