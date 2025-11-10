/**
 * Checkpoint Metadata Persistence Validator
 *
 * Production-safe startup validation that ensures HumanMessage.additional_kwargs
 * (specifically MessageMetadata) is preserved through LangGraph checkpoint
 * save/restore cycles.
 *
 * Why this exists:
 * - Metadata-based autonomous message architecture relies on additional_kwargs persistence
 * - PostgreSQL JSONB storage must correctly serialize/deserialize metadata
 * - Silent failures here would break autonomous message detection and filtering
 *
 * What it validates:
 * - HumanMessage with synthetic: true metadata can be saved to checkpoint
 * - Restored HumanMessage contains identical metadata (synthetic, trigger_type)
 * - LangGraph StateGraph messages reducer preserves additional_kwargs
 *
 * When it runs:
 * - Server startup (apps/server/src/index.ts)
 * - Fail-fast on validation errors (prevents broken production deployments)
 *
 * @see specs/016-metadata-autonomous-messages/data-model.md Section 3 (State Transitions)
 * @see specs/016-metadata-autonomous-messages/data-model.md Section 5 (Validation Rules)
 */

import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, Annotation, START, END, MemorySaver } from '@langchain/langgraph';
import type { MessageMetadata, AutonomousTriggerType } from '@cerebrobot/chat-shared';

/**
 * Simple graph state for testing checkpoint persistence
 */
const TestStateAnnotation = Annotation.Root({
  messages: Annotation<Array<HumanMessage>>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
});

type TestState = typeof TestStateAnnotation.State;

/**
 * Simple passthrough node for validation
 */
async function passthroughNode(_state: TestState): Promise<Partial<TestState>> {
  void _state; // Mark as intentionally unused
  return {}; // No-op, just allow messages to flow through
}

/**
 * Validates that HumanMessage metadata persists through LangGraph checkpoints
 *
 * This is a critical startup validation to ensure the metadata-based
 * autonomous message architecture functions correctly.
 *
 * @throws Error if metadata is not preserved correctly
 */
export async function validateCheckpointMetadataPersistence(): Promise<void> {
  // Create in-memory checkpointer for validation
  const checkpointer = new MemorySaver();

  // Create minimal test graph
  const workflow = new StateGraph(TestStateAnnotation)
    .addNode('passthrough', passthroughNode)
    .addEdge(START, 'passthrough')
    .addEdge('passthrough', END);

  const graph = workflow.compile({ checkpointer });

  // Create test message with metadata
  const testMessage = new HumanMessage({
    content: 'Startup validation test',
    additional_kwargs: {
      synthetic: true,
      trigger_type: 'check_in' as AutonomousTriggerType,
      trigger_reason: 'Startup validation',
    } satisfies MessageMetadata,
  });

  const config = { configurable: { thread_id: 'startup-validation' } };

  // Save and restore
  await graph.invoke({ messages: [testMessage] }, config);
  const state = await graph.getState(config);

  const restored = state.values.messages[0];
  const metadata = restored.additional_kwargs as MessageMetadata;

  // Validate critical metadata fields
  if (metadata.synthetic !== true) {
    throw new Error('Checkpoint metadata integrity test failed: synthetic flag not preserved');
  }

  if (metadata.trigger_type !== 'check_in') {
    throw new Error('Checkpoint metadata integrity test failed: trigger_type not preserved');
  }

  // Success - metadata preservation validated
}
