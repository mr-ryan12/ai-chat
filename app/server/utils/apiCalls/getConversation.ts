// Server
import { prisma } from "../../db.server";
import { logger } from "../logger";

export async function getConversation(id?: string) {
  try {
    if (id) {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: { messages: true },
      });

      // If conversation doesn't exist, create a new one
      if (!conversation) {
        console.log(
          `Conversation with id ${id} not found, creating new conversation`
        );
        const newConversation = await prisma.conversation.create({
          data: {},
          include: { messages: true },
        });
        return newConversation;
      }

      return conversation;
    }

    // If no id provided, create a new conversation
    const newConversation = await prisma.conversation.create({
      data: {},
      include: { messages: true },
    });
    return newConversation;
  } catch (error) {
    console.error("Error in getConversation:", error);
    logger.logError(error, { duration: 0, path: "/", method: "GET" });
    throw error;
  }
}
