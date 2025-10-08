import type { BaseMessage } from '@langchain/core/messages';
import { getTokenizer, type TiktokenEncoder } from './tiktoken-loader.js';
import { toStringContent } from './message-utils.js';

const TOKENS_PER_MESSAGE_OVERHEAD = 4;

function countMessageTokens(tokenizer: TiktokenEncoder | null, message: BaseMessage): number {
  const content = toStringContent(message.content);
  const contentTokens = tokenizer
    ? tokenizer.encode(content).length
    : Math.ceil(content.length / 4);
  return contentTokens + TOKENS_PER_MESSAGE_OVERHEAD;
}

async function splitMessagesByBudget(
  messages: BaseMessage[],
  model: string,
  tokenBudget: number,
  maxMessageCount: number,
  minimumRecentMessages: number,
  marginPct: number,
): Promise<{
  recent: BaseMessage[];
  overflow: BaseMessage[];
  overflowTokenCount: number;
  recentTokenCount: number;
}> {
  if (messages.length === 0) {
    return { recent: [], overflow: [], overflowTokenCount: 0, recentTokenCount: 0 };
  }

  const tokenizer = await getTokenizer(model);
  const effectiveMinRecent = Math.max(
    1,
    Math.min(minimumRecentMessages, maxMessageCount, messages.length),
  );

  const adjustedBudget = Math.max(
    0,
    Math.floor(tokenBudget * (1 - Math.min(Math.max(marginPct, 0), 0.9))),
  );
  const effectiveBudget = Math.max(0, Math.min(tokenBudget, adjustedBudget));

  const tokenized = messages.map((message) => ({
    message,
    tokens: countMessageTokens(tokenizer, message),
  }));

  const recent: BaseMessage[] = [];
  let recentTokenCount = 0;

  for (let index = tokenized.length - 1; index >= 0; index -= 1) {
    const entry = tokenized[index];
    const mustKeep = recent.length < effectiveMinRecent;
    const budgetLimit = effectiveBudget > 0 ? effectiveBudget : tokenBudget;
    const wouldExceedBudget = recentTokenCount + entry.tokens > budgetLimit;
    const wouldExceedCount = recent.length >= maxMessageCount;

    if (!mustKeep && (wouldExceedBudget || wouldExceedCount)) {
      const overflowEntries = tokenized.slice(0, index + 1);
      return {
        recent,
        overflow: overflowEntries.map((item) => item.message),
        overflowTokenCount: overflowEntries.reduce((acc, item) => acc + item.tokens, 0),
        recentTokenCount,
      };
    }

    recent.unshift(entry.message);
    recentTokenCount += entry.tokens;
  }

  return {
    recent,
    overflow: [],
    overflowTokenCount: 0,
    recentTokenCount,
  };
}

interface TokenUsageSnapshot {
  recentTokens: number;
  overflowTokens: number;
  budget: number;
}

function formatTokenUsageSnapshot(snapshot: TokenUsageSnapshot | null | undefined) {
  if (!snapshot) {
    return undefined;
  }

  const utilisationPct =
    snapshot.budget > 0
      ? Math.min(100, Math.round((snapshot.recentTokens / snapshot.budget) * 100))
      : 0;

  return {
    ...snapshot,
    utilisationPct,
  } as const;
}

export { splitMessagesByBudget, formatTokenUsageSnapshot };
export type { TokenUsageSnapshot };
