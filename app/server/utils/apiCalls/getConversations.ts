// Server
import { prisma } from "../../db.server";

// Utils
import { logger } from "../logger";

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || "New Conversation",
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: conv._count.messages,
    }));
  } catch (error) {
    console.error("Error in getConversations:", error);
    logger.logError(error, {
      duration: 0,
      path: "/conversations",
      method: "GET",
    });
    return [];
  }
}
