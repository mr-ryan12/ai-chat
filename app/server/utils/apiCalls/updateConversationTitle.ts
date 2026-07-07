// Server
import { prisma } from "../../db.server";

// Utils
import { logger } from "../logger";
import { generateConversationTitle } from "../generateConversationTitle";

export async function updateConversationTitle(conversationId: string, userId: string) {
  try {
    // Verify the conversation belongs to the authenticated user
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      return;
    }

    // Get the first user message to generate a title
    const firstMessage = await prisma.message.findFirst({
      where: {
        conversationId,
        role: "user",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!firstMessage) {
      return;
    }

    // Summarize the first user message into a short title (falls back to a
    // deterministic truncation internally if the model call fails).
    const title = await generateConversationTitle(firstMessage.content);

    // Update the conversation title — scoped to user via the verified lookup above
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  } catch (error) {
    logger.logError(error);
  }
}
