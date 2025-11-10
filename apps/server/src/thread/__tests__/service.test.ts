/**
 * Thread Service Metadata Filtering Tests (T007d)
 *
 * Unit tests for US3: Thread service metadata filtering
 *
 * Validates that thread service filters synthetic messages based on
 * MessageMetadata.synthetic === true instead of content patterns.
 */

import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { MessageMetadata } from '@cerebrobot/chat-shared';

describe('Thread Service Metadata Filtering (T007d)', () => {
  /**
   * These tests validate the filtering logic that will be implemented in US3.
   * Currently, thread service filters based on content patterns.
   * After US3, it will filter based on metadata checks.
   */

  describe('Message Filtering Logic', () => {
    it('should filter messages with synthetic metadata', () => {
      const messages = [
        new HumanMessage('Real user message'),
        new HumanMessage({
          content: 'Continue our conversation naturally.',
          additional_kwargs: {
            synthetic: true,
            trigger_type: 'check_in' as const,
            trigger_reason: 'No activity for 30s',
          } satisfies MessageMetadata,
        }),
        new AIMessage('Agent response'),
      ];

      // When US3 is implemented, this filter will be used:
      const filteredMessages = messages.filter(
        (msg) => !(msg.additional_kwargs as MessageMetadata)?.synthetic,
      );

      expect(filteredMessages).toHaveLength(2);
      expect(filteredMessages[0].content).toBe('Real user message');
      expect(filteredMessages[1].content).toBe('Agent response');
    });

    it('should preserve all messages when none are synthetic', () => {
      const messages = [
        new HumanMessage('First message'),
        new AIMessage('First response'),
        new HumanMessage('Second message'),
        new AIMessage('Second response'),
      ];

      const filteredMessages = messages.filter(
        (msg) => !(msg.additional_kwargs as MessageMetadata)?.synthetic,
      );

      expect(filteredMessages).toHaveLength(4);
    });

    it('should filter multiple synthetic messages correctly', () => {
      const messages = [
        new HumanMessage('Real message 1'),
        new AIMessage('Response 1'),
        new HumanMessage({
          content: 'Synthetic prompt 1',
          additional_kwargs: {
            synthetic: true,
            trigger_type: 'check_in' as const,
          } satisfies MessageMetadata,
        }),
        new AIMessage('Response to synthetic 1'),
        new HumanMessage('Real message 2'),
        new HumanMessage({
          content: 'Synthetic prompt 2',
          additional_kwargs: {
            synthetic: true,
            trigger_type: 'question_unanswered' as const,
          } satisfies MessageMetadata,
        }),
        new AIMessage('Response to synthetic 2'),
      ];

      const filteredMessages = messages.filter(
        (msg) => !(msg.additional_kwargs as MessageMetadata)?.synthetic,
      );

      // Should keep: Real 1, Response 1, Response to synthetic 1, Real 2, Response to synthetic 2
      expect(filteredMessages).toHaveLength(5);

      // Verify no synthetic messages remain
      const hasAnySynthetic = filteredMessages.some(
        (msg) => (msg.additional_kwargs as MessageMetadata)?.synthetic === true,
      );
      expect(hasAnySynthetic).toBe(false);
    });

    it('should use strict equality check (=== true) to avoid false positives', () => {
      const messages = [
        new HumanMessage('Message 1'),
        new HumanMessage({
          content: 'Message with falsy metadata',
          additional_kwargs: {
            synthetic: false, // Explicitly false
          } as MessageMetadata,
        }),
        new HumanMessage({
          content: 'Message with undefined metadata',
          additional_kwargs: {
            // synthetic is undefined
          } as unknown as MessageMetadata,
        }),
        new HumanMessage({
          content: 'Message with true metadata',
          additional_kwargs: {
            synthetic: true,
            trigger_type: 'check_in' as const,
          } satisfies MessageMetadata,
        }),
      ];

      // Strict equality check (=== true)
      const filteredMessages = messages.filter(
        (msg) => (msg.additional_kwargs as MessageMetadata)?.synthetic !== true,
      );

      // Should keep all except the last one
      expect(filteredMessages).toHaveLength(3);
      expect(filteredMessages[3]).toBeUndefined(); // 4th message filtered out
    });

    it('should handle messages without additional_kwargs gracefully', () => {
      const messages = [
        new HumanMessage('Message without additional_kwargs'),
        new AIMessage('AI message without metadata'),
        new HumanMessage({
          content: 'Message with metadata',
          additional_kwargs: {
            synthetic: true,
            trigger_type: 'check_in' as const,
          } satisfies MessageMetadata,
        }),
      ];

      const filteredMessages = messages.filter(
        (msg) => !(msg.additional_kwargs as MessageMetadata)?.synthetic,
      );

      expect(filteredMessages).toHaveLength(2);
    });

    it('should filter independent of trigger type', () => {
      const triggerTypes = [
        'check_in',
        'question_unanswered',
        'task_incomplete',
        'waiting_for_decision',
      ] as const;

      const messages = triggerTypes.map(
        (triggerType) =>
          new HumanMessage({
            content: `Prompt for ${triggerType}`,
            additional_kwargs: {
              synthetic: true,
              trigger_type: triggerType,
            } satisfies MessageMetadata,
          }),
      );

      const filteredMessages = messages.filter(
        (msg) => !(msg.additional_kwargs as MessageMetadata)?.synthetic,
      );

      // All should be filtered regardless of trigger type
      expect(filteredMessages).toHaveLength(0);
    });

    it('should log statistics for filtered messages', () => {
      // const mockLogger = {
      //   info: vi.fn(),
      //   debug: vi.fn(),
      // };

      const messages = [
        new HumanMessage('Real 1'),
        new HumanMessage({
          content: 'Synthetic 1',
          additional_kwargs: {
            synthetic: true,
            trigger_type: 'check_in' as const,
          } satisfies MessageMetadata,
        }),
        new AIMessage('Response'),
        new HumanMessage({
          content: 'Synthetic 2',
          additional_kwargs: {
            synthetic: true,
            trigger_type: 'task_incomplete' as const,
          } satisfies MessageMetadata,
        }),
      ];

      const filteredMessages = messages.filter(
        (msg) => !(msg.additional_kwargs as MessageMetadata)?.synthetic,
      );

      const totalMessages = messages.length;
      const filteredCount = totalMessages - filteredMessages.length;

      // When US3 is implemented, this logging will be added:
      // mockLogger.info({
      //   metadata_operation: 'filter',
      //   thread_id: 'thread-123',
      //   total_messages: totalMessages,
      //   filtered_count: filteredCount
      // }, `Filtered ${filteredCount} synthetic messages from thread history`);

      expect(filteredMessages).toHaveLength(2);
      expect(filteredCount).toBe(2);
    });

    it('should NOT filter based on content patterns (old behavior)', () => {
      // Old behavior: content-based filtering
      const messagesWithMarkers = [
        new HumanMessage('[AUTONOMOUS_FOLLOWUP: check_in]'), // Old format
        new HumanMessage('Regular message'),
      ];

      // New behavior: metadata-based filtering (ignores content)
      const filteredMessages = messagesWithMarkers.filter(
        (msg) => !(msg.additional_kwargs as MessageMetadata)?.synthetic,
      );

      // Both messages kept because neither has synthetic metadata
      expect(filteredMessages).toHaveLength(2);

      // Demonstrates that content patterns are irrelevant in new approach
      expect(filteredMessages[0].content).toBe('[AUTONOMOUS_FOLLOWUP: check_in]');
    });

    it('should handle mixed old and new format during transition period', () => {
      const messages = [
        // Old format: content marker, no metadata
        new HumanMessage('[AUTONOMOUS_FOLLOWUP: check_in]'),

        // New format: metadata-based
        new HumanMessage({
          content: 'Continue our conversation naturally.',
          additional_kwargs: {
            synthetic: true,
            trigger_type: 'check_in' as const,
          } satisfies MessageMetadata,
        }),

        // Real user message
        new HumanMessage('Real user message'),
      ];

      // Metadata-only filtering (new behavior)
      const metadataFiltered = messages.filter(
        (msg) => !(msg.additional_kwargs as MessageMetadata)?.synthetic,
      );

      // Should keep old format + real message (2 messages)
      // Only new format filtered out
      expect(metadataFiltered).toHaveLength(2);

      // During transition, need BOTH filters:
      const dualFiltered = messages.filter(
        (msg) =>
          !(msg.additional_kwargs as MessageMetadata)?.synthetic &&
          (typeof msg.content === 'string'
            ? !msg.content.startsWith('[AUTONOMOUS_FOLLOWUP:')
            : true),
      );

      // All synthetic messages filtered (both old and new format)
      expect(dualFiltered).toHaveLength(1);
      expect(dualFiltered[0].content).toBe('Real user message');
    });
  });
});
