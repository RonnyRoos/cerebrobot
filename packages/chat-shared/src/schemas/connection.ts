import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1, 'Value cannot be empty');

// Client → Server Messages

export const ChatMessageSchema = z
  .object({
    type: z.literal('message'),
    requestId: NonEmptyString,
    threadId: NonEmptyString,
    content: NonEmptyString,
  })
  .strict();

export const CancellationSignalSchema = z
  .object({
    type: z.literal('cancel'),
    requestId: NonEmptyString,
  })
  .strict();

export const ClientMessageSchema = z.union([ChatMessageSchema, CancellationSignalSchema]);

// Type exports
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type CancellationSignal = z.infer<typeof CancellationSignalSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
