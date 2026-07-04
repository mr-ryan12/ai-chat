// Packages
import { data, ActionFunctionArgs } from "@remix-run/node";

// Utils
import { logger } from "~/server/utils/logger";
import { requireAuth } from "~/utils/auth.server";
import { renameConversation } from "~/server/utils/apiCalls/renameConversation";

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireAuth(request);

  const conversationId = params.id;

  if (!conversationId) {
    return data({ error: "Conversation ID is required" }, { status: 400 });
  }

  if (request.method !== "PATCH" && request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();
  const title = ((formData.get("title") as string | null) ?? "").trim();

  if (!title) {
    return data({ error: "Title is required" }, { status: 400 });
  }

  try {
    const result = await renameConversation(conversationId, userId, title);
    return data({ success: true, title: result.title });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("not found")
    ) {
      return data({ error: "Conversation not found" }, { status: 404 });
    }
    logger.logError(error, {
      duration: 0,
      path: `/api/conversation/${conversationId}/rename`,
      method: request.method,
    });
    return data({ error: "Failed to rename conversation" }, { status: 500 });
  }
}
