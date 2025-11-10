/**
 * Metadata type definitions for autonomous message tagging
 *
 * @module metadata
 * @see specs/016-metadata-autonomous-messages/data-model.md
 */

/**
 * Valid autonomous trigger types for synthetic messages
 *
 * Each type corresponds to a specific autonomous conversation context:
 * - check_in: General conversation continuation after silence
 * - question_unanswered: Agent asked a question, user hasn't answered
 * - task_incomplete: Reminder about incomplete task
 * - waiting_for_decision: Prompt about pending decision
 */
export type AutonomousTriggerType =
  | 'check_in'
  | 'question_unanswered'
  | 'task_incomplete'
  | 'waiting_for_decision';

/**
 * Metadata attached to HumanMessage objects to mark autonomous/synthetic messages
 *
 * Stored in HumanMessage.additional_kwargs for LangChain compatibility.
 * Persisted through LangGraph checkpoints in PostgreSQL.
 *
 * @example
 * ```typescript
 * const message = new HumanMessage({
 *   content: 'Continue our conversation naturally.',
 *   additional_kwargs: {
 *     synthetic: true,
 *     trigger_type: 'check_in',
 *     trigger_reason: 'No activity for 30 seconds'
 *   }
 * });
 * ```
 */
export interface MessageMetadata {
  /**
   * Boolean flag indicating message is synthetic (autonomous trigger)
   * - `true`: Message created by system (timer-triggered autonomous response)
   * - `false` or `undefined`: Real user message
   */
  synthetic?: boolean;

  /**
   * Type of autonomous trigger that created this message
   * Only present when synthetic === true
   */
  trigger_type?: AutonomousTriggerType;

  /**
   * Optional reason/context for autonomous trigger
   * Provides additional context for debugging/logging
   */
  trigger_reason?: string;

  /**
   * Allow additional properties for LangChain compatibility
   */
  [key: string]: unknown;
}

/**
 * Mapping of trigger types to natural language prompts
 *
 * These prompts are sent to the LLM to elicit natural responses
 * without meta-commentary about system infrastructure.
 *
 * @constant
 */
export const TRIGGER_PROMPTS: Record<AutonomousTriggerType, string> = {
  check_in: 'Continue our conversation naturally.',
  question_unanswered: "You asked the user a question but they haven't answered. Follow up gently.",
  task_incomplete: 'Check in about the incomplete task we discussed.',
  waiting_for_decision: 'Follow up on the decision the user needs to make.',
} as const;
