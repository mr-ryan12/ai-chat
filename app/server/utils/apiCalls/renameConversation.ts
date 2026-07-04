// Server
import { prisma } from "../../db.server";

// Utils
import { logger } from "../logger";

// Bound the stored title so a pasted blob can't blow up the column or the sidebar.
const MAX_TITLE_LENGTH = 100;

export async function renameConversation(
  conversationId: string,
  userId: string,
  rawTitle: string,
): Promise<{ success: true; title: string }> {
  const title = rawTitle.trim();
  if (!title) {
    throw new Error("Title is required");
  }
  const boundedTitle =
    title.length > MAX_TITLE_LENGTH
      ? title.substring(0, MAX_TITLE_LENGTH)
      : title;

  // Verify ownership before mutating (tenant isolation). Done outside the try so a
  // "not found" propagates and the route can map it to a 404.
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found or does not belong to user");
  }

  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: boundedTitle },
    });

    return { success: true, title: boundedTitle };
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: `/rename-conversation/${conversationId}`,
      method: "PATCH",
    });
    throw new Error("Failed to rename conversation");
  }
}
