/**
 * Autonomy Evaluator Node
 *
 * LangGraph node that evaluates whether to schedule an autonomous follow-up message.
 * Uses LLM to analyze conversation context and decide on follow-up timing/type.
 */

import { ChatOpenAI } from '@langchain/openai';
import type { RunnableConfig } from '@langchain/core/runnables';
import { AutonomyEvaluationResponseSchema } from '@cerebrobot/chat-shared';
import type { ConversationState } from '../../agent/graph/types.js';
import type { BaseMessage } from '@langchain/core/messages';
import type { Logger } from 'pino';

export interface AutonomyEvaluatorConfig {
  model: string;
  temperature?: number;
  systemPrompt?: string;
  apiKey: string;
  apiBase: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are an autonomy evaluator for a conversational AI assistant. Your job is to decide whether the assistant should send a proactive follow-up message after the current conversation.

Analyze the conversation context and determine:
1. Whether a follow-up would be helpful (shouldSchedule: true/false)
2. How long to wait before sending it (delaySeconds: 30-3600 seconds)
3. What type of follow-up makes sense (followUpType: question_unanswered, task_incomplete, waiting_for_decision, check_in, or agent_decision)
4. Your reason for the decision

Guidelines:
- Schedule follow-ups when the user might benefit from a check-in
- Don't schedule if the conversation feels complete or if user explicitly said goodbye
- Shorter delays (30-120s) for clarification checks, longer delays (300-3600s) for next steps
- Be conservative - when in doubt, don't schedule

Respond ONLY with valid JSON matching this schema:
{
  "shouldSchedule": boolean,
  "delaySeconds": number (30-3600, required if shouldSchedule is true),
  "followUpType": "question_unanswered" | "task_incomplete" | "waiting_for_decision" | "check_in" | "agent_decision" (required if shouldSchedule is true),
  "reason": string
}`;

export class AutonomyEvaluatorNode {
  private readonly llm: ChatOpenAI;
  private readonly config: AutonomyEvaluatorConfig;
  private readonly logger?: Logger;

  constructor(config: AutonomyEvaluatorConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;

    this.llm = new ChatOpenAI({
      modelName: config.model,
      temperature: config.temperature ?? 0.7,
      apiKey: config.apiKey,
      configuration: {
        baseURL: config.apiBase,
      },
    });
  }

  /**
   * Evaluate whether to schedule an autonomous follow-up
   * Returns schedule_timer effect if follow-up should be scheduled, null otherwise
   */
  async evaluate(
    state: ConversationState,
    config?: RunnableConfig,
  ): Promise<{ effects?: Array<{ type: string; payload: unknown }> }> {
    try {
      const systemPrompt = this.config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

      // Build conversation context
      const conversationHistory = (state.messages as BaseMessage[])
        .map((msg: BaseMessage) => `${msg._getType()}: ${msg.content}`)
        .join('\n');

      // Build evaluation prompt
      const evaluationPrompt = `Conversation history:
${conversationHistory}

Should we schedule an autonomous follow-up message? Provide your decision as JSON.`;

      // Call LLM with structured output (nostream tag prevents it from being added to messages)
      const response = await this.llm.invoke(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: evaluationPrompt },
        ],
        { ...config, tags: ['nostream'] },
      );

      // Parse LLM response
      const responseText =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      this.logger?.debug(
        {
          responseText,
        },
        'Autonomy evaluator raw response',
      );

      // Extract JSON from response (LLM might wrap it in markdown)
      let jsonText = responseText.trim();
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else if (responseText.includes('```')) {
        // Try to extract JSON from code blocks without language specifier
        const codeMatch = responseText.match(/```\n([\s\S]*?)\n```/);
        if (codeMatch) {
          jsonText = codeMatch[1];
        }
      }

      // Parse and validate with error handling
      let evaluation;
      try {
        const parsed = JSON.parse(jsonText);
        evaluation = AutonomyEvaluationResponseSchema.parse(parsed);
      } catch (parseError) {
        this.logger?.warn(
          {
            err: parseError,
            responseText: responseText.substring(0, 200), // First 200 chars for debugging
          },
          'Failed to parse autonomy evaluation response - assuming no follow-up',
        );
        return {}; // Fail safe: don't schedule on parse error
      }

      this.logger?.info(
        {
          shouldSchedule: evaluation.shouldSchedule,
          delaySeconds: evaluation.delaySeconds,
          followUpType: evaluation.followUpType,
          reason: evaluation.reason,
        },
        'Autonomy evaluation complete',
      );

      // Return schedule_timer effect if follow-up should be scheduled
      if (evaluation.shouldSchedule && evaluation.delaySeconds && evaluation.followUpType) {
        return {
          effects: [
            {
              type: 'schedule_timer',
              payload: {
                timer_id: `followup_${Date.now()}`,
                delay_seconds: evaluation.delaySeconds,
                payload: {
                  followUpType: evaluation.followUpType,
                  reason: evaluation.reason,
                },
              },
            },
          ],
        };
      }

      // No follow-up needed
      return {};
    } catch (error) {
      this.logger?.error(
        {
          err: error,
        },
        'Autonomy evaluator error - failing safe (no follow-up)',
      );

      // Fail safe: don't schedule follow-up on error
      return {};
    }
  }
}
