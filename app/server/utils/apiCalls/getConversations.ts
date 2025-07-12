// Server
import { prisma } from "../../db.server";
import { logger } from "../logger";

export async function getConversations() {
  try {
    const conversations = await prisma.conversation.findMany({
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
