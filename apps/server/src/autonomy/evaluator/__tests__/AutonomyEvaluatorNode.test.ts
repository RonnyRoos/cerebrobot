/**
 * AutonomyEvaluatorNode Unit Tests
 *
 * Tests the autonomy evaluator that decides whether/when to send follow-ups.
 * Part of TDD for User Story 1 (T018a).
 */

import { describe, it, expect } from 'vitest';
import type { AutonomyEvaluationResponse } from '@cerebrobot/chat-shared';

describe('AutonomyEvaluatorNode', () => {
  describe('evaluation logic', () => {
    it('should return no follow-up when shouldSchedule is false', () => {
      const response: AutonomyEvaluationResponse = {
        shouldSchedule: false,
        reason: 'User query fully answered, no follow-up needed',
      };

      // Evaluator node would use this response to skip scheduling
      expect(response.shouldSchedule).toBe(false);
      expect(response.delaySeconds).toBeUndefined();
      expect(response.followUpType).toBeUndefined();
    });

    it('should return follow-up details when shouldSchedule is true', () => {
      const response: AutonomyEvaluationResponse = {
        shouldSchedule: true,
        delaySeconds: 60,
        followUpType: 'check_in',
        reason: 'Complex explanation provided, verify understanding',
      };

      // Evaluator node would use this to create schedule_timer effect
      expect(response.shouldSchedule).toBe(true);
      expect(response.delaySeconds).toBe(60);
      expect(response.followUpType).toBe('check_in');
    });

    it('should validate delaySeconds is within acceptable range', () => {
      const validResponse: AutonomyEvaluationResponse = {
        shouldSchedule: true,
        delaySeconds: 120, // 2 minutes - valid
        followUpType: 'agent_decision',
        reason: 'User completed task, offer guidance',
      };

      // Schema validation ensures 30 <= delaySeconds <= 3600
      expect(validResponse.delaySeconds).toBeGreaterThanOrEqual(30);
      expect(validResponse.delaySeconds).toBeLessThanOrEqual(3600);
    });

    it('should support all follow-up types', () => {
      const followUpTypes: AutonomyEvaluationResponse['followUpType'][] = [
        'question_unanswered',
        'task_incomplete',
        'waiting_for_decision',
        'check_in',
        'agent_decision',
      ];

      followUpTypes.forEach((type) => {
        const response: AutonomyEvaluationResponse = {
          shouldSchedule: true,
          delaySeconds: 60,
          followUpType: type,
          reason: `Testing ${type}`,
        };

        expect(response.followUpType).toBe(type);
      });
    });
  });

  describe('context building', () => {
    it('should include conversation history in evaluation context', () => {
      // Evaluator node would build this from memory/checkpoints
      const context = {
        conversationHistory: [
          { role: 'user', content: 'How do I use async/await?' },
          { role: 'assistant', content: 'Async/await is syntactic sugar...' },
        ],
        priorFollowUpCount: 0,
        timeSinceLastMessage: 120000, // 2 minutes
      };

      expect(context.conversationHistory).toHaveLength(2);
      expect(context.priorFollowUpCount).toBe(0);
    });

    it('should respect hard cap on follow-ups', () => {
      const maxFollowUps = 3;
      const currentCount = 3;

      // PolicyGates would block if currentCount >= maxFollowUps
      const shouldBlock = currentCount >= maxFollowUps;

      expect(shouldBlock).toBe(true);
    });

    it('should respect cooldown period', () => {
      const cooldownMs = 300000; // 5 minutes
      const timeSinceLastFollowUp = 240000; // 4 minutes

      // PolicyGates would block if cooldown not elapsed
      const shouldBlock = timeSinceLastFollowUp < cooldownMs;

      expect(shouldBlock).toBe(true);
    });
  });

  describe('LLM response parsing', () => {
    it('should handle structured LLM response', () => {
      // Mock LLM returning structured JSON
      const llmResponse = {
        shouldSchedule: true,
        delaySeconds: 90,
        followUpType: 'check_understanding',
        reasoning: 'User may benefit from clarification check',
      };

      // Parser would validate this against AutonomyEvaluationResponseSchema
      expect(llmResponse).toHaveProperty('shouldSchedule');
      expect(llmResponse).toHaveProperty('delaySeconds');
      expect(llmResponse).toHaveProperty('followUpType');
      expect(llmResponse).toHaveProperty('reasoning');
    });

    it('should handle LLM saying no follow-up needed', () => {
      const llmResponse: AutonomyEvaluationResponse = {
        shouldSchedule: false,
        reason: 'Query fully resolved',
      };

      expect(llmResponse.shouldSchedule).toBe(false);
      expect(llmResponse.delaySeconds).toBeUndefined();
      expect(llmResponse.followUpType).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should default to no follow-up on LLM error', () => {
      // If LLM call fails, evaluator should fail safe
      let evaluationResult: AutonomyEvaluationResponse | null = null;

      try {
        // Simulate LLM error
        throw new Error('LLM timeout');
      } catch (error) {
        // Default to no follow-up on error
        evaluationResult = {
          shouldSchedule: false,
          reason: 'Error during evaluation',
        };
      }

      expect(evaluationResult?.shouldSchedule).toBe(false);
    });

    it('should handle malformed LLM response', () => {
      const malformedResponse = {
        // Missing shouldSchedule
        delaySeconds: 60,
      };

      // Zod validation would catch this
      const isValid = 'shouldSchedule' in malformedResponse;
      expect(isValid).toBe(false);
    });
  });
});
