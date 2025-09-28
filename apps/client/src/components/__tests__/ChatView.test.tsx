import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatView } from '../ChatView';

const encoder = new TextEncoder();

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
    ...init,
  });
}

function sseResponse(events: unknown[], init?: ResponseInit): Response {
  const payload = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream',
    },
    ...init,
  });
}

function renderWithUser(): ReturnType<typeof render> & {
  user: ReturnType<typeof userEvent.setup>;
} {
  const user = userEvent.setup();
  return { user, ...render(<ChatView />) };
}

describe('<ChatView />', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('streams assistant tokens via SSE and renders the final message', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ sessionId: 'session-123' }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { type: 'token', value: 'Hello' },
        { type: 'token', value: ' world' },
        { type: 'final', message: 'Hello world', latencyMs: 1100, summary: 'should stay internal' },
      ]),
    );

    const { user } = renderWithUser();

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello world');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(screen.getByText('Hello world')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/chat'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'text/event-stream',
        }),
      }),
    );

    expect(screen.queryByText(/should stay internal/i)).toBeNull();
  });

  it('surfaces retriable errors returned by the backend', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ sessionId: 'session-456' }, { status: 201 }));
    fetchMock.mockResolvedValueOnce(
      sseResponse([{ type: 'error', message: 'LLM timeout', retryable: true }], { status: 200 }),
    );

    const { user } = renderWithUser();

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Status?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/LLM timeout/i)).toBeInTheDocument());
  });

  it('resets state when creating a new session and never sends config overrides', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ sessionId: 'session-abc' }, { status: 201 }))
      .mockResolvedValueOnce(
        sseResponse([{ type: 'final', message: 'First response', latencyMs: 900 }]),
      )
      .mockResolvedValueOnce(jsonResponse({ sessionId: 'session-def' }, { status: 201 }))
      .mockResolvedValueOnce(
        sseResponse([{ type: 'final', message: 'Second response', latencyMs: 800 }]),
      );

    const { user } = renderWithUser();

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'First');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('First response')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /new session/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('/api/session'),
        expect.anything(),
      ),
    );

    expect(screen.queryByText('First response')).toBeNull();

    await user.clear(input);
    await user.type(input, 'Second');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(screen.getByText('Second response')).toBeInTheDocument());

    const lastCall = fetchMock.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({
      body: JSON.stringify({
        sessionId: 'session-def',
        message: 'Second',
        clientRequestId: expect.any(String),
      }),
    });
    expect(JSON.parse((lastCall?.[1] as RequestInit).body as string)).not.toHaveProperty(
      'temperature',
    );
  });
});
