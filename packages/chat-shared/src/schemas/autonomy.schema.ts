/**
 * Autonomy Evaluation Response Schema
 *
 * Structured output from the autonomy evaluator node that decides
 * whether to schedule a follow-up message and when.
 */

import { z } from 'zod';

/**
 * Follow-up type categorization for analytics and tuning
 */
export const FollowUpTypeSchema = z.enum([
  'question_unanswered', // User asked a question but didn't respond to answer
  'task_incomplete', // Task/workflow started but not completed
  'waiting_for_decision', // User needs to make a decision
  'check_in', // General engagement check-in for long discussions
  'agent_decision', // Agent proactively continues conversation (chatty agents)
]);

export type FollowUpType = z.infer<typeof FollowUpTypeSchema>;

/**
 * Autonomy evaluator structured response
 */
export const AutonomyEvaluationResponseSchema = z.object({
  shouldSchedule: z.boolean().describe('Whether a follow-up should be scheduled'),

  delaySeconds: z
    .number()
    .min(30, 'Minimum delay is 30 seconds')
    .max(3600, 'Maximum delay is 1 hour')
    .optional()
    .describe('Seconds to wait before sending follow-up'),

  reason: z
    .string()
    .max(200, 'Reason must be 200 characters or less')
    .describe('Brief explanation of the decision for logging/analytics'),

  followUpType: FollowUpTypeSchema.optional().describe('Categorization of why follow-up is needed'),

  suggestedMessage: z
    .string()
    .max(500, 'Suggested message must be 500 characters or less')
    .optional()
    .describe('Optional message content for the follow-up'),
});

export type AutonomyEvaluationResponse = z.infer<typeof AutonomyEvaluationResponseSchema>;

/**
 * Context provided to autonomy evaluator
 */
export const AutonomyEvaluationContextSchema = z.object({
  recentMessages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string(),
      }),
    )
    .describe('Last N messages from conversation'),

  recentMemories: z
    .array(
      z.object({
        content: z.string(),
        timestamp: z.string(),
      }),
    )
    .optional()
    .describe('Recent relevant memories for context'),

  timeSinceLastUserMessageMs: z.number().describe('Milliseconds since user last sent a message'),

  consecutiveAutonomousMessages: z
    .number()
    .describe('Count of autonomous messages sent without user response'),

  sessionMessageCount: z.number().describe('Total messages in this conversation'),

  agentLimits: z
    .object({
      maxFollowUpsPerSession: z.number(),
      minDelayMs: z.number(),
      maxDelayMs: z.number(),
    })
    .describe('Agent-specific autonomy limits'),
});

export type AutonomyEvaluationContext = z.infer<typeof AutonomyEvaluationContextSchema>;
