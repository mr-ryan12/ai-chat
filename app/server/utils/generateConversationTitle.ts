// Packages
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Utils
import { logger } from "./logger";

// Cap the stored title. The sidebar CSS-truncates to one line, so this is just a
// sanity bound on what we persist (an ill-behaved model could return a paragraph).
const TITLE_MAX_LENGTH = 60;
// Deterministic fallback length, matching the prior behavior of this feature.
const FALLBACK_MAX_LENGTH = 50;

const TITLE_SYSTEM_PROMPT =
  "You generate short titles for chat conversations. Reply with a concise " +
  "3-6 word title summarizing the user's message. No quotes, no trailing " +
  "punctuation, and no prefixes like 'Title:'.";

// Deterministic fallback used when the model call fails or returns nothing
// usable: the first message hard-truncated (the original title behavior).
function truncateFallback(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > FALLBACK_MAX_LENGTH
    ? trimmed.substring(0, FALLBACK_MAX_LENGTH) + "..."
    : trimmed;
}

// Normalize a raw model title: drop wrapping quotes, trailing punctuation, and
// collapse whitespace, then bound the length. Returns "" if nothing survives.
function sanitizeTitle(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.!?,;:\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.length > TITLE_MAX_LENGTH
    ? cleaned.substring(0, TITLE_MAX_LENGTH).trim() + "..."
    : cleaned;
}

// Generate a short, human-readable conversation title from the first user
// message. Uses a cheap, fast model (titling is trivial — not worth gpt-4) and
// always resolves: any failure or empty/garbled output falls back to a
// deterministic truncation so a conversation is never left untitled.
export async function generateConversationTitle(
  firstMessage: string,
): Promise<string> {
  const fallback = truncateFallback(firstMessage);
  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
      maxTokens: 20,
    });

    const response = await model.invoke([
      new SystemMessage(TITLE_SYSTEM_PROMPT),
      new HumanMessage(firstMessage),
    ]);

    const raw =
      typeof response.content === "string" ? response.content : "";
    const title = sanitizeTitle(raw);
    return title || fallback;
  } catch (error) {
    logger.logError(error);
    return fallback;
  }
}
