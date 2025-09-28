import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { Logger } from 'pino';
import type { BaseMessage } from '@langchain/core/messages';
import type { ChatAgent, ChatInvocationContext } from '../chat/chat-agent.js';
import type { ServerConfig } from '../config.js';
import { InMemoryLangMem } from './memory.js';

function toStringContent(content: unknown): string {
  if (content == null) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          return item.text;
        }

        return '';
      })
      .join('');
  }

  if (
    typeof content === 'object' &&
    'text' in content &&
    typeof (content as { text: unknown }).text === 'string'
  ) {
    return (content as { text: string }).text;
  }

  return String(content);
}

export interface LangGraphChatAgentOptions {
  readonly config: ServerConfig;
  readonly hotpathLimit: number;
  readonly logger?: Logger;
}

export class LangGraphChatAgent implements ChatAgent {
  private readonly memory: InMemoryLangMem;
  private readonly model: ChatOpenAI;
  private readonly logger?: Logger;

  constructor(private readonly options: LangGraphChatAgentOptions) {
    const { config, hotpathLimit } = options;
    this.logger = options.logger;
    this.memory = new InMemoryLangMem(hotpathLimit, this.logger);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required to run the chat agent.');
    }

    this.model = new ChatOpenAI({
      model: config.model,
      temperature: config.temperature,
      configuration: {
        baseURL: process.env.OPENAI_API_BASE,
      },
    });
  }

  public async *streamChat(context: ChatInvocationContext) {
    const { promptMessages, startedAt } = this.preparePrompt(context);
    let accumulatedMessage = '';

    const stream = await this.model.stream(promptMessages, {
      configurable: { thread_id: context.sessionId },
    });

    for await (const chunk of stream) {
      const token = toStringContent(chunk.content);
      if (token.length === 0) {
        continue;
      }

      accumulatedMessage += token;
      yield { type: 'token' as const, value: token };
    }

    const { finalMessage, latencyMs } = this.recordAssistantResponse(
      context,
      startedAt,
      accumulatedMessage,
    );

    yield { type: 'final' as const, message: finalMessage, latencyMs };
  }

  public async completeChat(context: ChatInvocationContext) {
    const { promptMessages, startedAt } = this.preparePrompt(context);

    const completion = await this.model.invoke(promptMessages, {
      configurable: { thread_id: context.sessionId },
    });

    const content = toStringContent(completion.content);
    const { finalMessage, latencyMs } = this.recordAssistantResponse(context, startedAt, content);

    return { message: finalMessage, summary: undefined, latencyMs };
  }

  public reset(sessionId: string): void {
    this.memory.reset(sessionId);
  }

  private preparePrompt(context: ChatInvocationContext): {
    promptMessages: BaseMessage[];
    startedAt: number;
  } {
    const startedAt = Date.now();
    this.logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
      },
      'invoking langgraph chat agent',
    );
    const { summary, messages } = this.memory.snapshot(context.sessionId);

    const systemMessages: SystemMessage[] = [new SystemMessage(this.options.config.systemPrompt)];
    if (this.options.config.personaTag.trim().length > 0) {
      systemMessages.push(new SystemMessage(`Persona: ${this.options.config.personaTag}`));
    }

    if (summary) {
      systemMessages.push(new SystemMessage(`Conversation summary:\n${summary}`));
    }

    const historyMessages = messages.map((message) =>
      message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content),
    );

    this.memory.append(context.sessionId, { role: 'user', content: context.message });

    const promptMessages: BaseMessage[] = [
      ...systemMessages,
      ...historyMessages,
      new HumanMessage(context.message),
    ];

    return { promptMessages, startedAt };
  }

  private recordAssistantResponse(
    context: ChatInvocationContext,
    startedAt: number,
    message: string,
  ) {
    const finalMessage = message.trim();
    this.memory.append(context.sessionId, { role: 'assistant', content: finalMessage });

    const latencyMs = Date.now() - startedAt;

    this.logger?.info(
      {
        sessionId: context.sessionId,
        correlationId: context.correlationId,
        latencyMs,
        messageLength: finalMessage.length,
      },
      'langgraph chat agent completed response',
    );

    return {
      finalMessage,
      latencyMs,
    };
  }
}

export function createLangGraphChatAgent(
  config: ServerConfig,
  logger?: Logger,
): LangGraphChatAgent {
  return new LangGraphChatAgent({ config, hotpathLimit: config.hotpathLimit, logger });
}
