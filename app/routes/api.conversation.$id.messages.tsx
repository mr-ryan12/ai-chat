import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "~/server/db.server";
import { logger } from "~/server/utils/logger";

export async function loader({ params }: LoaderFunctionArgs) {
  const conversationId = params.id;

  if (!conversationId) {
    return json({ error: "Conversation ID is required" }, { status: 400 });
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        content: true,
        role: true,
        createdAt: true,
      },
    });

    return json({ messages });
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: `/api/conversation/${conversationId}/messages`,
      method: "GET",
    });
    return json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
