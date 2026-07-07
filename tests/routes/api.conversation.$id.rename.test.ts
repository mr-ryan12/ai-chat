import { describe, it, expect, vi, beforeEach } from "vitest";

// Unit-test the rename action in isolation: mock auth and the service layer so no
// real session or DB is touched (testing.md — mock all external services).
vi.mock("~/utils/auth.server", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("~/server/utils/apiCalls/renameConversation", () => ({
  renameConversation: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  logger: { logError: vi.fn(), logRequest: vi.fn() },
}));

import { action } from "~/routes/api.conversation.$id.rename";
import { requireAuth } from "~/utils/auth.server";
import { renameConversation } from "~/server/utils/apiCalls/renameConversation";

const requireAuthMock = requireAuth as unknown as ReturnType<typeof vi.fn>;
const renameMock = renameConversation as unknown as ReturnType<typeof vi.fn>;

// The action returns the result of Remix's data() helper: { type, data, init }.
type DataResult = { data: unknown; init?: { status?: number } };

function unwrap(result: unknown): { status: number; body: unknown } {
  const r = result as DataResult;
  return { status: r.init?.status ?? 200, body: r.data };
}

// Build a form-encoded request; `method` defaults to the success path (PATCH).
// GET/HEAD can't carry a body, so omit it there (the method guard runs first).
function renameRequest(title: string | null, method = "PATCH"): Request {
  const canHaveBody = method !== "GET" && method !== "HEAD";
  const body = new URLSearchParams();
  if (title !== null) body.set("title", title);
  return new Request("http://test/api/conversation/conv-1/rename", {
    method,
    body: canHaveBody ? body : undefined,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

async function callAction(request: Request, id: string | undefined = "conv-1") {
  return action({
    request,
    params: { id },
    context: {},
  } as unknown as Parameters<typeof action>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthMock.mockResolvedValue("user-1");
  renameMock.mockResolvedValue({ success: true, title: "Renamed" });
});

describe("api.conversation.$id.rename action", () => {
  it("requires auth before doing anything", async () => {
    requireAuthMock.mockRejectedValueOnce(new Response("Unauthorized", { status: 401 }));
    await expect(callAction(renameRequest("New title"))).rejects.toBeInstanceOf(
      Response,
    );
    expect(renameMock).not.toHaveBeenCalled();
  });

  it("renames the conversation, scoped to the authenticated user", async () => {
    const { status, body } = unwrap(await callAction(renameRequest("New title")));
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, title: "Renamed" });
    expect(renameMock).toHaveBeenCalledWith("conv-1", "user-1", "New title");
  });

  it("rejects a missing conversation id with 400", async () => {
    const result = await action({
      request: renameRequest("New title"),
      params: {},
      context: {},
    } as unknown as Parameters<typeof action>[0]);
    const { status } = unwrap(result);
    expect(status).toBe(400);
    expect(renameMock).not.toHaveBeenCalled();
  });

  it("rejects an empty/whitespace title with 400 (input validation)", async () => {
    const { status } = unwrap(await callAction(renameRequest("   ")));
    expect(status).toBe(400);
    expect(renameMock).not.toHaveBeenCalled();
  });

  it("rejects a disallowed method with 405", async () => {
    const { status } = unwrap(await callAction(renameRequest("New title", "GET")));
    expect(status).toBe(405);
    expect(renameMock).not.toHaveBeenCalled();
  });

  it("maps a not-found service error to 404", async () => {
    renameMock.mockRejectedValueOnce(
      new Error("Conversation not found or does not belong to user"),
    );
    const { status, body } = unwrap(await callAction(renameRequest("New title")));
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Conversation not found" });
  });

  it("maps an unexpected service error to 500", async () => {
    renameMock.mockRejectedValueOnce(new Error("Failed to rename conversation"));
    const { status, body } = unwrap(await callAction(renameRequest("New title")));
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to rename conversation" });
  });
});
