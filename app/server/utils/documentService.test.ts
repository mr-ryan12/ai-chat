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

// queryDocuments calls $queryRaw both as a tagged template (ordered-chunk path) and
// with a Prisma.Sql object (hybrid retriever). Extract the SQL text from either.
function sqlText(arg: unknown): string {
  if (Array.isArray(arg)) return arg.join(" ");
  if (arg && typeof arg === "object") {
    const sql = arg as { sql?: string; strings?: string[] };
    if (typeof sql.sql === "string") return sql.sql;
    if (Array.isArray(sql.strings)) return sql.strings.join(" ");
  }
  return String(arg);
}

// Branch-specific canned results so assertions can tell the retrieval paths apart.
// Hybrid fusion of the vector + full-text lists below ranks c2 (in both) first.
const FUSED_HYBRID = "shared\n\nv-top\n\nf-only";

function stubQueryRaw(): void {
  queryRaw.mockImplementation((arg: unknown) => {
    const sql = sqlText(arg);
    if (sql.includes("orderInDoc")) {
      return Promise.resolve([{ content: "ordered-a" }, { content: "ordered-b" }]);
    }
    if (sql.includes("plainto_tsquery")) {
      return Promise.resolve([
        { id: "c2", content: "shared" },
        { id: "c3", content: "f-only" },
      ]);
    }
    // vector search
    return Promise.resolve([
      { id: "c1", content: "v-top" },
      { id: "c2", content: "shared" },
    ]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubQueryRaw();
});

describe("queryDocuments routing", () => {
  it("scopes to the current conversation's document, then hybrid-searches it", async () => {
    findFirst.mockResolvedValueOnce({ id: "doc-conv" });

    const result = await queryDocuments(
      "find the pricing in the resume",
      "user-1",
      "conv-1",
    );

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", conversationId: "conv-1" } }),
    );
    expect(result).toBe(FUSED_HYBRID);
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

  it("hybrid-searches the recent doc for a specific-but-not-summary query", async () => {
    findFirst.mockResolvedValueOnce({ id: "doc-recent" });

    const result = await queryDocuments(
      "find the pricing in the file i uploaded",
      "user-1",
    );

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(result).toBe(FUSED_HYBRID);
  });

  it("does a user-wide hybrid search when the query targets no specific doc", async () => {
    const result = await queryDocuments("tell me about the content", "user-1");

    // No conversationId and not a specific-doc reference → no document lookup.
    expect(findFirst).not.toHaveBeenCalled();
    expect(result).toBe(FUSED_HYBRID);
  });

  it("returns the no-content message when retrieval finds nothing", async () => {
    queryRaw.mockResolvedValue([]);

    const result = await queryDocuments("tell me about the content", "user-1");

    expect(result).toBe("I couldn't find any relevant content in the documents.");
  });
});
