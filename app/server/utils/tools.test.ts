import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the external HTTP client and logger (testing.md — no real network / no noise).
vi.mock("./axios", () => ({
  axiosInstance: { get: vi.fn() },
}));

vi.mock("./logger", () => ({
  logger: { logError: vi.fn(), logRequest: vi.fn() },
}));

import { toolImplementations } from "./tools";
import { axiosInstance } from "./axios";

const get = axiosInstance.get as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SERPAPI_KEY = "test-key";
});

// search_web used to return only the first matching section, so a tangential
// knowledge-graph entity would be handed back alone while the organic results that
// actually answer the question were dropped. It now returns a labeled digest of
// the answer box, top organic results, and knowledge graph so the model can judge.
describe("search_web result extraction", () => {
  it("surfaces the answer_box direct answer under a Featured answer label", async () => {
    get.mockResolvedValue({
      data: {
        answer_box: { answer: "Mount Everest" },
        organic_results: [{ snippet: "A list of mountains around the world." }],
      },
    });
    const result = await toolImplementations.search_web({
      query: "tallest mountain",
    });
    expect(result).toContain("Featured answer: Mount Everest");
  });

  it("uses the answer_box snippet when there is no direct answer", async () => {
    get.mockResolvedValue({
      data: {
        answer_box: {
          snippet: "Mount Everest is Earth's highest mountain above sea level.",
        },
      },
    });
    const result = await toolImplementations.search_web({ query: "everest" });
    expect(result).toContain(
      "Featured answer: Mount Everest is Earth's highest mountain above sea level."
    );
  });

  it("includes the knowledge graph entity (title + type + description)", async () => {
    get.mockResolvedValue({
      data: {
        knowledge_graph: {
          title: "Mount Everest",
          type: "Mountain",
          description: "Mount Everest is Earth's highest mountain above sea level.",
        },
      },
    });
    const result = await toolImplementations.search_web({
      query: "tallest mountain",
    });
    expect(result).toContain(
      "Knowledge graph: Mount Everest — Mountain — Mount Everest is Earth's highest mountain above sea level."
    );
  });

  it("keeps the organic results even when a tangential knowledge graph is present", async () => {
    // Mirrors the real failure: Google resolved the query to an unrelated company
    // entity, but the organic results still carry the real answer. Both must survive.
    get.mockResolvedValue({
      data: {
        knowledge_graph: { title: "Current", type: "Financial company" },
        organic_results: [
          { snippet: "The office is held by the current head of state." },
          { snippet: "Elections determine who holds the office." },
        ],
      },
    });
    const result = await toolImplementations.search_web({ query: "who holds office" });
    expect(result).toContain("Top results:");
    expect(result).toContain("current head of state");
    expect(result).toContain("Knowledge graph: Current — Financial company");
  });

  it("caps organic snippets at the top five", async () => {
    get.mockResolvedValue({
      data: {
        organic_results: [
          { snippet: "One." },
          { snippet: "Two." },
          { snippet: "Three." },
          { snippet: "Four." },
          { snippet: "Five." },
          { snippet: "Six (dropped)." },
        ],
      },
    });
    const result = await toolImplementations.search_web({ query: "x" });
    expect(result).toContain("Five.");
    expect(result).not.toContain("Six");
  });

  it("returns a no-results message when SerpAPI has nothing usable", async () => {
    get.mockResolvedValue({ data: {} });
    expect(await toolImplementations.search_web({ query: "x" })).toBe(
      "No relevant search results found."
    );
  });

  it("returns a friendly message when the request throws", async () => {
    get.mockRejectedValue(new Error("network down"));
    expect(await toolImplementations.search_web({ query: "x" })).toBe(
      "Unable to search the web at this time."
    );
  });
});
