/**
 * GlobalConfigurationService
 *
 * Manages system-wide agent settings (Spec 017 - User Story 4)
 * Implements singleton pattern: only one global config exists
 *
 * Features:
 * - Get/Update global configuration
 * - Auto-initialize on first access
 * - Thread-safe upsert operations
 */

import type { PrismaClient } from '@prisma/client';

export interface GlobalConfig {
  enableMarkdownResponses: boolean;
  includeToolReferences: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GlobalConfigUpdate {
  enableMarkdownResponses?: boolean;
  includeToolReferences?: boolean;
}

const SINGLETON_ID = 'singleton';

export class GlobalConfigurationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get global configuration (creates default if doesn't exist)
   */
  async getConfig(): Promise<GlobalConfig> {
    const config = await this.prisma.globalConfiguration.upsert({
      where: { id: SINGLETON_ID },
      update: {}, // No-op update to trigger updatedAt refresh
      create: {
        id: SINGLETON_ID,
        enableMarkdownResponses: false,
        includeToolReferences: false,
      },
    });

    return {
      enableMarkdownResponses: config.enableMarkdownResponses,
      includeToolReferences: config.includeToolReferences,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Update global configuration (partial updates supported)
   */
  async updateConfig(updates: GlobalConfigUpdate): Promise<GlobalConfig> {
    const config = await this.prisma.globalConfiguration.upsert({
      where: { id: SINGLETON_ID },
      update: updates,
      create: {
        id: SINGLETON_ID,
        enableMarkdownResponses: updates.enableMarkdownResponses ?? false,
        includeToolReferences: updates.includeToolReferences ?? false,
      },
    });

    return {
      enableMarkdownResponses: config.enableMarkdownResponses,
      includeToolReferences: config.includeToolReferences,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Generate global configuration instructions for system prompts
   */
  generateGlobalInstructions(config: GlobalConfig): string {
    const instructions: string[] = [];

    if (config.enableMarkdownResponses) {
      instructions.push('Respond using markdown formatting for better readability.');
    }

    if (config.includeToolReferences) {
      // TODO: Implement tool references injection when LangChain tools are integrated
      instructions.push('Available tools: [tools will be injected here]');
    }

    return instructions.length > 0 ? instructions.join('\n') : '';
  }
}
