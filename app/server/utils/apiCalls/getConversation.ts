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

      // Return null if conversation doesn't exist instead of creating a new one
      if (!conversation) {
        console.log(`Conversation with id ${id} not found`);
        return null;
      }

      return conversation;
    }

    // If no id provided, return null (don't auto-create)
    return null;
  } catch (error) {
    console.error("Error in getConversation:", error);
    logger.logError(error, { duration: 0, path: "/", method: "GET" });
    throw error;
  }
}

// Separate function for creating new conversations
export async function createNewConversation() {
  try {
    const newConversation = await prisma.conversation.create({
      data: {},
      include: { messages: true },
    });
    return newConversation;
  } catch (error) {
    console.error("Error creating new conversation:", error);
    logger.logError(error, { duration: 0, path: "/", method: "POST" });
    throw error;
  }
}
