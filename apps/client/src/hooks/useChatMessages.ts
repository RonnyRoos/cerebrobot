import { useEffect, useRef, useState } from 'react';
import type {
  TokenUsage,
  MemoryCreatedEvent,
  MemoryUpdatedEvent,
  MemoryDeletedEvent,
} from '@cerebrobot/chat-shared';
import { useThreadConnection } from './useThreadConnection.js';

/**
 * useChatMessages Hook (Refactored for thread-persistent WebSocket)
 *
 * Manages message state and coordinates with useThreadConnection for WebSocket communication.
 * Simplified from 397 lines to ~200 lines by delegating WebSocket management to useThreadConnection.
 *
 * Error Handling Philosophy:
 * - Manages internal error state for user-facing display
 * - Includes retry logic (retryable vs. non-retryable errors)
 * - Self-contained error recovery (caller doesn't need error handling)
 */

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'complete' | 'error';
  latencyMs?: number;
  error?: string;
  tokenUsage?: TokenUsage;
}

interface ErrorState {
  message: string;
  retryable: boolean;
}

interface CancelledState {
  userMessage: string;
  userMessageId: string;
}

interface UseChatMessagesOptions {
  userId: string | null;
  getActiveThreadId: () => Promise<string | null>;
  initialMessages?: DisplayMessage[];
  onMemoryCreated?: (event: MemoryCreatedEvent) => void;
  onMemoryUpdated?: (event: MemoryUpdatedEvent) => void;
  onMemoryDeleted?: (event: MemoryDeletedEvent) => void;
}

interface UseChatMessagesResult {
  messages: DisplayMessage[];
  isStreaming: boolean;
  error: ErrorState | null;
  cancelledMessage: CancelledState | null;
  isConnected: boolean; // Changed from connectionState to isConnected
  pendingMessage: string;
  handleSend: () => Promise<void>;
  setPendingMessage: (msg: string) => void;
  onRetry: () => void;
  clearChat: () => void;
  handleCancel: () => void;
  canCancel: boolean;
}

export function useChatMessages(options: UseChatMessagesOptions): UseChatMessagesResult {
  const {
    userId,
    getActiveThreadId,
    initialMessages = [],
    onMemoryCreated,
    onMemoryUpdated,
    onMemoryDeleted,
  } = options;

  // State management
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [pendingMessage, setPendingMessage] = useState('');
  const [error, setErrorInternal] = useState<ErrorState | null>(null);
  const [cancelledMessage, setCancelledMessage] = useState<CancelledState | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Track autonomous messages being streamed (requestId -> messageId mapping)
  const autonomousMessagesRef = useRef<Map<string, string>>(new Map());

  // Callback for autonomous message tokens (streaming)
  const handleAutonomousToken = (requestId: string, token: string) => {
    let messageId = autonomousMessagesRef.current.get(requestId);

    if (!messageId) {
      // First token - create a new streaming message
      messageId = `autonomous-${requestId}`;
      autonomousMessagesRef.current.set(requestId, messageId);

      const autonomousMessage: DisplayMessage = {
        id: messageId,
        role: 'assistant',
        content: token,
        status: 'streaming',
      };

      setMessages((prev) => [...prev, autonomousMessage]);
      console.log('[useChatMessages] Autonomous message started streaming', { requestId });
    } else {
      // Append token to existing message
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, content: msg.content + token } : msg)),
      );
    }
  };

  // Callback for autonomous message completion
  const handleAutonomousComplete = (requestId: string, message: string, latencyMs?: number) => {
    const messageId = autonomousMessagesRef.current.get(requestId);

    if (messageId) {
      // Update existing streaming message to complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: message, status: 'complete', latencyMs } : msg,
        ),
      );
      autonomousMessagesRef.current.delete(requestId);
      console.log('[useChatMessages] Autonomous message completed', { requestId, latencyMs });
    } else {
      // Fallback: No tokens received, create complete message directly
      const autonomousMessage: DisplayMessage = {
        id: `autonomous-${requestId}`,
        role: 'assistant',
        content: message,
        status: 'complete',
        latencyMs,
      };
      setMessages((prev) => [...prev, autonomousMessage]);
      console.log('[useChatMessages] Autonomous message added (no streaming)', { requestId });
    }
  };

  // Legacy callback for backward compatibility (not used with new streaming approach)
  const handleAutonomousMessage = () => {
    // This is now only called as a fallback from onAutonomousComplete
    // The actual streaming is handled by handleAutonomousToken/Complete
  };

  // Thread-persistent WebSocket connection
  const { sendMessage, cancelMessage, isConnected } = useThreadConnection(
    activeThreadId,
    handleAutonomousMessage,
    handleAutonomousToken,
    handleAutonomousComplete,
    onMemoryCreated,
    onMemoryUpdated,
    onMemoryDeleted,
  );

  // Refs for stable references
  const assistantMessageIdRef = useRef<string | null>(null);
  const errorRef = useRef<ErrorState | null>(null);
  const currentRequestIdRef = useRef<string | null>(null);
  const lastUserMessageRef = useRef<{ content: string; id: string } | null>(null);

  const setErrorState = (value: ErrorState | null) => {
    errorRef.current = value;
    setErrorInternal(value);
  };

  // Sync messages with initialMessages when they change (e.g., when switching threads)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Eagerly establish WebSocket connection when component mounts
  useEffect(() => {
    const establishConnection = async () => {
      const threadId = await getActiveThreadId();
      if (threadId && threadId !== activeThreadId) {
        setActiveThreadId(threadId);
      }
    };
    void establishConnection();
  }, [getActiveThreadId, activeThreadId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled by useThreadConnection
      // Just reset local state
      setMessages([]);
      setIsStreaming(false);
      setErrorState(null);
    };
  }, []);

  const handleAssistantError = (err: ErrorState) => {
    setIsStreaming(false);
    setErrorState(err);

    const assistantId = assistantMessageIdRef.current;
    if (assistantId) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                status: 'error',
                content: '',
                error: err.message,
              }
            : message,
        ),
      );
    }
    assistantMessageIdRef.current = null;
  };

  const appendAssistantToken = (messageId: string, token: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: `${message.content}${token}`,
            }
          : message,
      ),
    );
  };

  const finalizeAssistantMessage = (
    messageId: string,
    message: string,
    latencyMs?: number,
    tokenUsage?: TokenUsage,
  ) => {
    setMessages((current) =>
      current.map((entry) =>
        entry.id === messageId
          ? {
              ...entry,
              status: 'complete',
              content: message,
              latencyMs: latencyMs ?? entry.latencyMs,
              tokenUsage: tokenUsage ?? entry.tokenUsage,
            }
          : entry,
      ),
    );
  };

  const handleSend = async () => {
    if (!pendingMessage.trim()) {
      return;
    }

    // Ensure userId is present (required for all chat operations)
    if (!userId) {
      setErrorState({
        message: 'User ID is required. Please set up your user profile first.',
        retryable: false,
      });
      return;
    }

    // Get active thread ID
    const threadId = await getActiveThreadId();

    if (!threadId) {
      handleAssistantError({
        message:
          'Thread unavailable: No active conversation thread found. Please refresh the page.',
        retryable: true,
      });
      return;
    }

    // Update active thread ID if it changed (triggers WebSocket reconnection)
    if (threadId !== activeThreadId) {
      setActiveThreadId(threadId);
      // Wait for connection to establish (up to 5 seconds)
      const connectionStart = Date.now();
      const maxWaitMs = 5000;
      while (!isConnected && Date.now() - connectionStart < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // If still not connected after timeout, fail
      if (!isConnected) {
        handleAssistantError({
          message: 'Failed to establish WebSocket connection. Please try again.',
          retryable: true,
        });
        return;
      }
    }

    // Verify we're connected before sending
    if (!isConnected) {
      handleAssistantError({
        message: 'Not connected. Please wait for the connection to establish.',
        retryable: true,
      });
      return;
    }

    // Auto-cancel any in-flight streaming request (fire-and-forget)
    if (isStreaming && currentRequestIdRef.current) {
      cancelMessage(currentRequestIdRef.current);
      // Don't wait for acknowledgment - server handles race conditions
      // Old request's tokens won't route to new handlers due to requestId correlation
    }

    const messageToSend = pendingMessage;
    const userMessageId = `user-${crypto.randomUUID()}`;
    const assistantMessageId = `assistant-${crypto.randomUUID()}`;
    assistantMessageIdRef.current = assistantMessageId;

    // Track last user message for retry on cancellation
    lastUserMessageRef.current = { content: messageToSend, id: userMessageId };

    // Add user and assistant messages to UI
    setMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: 'user',
        content: messageToSend,
        status: 'complete',
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
      },
    ]);

    setPendingMessage('');
    setIsStreaming(true);
    setErrorState(null); // Clear any previous errors
    setCancelledMessage(null); // Clear any previous cancellation state
    setErrorState(null);

    // Send message via thread-persistent WebSocket
    const requestId = sendMessage(
      messageToSend,
      // onToken callback
      (token: string) => {
        appendAssistantToken(assistantMessageId, token);
      },
      // onComplete callback
      (message: string, latencyMs?: number) => {
        finalizeAssistantMessage(assistantMessageId, message, latencyMs, undefined);
        assistantMessageIdRef.current = null;
        currentRequestIdRef.current = null;
        setIsStreaming(false);
      },
      // onError callback
      (errorMessage: string, retryable: boolean) => {
        handleAssistantError({
          message: errorMessage,
          retryable,
        });
        currentRequestIdRef.current = null;
      },
      // onCancelled callback
      () => {
        // Remove partial streaming message from UI
        setMessages((current) => current.filter((msg) => msg.id !== assistantMessageId));
        assistantMessageIdRef.current = null;
        currentRequestIdRef.current = null;
        setIsStreaming(false);

        // Save cancelled state for retry AND immediately repopulate input
        if (lastUserMessageRef.current) {
          setCancelledMessage({
            userMessage: lastUserMessageRef.current.content,
            userMessageId: lastUserMessageRef.current.id,
          });
          // Automatically repopulate input field so user can edit/resend
          setPendingMessage(lastUserMessageRef.current.content);
        }
      },
    );

    currentRequestIdRef.current = requestId;
  };

  const onRetry = () => {
    // Handle retryable errors
    if (errorRef.current?.retryable) {
      setErrorState(null);
      return;
    }

    // Handle cancelled message retry
    if (cancelledMessage) {
      // Remove the orphaned user message from history
      // (input field is already populated from onCancelled callback)
      setMessages((current) => current.filter((msg) => msg.id !== cancelledMessage.userMessageId));
      setCancelledMessage(null);
    }
  };

  const clearChat = () => {
    // Reset thread connection (will trigger new connection on next message)
    setActiveThreadId(null);
    assistantMessageIdRef.current = null;
    currentRequestIdRef.current = null;
    lastUserMessageRef.current = null;
    setMessages([]);
    setPendingMessage('');
    setErrorState(null);
    setCancelledMessage(null);
    setIsStreaming(false);
  };

  const handleCancel = () => {
    if (currentRequestIdRef.current) {
      cancelMessage(currentRequestIdRef.current);
    }
  };

  const canCancel = isStreaming && currentRequestIdRef.current !== null;

  return {
    messages,
    isStreaming,
    error,
    cancelledMessage,
    isConnected,
    pendingMessage,
    handleSend,
    setPendingMessage,
    onRetry,
    clearChat,
    handleCancel,
    canCancel,
  };
}
