import { logger } from "./logger";
import { axiosInstance } from "./axios";

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

export const toolImplementations = {
  search_web: async ({ query }: { query: string }) => {
    try {
      const apiKey = process.env.SERPAPI_KEY!;
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
        query
      )}&api_key=${apiKey}`;

      const res = await axiosInstance.get(url);
      const data = res.data;

      if (data.organic_results?.length) {
        return data.organic_results[0].snippet || "No summary available.";
      } else {
        return "No relevant search results found.";
      }
    } catch (error) {
      logger.logError(error);
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
