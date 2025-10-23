/**
 * PolicyGates - Enforces hard cap and cooldown rules for autonomous messaging
 *
 * Prevents message storms by enforcing:
 * - Maximum consecutive autonomous messages without user input
 * - Minimum cooldown period between autonomous sends
 */

export interface AutonomyMetadata {
  consecutiveAutonomousMessages: number;
  lastAutonomousAt: Date | null;
}

export interface PolicyGatesConfig {
  maxConsecutive: number;
  cooldownMs: number;
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  blockedBy?: 'hard_cap' | 'cooldown';
}

export class PolicyGates {
  constructor(private readonly config: PolicyGatesConfig) {}

  /**
   * Check if autonomous send is allowed
   */
  checkCanSendAutonomous(metadata: AutonomyMetadata): PolicyCheckResult {
    // Check hard cap
    if (metadata.consecutiveAutonomousMessages >= this.config.maxConsecutive) {
      return {
        allowed: false,
        reason: `Hard cap reached: ${metadata.consecutiveAutonomousMessages}/${this.config.maxConsecutive}`,
        blockedBy: 'hard_cap',
      };
    }

    // Check cooldown
    if (metadata.lastAutonomousAt) {
      const elapsed = Date.now() - metadata.lastAutonomousAt.getTime();
      if (elapsed < this.config.cooldownMs) {
        const remaining = Math.ceil((this.config.cooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          reason: `Cooldown active: ${remaining}s remaining`,
          blockedBy: 'cooldown',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Update counters after autonomous send
   */
  updateCountersAfterSend(metadata: AutonomyMetadata): AutonomyMetadata {
    return {
      consecutiveAutonomousMessages: metadata.consecutiveAutonomousMessages + 1,
      lastAutonomousAt: new Date(),
    };
  }

  /**
   * Reset counters on user message
   */
  resetOnUserMessage(): AutonomyMetadata {
    return {
      consecutiveAutonomousMessages: 0,
      lastAutonomousAt: null,
    };
  }
}
