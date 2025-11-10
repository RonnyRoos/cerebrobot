/**
 * Checkpoint Metadata Persistence Validation Tests
 *
 * Validates that HumanMessage.additional_kwargs (specifically MessageMetadata)
 * is preserved through LangGraph checkpoint save/restore cycles.
 *
 * This test must pass on server startup to ensure metadata-based autonomous
 * message tagging works correctly.
 *
 * @see specs/016-metadata-autonomous-messages/data-model.md Section 3 (State Transitions)
 * @see specs/016-metadata-autonomous-messages/data-model.md Section 5 (Validation Rules)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, Annotation, START, END, MemorySaver } from '@langchain/langgraph';
import type { MessageMetadata, AutonomousTriggerType } from '@cerebrobot/chat-shared';
import { validateCheckpointMetadataPersistence } from '../checkpoint-metadata-validator.js';

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
 * Simple passthrough node for testing
 */
async function passthroughNode(_state: TestState): Promise<Partial<TestState>> {
  void _state; // Mark as intentionally unused
  return {}; // No-op, just allow messages to flow through
}

describe('Checkpoint Metadata Persistence Validation', () => {
  let checkpointer: MemorySaver;
  let graph: ReturnType<typeof createTestGraph>;

  function createTestGraph() {
    const workflow = new StateGraph(TestStateAnnotation)
      .addNode('passthrough', passthroughNode)
      .addEdge(START, 'passthrough')
      .addEdge('passthrough', END);

    return workflow.compile({ checkpointer });
  }

  beforeAll(() => {
    checkpointer = new MemorySaver();
    graph = createTestGraph();
  });

  afterAll(async () => {
    // Clean up test data if needed
  });

  it('should preserve synthetic metadata through checkpoint save/restore', async () => {
    // Create test message with metadata
    const testMessage = new HumanMessage({
      content: 'Continue our conversation naturally.',
      additional_kwargs: {
        synthetic: true,
        trigger_type: 'check_in' as AutonomousTriggerType,
        trigger_reason: 'Test autonomous trigger',
      } satisfies MessageMetadata,
    });

    const threadId = 'test-metadata-preservation';
    const config = { configurable: { thread_id: threadId } };

    // Save message through graph invocation
    await graph.invoke({ messages: [testMessage] }, config);

    // Restore state from checkpoint
    const state = await graph.getState(config);
    const restoredMessages = state.values.messages;

    // Validate message was saved
    expect(restoredMessages).toHaveLength(1);

    const restoredMessage = restoredMessages[0];

    // Validate metadata structure
    expect(restoredMessage).toBeInstanceOf(HumanMessage);
    expect(restoredMessage.content).toBe('Continue our conversation naturally.');

    // Validate metadata preservation (CRITICAL TEST)
    const metadata = restoredMessage.additional_kwargs as MessageMetadata;
    expect(metadata.synthetic).toBe(true);
    expect(metadata.trigger_type).toBe('check_in');
    expect(metadata.trigger_reason).toBe('Test autonomous trigger');
  });

  it('should preserve metadata for all trigger types', async () => {
    const triggerTypes: AutonomousTriggerType[] = [
      'check_in',
      'question_unanswered',
      'task_incomplete',
      'waiting_for_decision',
    ];

    for (const triggerType of triggerTypes) {
      const testMessage = new HumanMessage({
        content: `Test prompt for ${triggerType}`,
        additional_kwargs: {
          synthetic: true,
          trigger_type: triggerType,
          trigger_reason: `Test trigger: ${triggerType}`,
        } satisfies MessageMetadata,
      });

      const threadId = `test-trigger-${triggerType}`;
      const config = { configurable: { thread_id: threadId } };

      // Save and restore
      await graph.invoke({ messages: [testMessage] }, config);
      const state = await graph.getState(config);

      const metadata = state.values.messages[0].additional_kwargs as MessageMetadata;

      expect(metadata.synthetic).toBe(true);
      expect(metadata.trigger_type).toBe(triggerType);
    }
  });

  it('should preserve non-synthetic messages without metadata', async () => {
    const realUserMessage = new HumanMessage({
      content: 'Hello, this is a real user message.',
    });

    const threadId = 'test-real-user-message';
    const config = { configurable: { thread_id: threadId } };

    await graph.invoke({ messages: [realUserMessage] }, config);
    const state = await graph.getState(config);

    const restoredMessage = state.values.messages[0];

    expect(restoredMessage.content).toBe('Hello, this is a real user message.');
    expect(restoredMessage.additional_kwargs?.synthetic).toBeUndefined();
    expect(restoredMessage.additional_kwargs?.trigger_type).toBeUndefined();
  });

  it('should preserve mixed synthetic and real messages in correct order', async () => {
    const messages = [
      new HumanMessage({ content: 'Real message 1' }),
      new HumanMessage({
        content: 'Synthetic prompt',
        additional_kwargs: {
          synthetic: true,
          trigger_type: 'check_in' as AutonomousTriggerType,
        } satisfies MessageMetadata,
      }),
      new HumanMessage({ content: 'Real message 2' }),
    ];

    const threadId = 'test-mixed-messages';
    const config = { configurable: { thread_id: threadId } };

    await graph.invoke({ messages }, config);
    const state = await graph.getState(config);

    const restored = state.values.messages;

    expect(restored).toHaveLength(3);
    expect(restored[0].content).toBe('Real message 1');
    expect((restored[0].additional_kwargs as MessageMetadata)?.synthetic).toBeUndefined();

    expect(restored[1].content).toBe('Synthetic prompt');
    expect((restored[1].additional_kwargs as MessageMetadata).synthetic).toBe(true);
    expect((restored[1].additional_kwargs as MessageMetadata).trigger_type).toBe('check_in');

    expect(restored[2].content).toBe('Real message 2');
    expect((restored[2].additional_kwargs as MessageMetadata)?.synthetic).toBeUndefined();
  });
});

/**
 * Integration test that calls the startup validator
 */
it('should pass startup validation check', async () => {
  await expect(validateCheckpointMetadataPersistence()).resolves.toBeUndefined();
});
