import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WS from 'vitest-websocket-mock';
import { WebSocket } from 'mock-socket';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatView } from '../ChatView';

const WS_URL = 'ws://localhost:3030/api/chat/ws';
let restoreClose: (() => void) | null = null;

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
    ...init,
  });
}

function renderWithUser(): ReturnType<typeof render> & {
  user: ReturnType<typeof userEvent.setup>;
} {
  const user = userEvent.setup();
  const mockOnBack = vi.fn();
  return {
    user,
    ...render(
      <ChatView userId="test-user-123" agentId="agent-alpha" threadId={null} onBack={mockOnBack} />,
    ),
  };
}

describe('<ChatView />', () => {
  let server: WS;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('WebSocket', WebSocket);

    const wsPrototype = WebSocket.prototype as {
      close: (code?: number, reason?: string) => void;
    };
    const originalClose = wsPrototype.close;
    wsPrototype.close = function patchedClose(this: WebSocket, code?: number, reason?: string) {
      const allowedCode =
        code === undefined || code === 1000 || (code >= 3000 && code <= 4999) ? code : 1000;
      return originalClose.call(this, allowedCode, reason);
    };
    restoreClose = () => {
      wsPrototype.close = originalClose;
    };

    (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_WS_URL =
      WS_URL;
    server = new WS(WS_URL, { jsonProtocol: true });
  });

  afterEach(() => {
    restoreClose?.();
    restoreClose = null;
    WS.clean();
    vi.unstubAllGlobals();
  });

  it('streams assistant tokens via WebSocket and renders the final message', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ threadId: '550e8400-e29b-41d4-a716-446655440001' }, { status: 201 }),
    );

    const { user } = renderWithUser();

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello world');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await server.connected;
    const request = await server.nextMessage;
    expect(request).toMatchObject({
      threadId: '550e8400-e29b-41d4-a716-446655440001',
      message: 'Hello world',
      userId: 'test-user-123',
    });

    server.send({ type: 'token', value: 'Hello' });
    server.send({ type: 'token', value: ' world' });
    server.send({
      type: 'final',
      message: 'Hello world',
      latencyMs: 1100,
      tokenUsage: { recentTokens: 12, overflowTokens: 0, budget: 3000, utilisationPct: 0 },
    });

    await waitFor(() => expect(screen.getByText('Hello world')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByText(/Context usage: 0% \(12\/3000 tokens\)/)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/should stay internal/i)).toBeNull();
  });

  it('surfaces retriable errors returned by the backend', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ threadId: '550e8400-e29b-41d4-a716-446655440002' }, { status: 201 }),
    );

    const { user } = renderWithUser();

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Status?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await server.connected;
    await server.nextMessage;

    server.send({ type: 'error', message: 'LLM timeout', retryable: true });
    server.close({ code: 1011, reason: 'Retryable error' });

    await waitFor(() => expect(screen.getByText(/LLM timeout/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeEnabled();
  });

  it('resets state when creating a new thread and never sends config overrides', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ threadId: '550e8400-e29b-41d4-a716-446655440003' }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ threadId: '550e8400-e29b-41d4-a716-446655440004' }, { status: 201 }),
      );

    const { user } = renderWithUser();

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'First');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await server.connected;
    const firstRequest = await server.nextMessage;
    server.send({
      type: 'final',
      message: 'First response',
      latencyMs: 900,
      tokenUsage: { recentTokens: 5, overflowTokens: 0, budget: 3000, utilisationPct: 0 },
    });
    await waitFor(() => expect(screen.getByText('First response')).toBeInTheDocument());

    await server.closed;
    server.close();
    server = new WS(WS_URL, { jsonProtocol: true });

    await user.click(screen.getByRole('button', { name: /new thread/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/thread'),
        expect.anything(),
      ),
    );

    expect(screen.queryByText('First response')).toBeNull();

    await user.clear(input);
    await user.type(input, 'Second');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await server.connected;
    const secondRequest = await server.nextMessage;
    server.send({
      type: 'final',
      message: 'Second response',
      latencyMs: 800,
      tokenUsage: { recentTokens: 4, overflowTokens: 0, budget: 3000, utilisationPct: 0 },
    });

    await waitFor(() => expect(screen.getByText('Second response')).toBeInTheDocument());

    expect(firstRequest).not.toHaveProperty('temperature');
    expect(secondRequest).toMatchObject({
      threadId: '550e8400-e29b-41d4-a716-446655440004',
      message: 'Second',
      userId: 'test-user-123',
      clientRequestId: expect.any(String),
    });
  });
});
