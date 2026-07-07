// Packages
import { axiosInstance } from "./axios";

// Types
import { logger } from "./logger";

export const tools = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for additional information",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_time_in_timezone",
      description: "Get the current time in a specific timezone",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description:
              "The timezone to get the time for (e.g., 'America/New_York', 'Europe/London')",
          },
        },
        required: ["timezone"],
      },
    },
  },
];

// Minimal shape of the SerpAPI fields we read.
interface SerpApiResponse {
  answer_box?: {
    answer?: string;
    snippet?: string;
    title?: string;
    snippet_highlighted_words?: string[];
    list?: string[];
  };
  knowledge_graph?: {
    title?: string;
    type?: string;
    description?: string;
  };
  organic_results?: { snippet?: string }[];
}

// Build a labeled digest of everything SerpAPI returned, rather than picking a
// single "best" field. The old code returned only the first matching section, so a
// tangential knowledge-graph entity (e.g. Google resolving "current" to a company
// named "Current") would be handed back alone while the organic results that
// actually answer the question were dropped. Passing the answer box, the top
// organic snippets, AND the knowledge graph — clearly labeled — lets the model
// judge relevance and pick the part that answers the question (or recognize that
// none does, instead of confidently using a wrong entity).
function extractSearchSummary(data: SerpApiResponse): string {
  const sections: string[] = [];

  const answerBox = data.answer_box;
  if (answerBox) {
    const direct =
      answerBox.answer?.trim() ||
      answerBox.snippet?.trim() ||
      (answerBox.snippet_highlighted_words?.length
        ? answerBox.snippet_highlighted_words.join(", ")
        : undefined) ||
      (answerBox.list?.length ? answerBox.list.join("; ") : undefined) ||
      answerBox.title?.trim();
    if (direct) sections.push(`Featured answer: ${direct}`);
  }

  const snippets = (data.organic_results ?? [])
    .slice(0, 5)
    .map((result) => result.snippet?.trim())
    .filter((snippet): snippet is string => !!snippet);
  if (snippets.length) {
    sections.push(`Top results:\n${snippets.join("\n")}`);
  }

  const kg = data.knowledge_graph;
  if (kg) {
    const parts = [kg.title?.trim(), kg.type?.trim(), kg.description?.trim()].filter(
      (part): part is string => !!part
    );
    if (parts.length) sections.push(`Knowledge graph: ${parts.join(" — ")}`);
  }

  return sections.length
    ? sections.join("\n\n")
    : "No relevant search results found.";
}

export const toolImplementations = {
  search_web: async ({ query }: { query: string }) => {
    try {
      const apiKey = process.env.SERPAPI_KEY!;
      // `no_cache=true` forces a fresh fetch — SerpAPI serves cached results by
      // default, which surfaced as stale "current" info (e.g. a weeks-old weather
      // alert presented as today's). `gl`/`hl`/`google_domain` pin a consistent
      // US/English locale so results don't drift by request. (no_cache costs an
      // extra credit and adds latency; acceptable for correctness on a live query.)
      const params = new URLSearchParams({
        q: query,
        api_key: apiKey,
        gl: "us",
        hl: "en",
        google_domain: "google.com",
        no_cache: "true",
      });
      const url = `https://serpapi.com/search.json?${params.toString()}`;

      const res = await axiosInstance.get(url);
      return extractSearchSummary(res.data as SerpApiResponse);
    } catch (error) {
      logger.logError(error, {
        method: "TOOL: search-web",
        path: "tool calling",
        duration: 0,
        status: 0,
        service: "INTERNAL",
      });
      return "Unable to search the web at this time.";
    }
  },
  get_time_in_timezone: async (params: { timezone: string }) => {
    try {
      return new Date().toLocaleString("en-US", { timeZone: params.timezone });
    } catch (error) {
      return `Error: Invalid timezone "${params.timezone}"`;
    }
  },
};
