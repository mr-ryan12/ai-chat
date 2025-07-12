// Server
import { prisma } from "../../db.server";
import { logger } from "../logger";

export async function deleteConversation(conversationId: string) {
  try {
    // Delete all messages in the conversation first (due to foreign key constraint)
    await prisma.message.deleteMany({
      where: {
        conversationId: conversationId,
      },
    });

    // Then delete the conversation
    await prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    return { success: true };
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: `/delete-conversation/${conversationId}`,
      method: "DELETE",
    });
    throw new Error("Failed to delete conversation");
  }
}
