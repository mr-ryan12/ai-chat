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

// Get-or-create a conversation for a client-provided id, scoped to the user.
// This lets an upload and the first message agree on the same id up front, so a
// Document is always linked to a real Conversation at write time (no orphans).
export async function ensureConversation(
  id: string,
  userId: string,
  title?: string
): Promise<ConversationWithMessages> {
  try {
    const existing = await prisma.conversation.findFirst({
      where: { id, userId },
      include: { messages: true },
    });
    if (existing) {
      return existing;
    }

    return await prisma.conversation.create({
      data: { id, userId, title },
      include: { messages: true },
    });
  } catch (error) {
    // A concurrent request may have created it first; re-fetch within this user's
    // scope. If the id exists but isn't owned by this user, the re-fetch is empty
    // and we rethrow — a user can never attach to another user's conversation.
    const conflict = await prisma.conversation.findFirst({
      where: { id, userId },
      include: { messages: true },
    });
    if (conflict) {
      return conflict;
    }
    logger.logError(error);
    throw error;
  }
}
