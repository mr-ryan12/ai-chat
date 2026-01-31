import { data, type ActionFunctionArgs } from "@remix-run/node";
import { deleteConversation } from "~/server/utils/apiCalls/deleteConversation";
import { logger } from "~/server/utils/logger";

export async function action({ request, params }: ActionFunctionArgs) {
  const conversationId = params.id;

  if (!conversationId) {
    return data({ error: "Conversation ID is required" }, { status: 400 });
  }

  if (request.method !== "DELETE") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    await deleteConversation(conversationId);
    return data({ success: true });
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: `/api/conversation/${conversationId}/delete`,
      method: "DELETE",
    });
    return data({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
