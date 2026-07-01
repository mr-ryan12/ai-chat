import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external services per testing.md: no real OpenAI, no real DB.
// A class so `new OpenAIEmbeddings()` in the module under test is constructable.
vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: class {
    async embedQuery(): Promise<number[]> {
      return new Array(1536).fill(0);
    }
  },
}));

vi.mock("~/server/db.server", () => ({
  prisma: {
    document: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { queryDocuments } from "./documentService";
import { prisma } from "~/server/db.server";

// Loosely-typed handles so canned return values don't have to satisfy Prisma's
// PrismaPromise signatures.
const findFirst = prisma.document.findFirst as unknown as ReturnType<typeof vi.fn>;
const queryRaw = prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>;

// Identify which retrieval branch ran by inspecting the raw SQL, and return
// branch-specific canned chunks so assertions can tell the paths apart.
function stubQueryRaw(): void {
  queryRaw.mockImplementation((strings: unknown) => {
    const sql = (strings as TemplateStringsArray).join(" ");
    if (sql.includes("orderInDoc")) {
      return Promise.resolve([{ content: "ordered-a" }, { content: "ordered-b" }]);
    }
    if (sql.includes('JOIN "Document"')) {
      return Promise.resolve([{ content: "semantic-user", distance: 0.2 }]);
    }
    return Promise.resolve([{ content: "in-doc", distance: 0.1 }]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubQueryRaw();
});

describe("queryDocuments routing", () => {
  it("scopes to the current conversation's document when one exists", async () => {
    findFirst.mockResolvedValueOnce({ id: "doc-conv" });

    const result = await queryDocuments(
      "what's my phone number in the resume",
      "user-1",
      "conv-1",
    );

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", conversationId: "conv-1" } }),
    );
    // Targeted (not whole-doc) lookup within the resolved doc → in-document semantic.
    expect(result).toBe("in-doc");
  });

  it("returns ordered chunks for a whole-document summary of the resolved doc", async () => {
    findFirst.mockResolvedValueOnce({ id: "doc-conv" });

    const result = await queryDocuments("summarize this document", "user-1", "conv-1");

    expect(result).toBe("ordered-a\n\nordered-b");
  });

  it("falls back to the most-recent upload when there is no conversation match", async () => {
    findFirst
      .mockResolvedValueOnce(null) // conversation-scoped miss
      .mockResolvedValueOnce({ id: "doc-recent" }); // user-scoped recency hit

    const result = await queryDocuments(
      "summarize the document I just uploaded",
      "user-1",
      "conv-1",
    );

    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(result).toBe("ordered-a\n\nordered-b");
  });

  it("uses recency scoping even without a conversationId for a specific-doc query", async () => {
    findFirst.mockResolvedValueOnce({ id: "doc-recent" });

    const result = await queryDocuments("what does the file I uploaded say", "user-1");

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(result).toBe("ordered-a\n\nordered-b");
  });

  it("does a user-wide semantic search when the query targets no specific doc", async () => {
    const result = await queryDocuments("tell me about the content", "user-1");

    // No conversationId and not a specific-doc reference → no document lookup.
    expect(findFirst).not.toHaveBeenCalled();
    expect(result).toBe("semantic-user");
  });

  it("returns the no-content message when retrieval finds nothing", async () => {
    queryRaw.mockResolvedValue([]);

    const result = await queryDocuments("tell me about the content", "user-1");

    expect(result).toBe("I couldn't find any relevant content in the documents.");
  });
});
