// @vitest-environment jsdom
//
// Regression tests for the sidebar callbacks that drive chat reset. The "New"
// button was a dead `<Link to="/">` that never called `onNewConversation`, so it
// did nothing once you were already on the index route; deleting the open
// conversation likewise relies on `onActiveConversationDeleted` firing.

import { createRemixStub } from "@remix-run/testing";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, it, expect, vi } from "vitest";

import ConversationSidebar from "./ConversationSidebar";
import type { Conversation } from "~/types/conversation.types";

afterEach(() => cleanup());

const conversation: Conversation = {
  id: "conv-1",
  title: "My chat",
  messageCount: 2,
  updatedAt: new Date().toISOString(),
} as Conversation;

describe("ConversationSidebar callbacks", () => {
  it("invokes onNewConversation when the New button is clicked", () => {
    const onNewConversation = vi.fn();
    const Stub = createRemixStub([
      {
        path: "/",
        Component: () => (
          <ConversationSidebar
            conversations={[]}
            onNewConversation={onNewConversation}
            onConversationSelect={() => {}}
          />
        ),
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(onNewConversation).toHaveBeenCalledTimes(1);
  });

  it("invokes onActiveConversationDeleted after deleting the open conversation", async () => {
    const onActiveConversationDeleted = vi.fn();
    const Stub = createRemixStub([
      {
        path: "/",
        Component: () => (
          <ConversationSidebar
            conversations={[conversation]}
            currentConversationId={conversation.id}
            onNewConversation={() => {}}
            onConversationSelect={() => {}}
            onActiveConversationDeleted={onActiveConversationDeleted}
          />
        ),
      },
      {
        path: "/api/conversation/:id/delete",
        action: () => ({ success: true }),
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    // Trash icon → confirm → Delete.
    fireEvent.click(
      screen.getByRole("button", { name: `Delete conversation: My chat` })
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(onActiveConversationDeleted).toHaveBeenCalledTimes(1)
    );
  });
});
