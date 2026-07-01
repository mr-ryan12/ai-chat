// Server
import { prisma } from "../../db.server";

// Utils
import { logger } from "../logger";

export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<{ success: true }> {
  // Verify ownership before deleting anything (tenant isolation). Done outside the
  // try so a "not found" propagates and the route can map it to a 404.
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found or does not belong to user");
  }

  try {
    // Delete the conversation's messages and the conversation itself, atomically.
    // Documents uploaded here are NOT deleted — they belong to the user's library.
    // The `Document.conversationId` FK is `ON DELETE SET NULL`, so removing the
    // conversation simply detaches them (see docs/fix-doc-context/plan.md, D3).
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversationId } }),
      prisma.conversation.deleteMany({ where: { id: conversationId, userId } }),
    ]);

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
