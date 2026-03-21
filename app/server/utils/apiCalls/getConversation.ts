// Server
import { prisma } from "../../db.server";
import type { Conversation, Message } from "@prisma/client";

// Utils
import { logger } from "../logger";

type ConversationWithMessages = Conversation & { messages: Message[] };

export async function getConversation(
  id: string | undefined,
  userId: string
): Promise<ConversationWithMessages | null> {
  try {
    if (id) {
      const conversation = await prisma.conversation.findFirst({
        where: { id, userId },
        include: { messages: true },
      });

      // Return null if conversation doesn't exist instead of creating a new one
      if (!conversation) {
        logger.logRequest({ method: "GET", path: `/conversation/${id}`, duration: 0, status: 404 });
        return null;
      }

      return conversation;
    }

    // If no id provided, return null (don't auto-create)
    return null;
  } catch (error) {
    logger.logError(error);
    throw error;
  }
}

// Separate function for creating new conversations
export async function createNewConversation(
  userId: string
): Promise<ConversationWithMessages> {
  try {
    const newConversation = await prisma.conversation.create({
      data: { userId },
      include: { messages: true },
    });
    return newConversation;
  } catch (error) {
    logger.logError(error);
    throw error;
  }
}
