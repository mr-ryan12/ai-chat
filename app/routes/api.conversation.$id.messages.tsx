// Packages
import { data, LoaderFunctionArgs } from "@remix-run/node";

// Server
import { prisma } from "~/server/db.server";

// Utils
import { logger } from "~/server/utils/logger";
import { requireAuth } from "~/utils/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);

  const conversationId = params.id;

  if (!conversationId) {
    return data({ error: "Conversation ID is required" }, { status: 400 });
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

    return data({ messages });
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: `/api/conversation/${conversationId}/messages`,
      method: "GET",
    });
    return data({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
