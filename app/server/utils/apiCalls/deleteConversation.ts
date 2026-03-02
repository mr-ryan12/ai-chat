// Server
import { prisma } from "../../db.server";

// Utils
import { logger } from "../logger";

export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<{ success: true }> {
  try {
    // Delete all messages in the conversation first (due to foreign key constraint)
    await prisma.message.deleteMany({
      where: {
        conversationId: conversationId,
      },
    });

    // Then delete the conversation, scoped to userId for security
    const result = await prisma.conversation.deleteMany({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (result.count === 0) {
      throw new Error("Conversation not found or does not belong to user");
    }

    return { success: true as const };
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: `/delete-conversation/${conversationId}`,
      method: "DELETE",
    });
    throw new Error("Failed to delete conversation");
  }
}
