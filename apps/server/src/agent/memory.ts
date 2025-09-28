export type MemoryMessage = {
  readonly role: 'user' | 'assistant';
  readonly content: string;
};

import type { Logger } from 'pino';

interface MemoryEntry {
  summary?: string;
  messages: MemoryMessage[];
}

export class InMemoryLangMem {
  private readonly store = new Map<string, MemoryEntry>();

  constructor(
    private readonly hotpathLimit: number,
    private readonly logger?: Logger,
  ) {}

  public read(sessionId: string): MemoryEntry {
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, { messages: [] });
    }

    return this.store.get(sessionId)!;
  }

  public append(sessionId: string, message: MemoryMessage): void {
    const entry = this.read(sessionId);
    entry.messages.push(message);

    if (entry.messages.length > this.hotpathLimit) {
      const excess = entry.messages.splice(0, entry.messages.length - this.hotpathLimit);
      const overflowSummary = excess
        .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
        .join('\n');
      entry.summary = entry.summary ? `${entry.summary}\n${overflowSummary}` : overflowSummary;

      this.logger?.info(
        {
          sessionId,
          trimmedMessages: excess.length,
          hotpathLimit: this.hotpathLimit,
        },
        'langmem hotpath summarized',
      );
    }
  }

  public reset(sessionId: string): void {
    this.store.set(sessionId, { messages: [] });
    this.logger?.info({ sessionId }, 'langmem store reset for session');
  }

  public snapshot(sessionId: string): MemoryEntry {
    const entry = this.read(sessionId);
    return {
      summary: entry.summary,
      messages: [...entry.messages],
    };
  }
}
