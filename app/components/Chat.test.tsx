// @vitest-environment jsdom
//
// Regression tests for chat message-state bugs surfaced on the fix/doc-context
// branch. All three came from React/Remix effect lifecycle interactions, so they
// need a rendered component with a stub router (not pure functions):
//   1. Duplication — the history fetcher's post-action revalidation re-applied the
//      DB snapshot on top of the optimistic streaming append.
//   2. Stale replay — a keyed remount (chat reset) replayed the response still held
//      in route-scoped `actionData`.
//   3. Single-append — one response must stream into exactly one assistant message.

import { useState } from "react";
import { randomUUID } from "node:crypto";
import { createRemixStub } from "@remix-run/testing";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from "vitest";

import Chat from "./Chat";

const RESPONSE = "Hello world";
const WORDS = ["hello", "world"];

// A message reply that the stub action returns; kept short so streaming (50ms/word)
// settles quickly under real timers. No `conversationId` here on purpose: a draft
// Chat navigates to /conversation/:id once it receives one, and these tests aren't
// exercising that navigation (it has its own test below), so omitting it keeps them
// focused and free of an incidental route change.
function actionReply(message: string) {
  return {
    message,
    response: RESPONSE,
    words: WORDS,
  };
}

beforeAll(() => {
  // jsdom lacks these APIs that Chat touches.
  if (!globalThis.crypto?.randomUUID) {
    globalThis.crypto = {
      ...globalThis.crypto,
      randomUUID: randomUUID as Crypto["randomUUID"],
    } as Crypto;
  }
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => cleanup());

function typeAndSend(text: string) {
  const input = screen.getByPlaceholderText("Type your message...");
  fireEvent.change(input, { target: { value: text } });
  const form = input.closest("form");
  if (!form) throw new Error("message form not found");
  fireEvent.submit(form);
}

describe("Chat streaming + reset", () => {
  it("streams a response into exactly one assistant message", async () => {
    const Stub = createRemixStub([
      {
        path: "/",
        Component: () => <Chat />,
        action: async ({ request }) => {
          const form = await request.formData();
          return actionReply(String(form.get("message") ?? ""));
        },
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    typeAndSend("first question");

    // Settles to the committed assistant message; if the response were committed
    // twice this would resolve to length 2 and fail.
    await waitFor(() =>
      expect(screen.getAllByText(RESPONSE)).toHaveLength(1)
    );
    expect(screen.getByText("first question")).toBeInTheDocument();
  });

  it("shows the user's message immediately, before the response arrives", async () => {
    // Hold the action so the response can't arrive; the user message must still show.
    let releaseAction!: () => void;
    const actionGate = new Promise<void>((resolve) => {
      releaseAction = resolve;
    });
    const Stub = createRemixStub([
      {
        path: "/",
        Component: () => <Chat />,
        action: async ({ request }) => {
          const form = await request.formData();
          await actionGate;
          return actionReply(String(form.get("message") ?? ""));
        },
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    typeAndSend("instant question");

    // Rendered optimistically while the action is still pending.
    expect(screen.getByText("instant question")).toBeInTheDocument();
    expect(screen.queryByText(RESPONSE)).not.toBeInTheDocument();

    releaseAction();
    await waitFor(() =>
      expect(screen.getByText(RESPONSE)).toBeInTheDocument()
    );
  });

  it("rolls back the optimistic message and restores the input when the send fails", async () => {
    const Stub = createRemixStub([
      {
        path: "/",
        Component: () => <Chat />,
        action: () => ({ error: "Failed to process message" }),
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    typeAndSend("will fail");

    // Once the error comes back, the optimistic bubble is removed and the text is
    // restored to the input so it can be retried.
    await waitFor(() =>
      expect(screen.getByText("Failed to process message")).toBeInTheDocument()
    );
    expect(screen.queryByText("will fail")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type your message...")).toHaveValue(
      "will fail"
    );
  });

  it("does not replay the persisted response after a keyed remount (chat reset)", async () => {
    // Mirrors the index route: bumping the key remounts Chat while the previous
    // response still lives in route-scoped actionData.
    function Harness() {
      const [resetKey, setResetKey] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setResetKey((k) => k + 1)}>
            reset-chat
          </button>
          <Chat key={resetKey} />
        </>
      );
    }

    const Stub = createRemixStub([
      {
        path: "/",
        Component: Harness,
        action: async ({ request }) => {
          const form = await request.formData();
          return actionReply(String(form.get("message") ?? ""));
        },
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    typeAndSend("weather in denver");
    await waitFor(() =>
      expect(screen.getByText(RESPONSE)).toBeInTheDocument()
    );

    // Reset the chat (remount). actionData still holds the old response.
    fireEvent.click(screen.getByText("reset-chat"));

    // The fresh chat must be empty and stay empty — no replayed stream.
    await waitFor(() =>
      expect(screen.queryByText(RESPONSE)).not.toBeInTheDocument()
    );
    await new Promise((r) => setTimeout(r, WORDS.length * 50 + 100));
    expect(screen.queryByText(RESPONSE)).not.toBeInTheDocument();
    expect(screen.queryByText("weather in denver")).not.toBeInTheDocument();
  });

  it("navigates a draft to /conversation/:id after the first reply finishes streaming", async () => {
    // A brand-new chat (no conversationId) streams its first reply in place, then
    // moves to the conversation's canonical URL — so the first message still animates
    // AND the address bar updates. The reply carries the server-assigned id.
    const Stub = createRemixStub([
      {
        path: "/",
        Component: () => <Chat />,
        action: async ({ request }) => {
          const form = await request.formData();
          return {
            ...actionReply(String(form.get("message") ?? "")),
            conversationId: "conv-new",
          };
        },
      },
      {
        path: "/conversation/:id",
        Component: () => <div>conversation route</div>,
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    typeAndSend("first message");

    // The response streams in on the draft first (proving the animation ran)…
    await waitFor(() => expect(screen.getByText(RESPONSE)).toBeInTheDocument());
    // …then, once streaming completes, Chat navigates to the conversation route.
    await waitFor(() =>
      expect(screen.getByText("conversation route")).toBeInTheDocument()
    );
  });
});

describe("Chat history revalidation", () => {
  // The DB the stub simulates; the action writes to it, the messages loader reads it.
  let history: { role: string; content: string }[] = [];

  beforeEach(() => {
    // An existing conversation with prior turns, as when you open it from the
    // sidebar. Content is distinct from RESPONSE so we only count the new reply.
    history = [
      { role: "user", content: "earlier question" },
      { role: "assistant", content: "earlier answer" },
    ];
  });

  it("does not duplicate the reply when the history fetcher revalidates after send", async () => {
    const Stub = createRemixStub([
      {
        path: "/conversation/:id",
        Component: () => <Chat conversationId="conv-1" />,
        action: async ({ request }) => {
          const form = await request.formData();
          const message = String(form.get("message") ?? "");
          // Persist both turns, as createChatCompletion does server-side.
          history = [
            ...history,
            { role: "user", content: message },
            { role: "assistant", content: RESPONSE },
          ];
          return actionReply(message);
        },
      },
      {
        path: "/api/conversation/:id/messages",
        loader: () => ({ messages: history }),
      },
    ]);
    render(<Stub initialEntries={["/conversation/conv-1"]} />);

    // Wait for the initial history load to settle (marks history as loaded) before
    // sending — mirrors opening a conversation and then typing.
    await waitFor(() =>
      expect(screen.getByText("earlier question")).toBeInTheDocument()
    );

    typeAndSend("hello there");

    // The post-action revalidation refetches [user, assistant] from the "DB" while
    // the stream also appends the assistant. Without the initial-load guard this
    // resolves to two copies of RESPONSE.
    await waitFor(() =>
      expect(screen.getAllByText(RESPONSE)).toHaveLength(1)
    );
    // Give any pending revalidation a chance to (incorrectly) re-apply.
    await new Promise((r) => setTimeout(r, 150));
    expect(screen.getAllByText(RESPONSE)).toHaveLength(1);
  });

  it("falls back to the empty state (not a permanent blank) when history fails to load", async () => {
    const Stub = createRemixStub([
      {
        path: "/conversation/:id",
        Component: () => <Chat conversationId="conv-1" />,
        action: async ({ request }) => {
          const form = await request.formData();
          return actionReply(String(form.get("message") ?? ""));
        },
      },
      {
        // Simulates a 404/500 — the route returns an error shape, no `messages`.
        path: "/api/conversation/:id/messages",
        loader: () => ({ error: "Conversation not found" }),
      },
    ]);
    render(<Stub initialEntries={["/conversation/conv-1"]} />);

    // Without the loadingHistory-on-settle fix this would hang forever (blank chat).
    await waitFor(() =>
      expect(screen.getByText("Welcome to ThreadMind")).toBeInTheDocument()
    );
  });
});
