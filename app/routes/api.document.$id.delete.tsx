// Packages
import { data, ActionFunctionArgs } from "@remix-run/node";

// Utils
import { logger } from "~/server/utils/logger";
import { requireAuth } from "~/utils/auth.server";
import { deleteDocument } from "~/server/utils/apiCalls/deleteDocument";

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireAuth(request);

  const documentId = params.id;

  if (!documentId) {
    return data({ error: "Document ID is required" }, { status: 400 });
  }

  if (request.method !== "DELETE") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    await deleteDocument(documentId, userId);
    return data({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      return data({ error: "Document not found" }, { status: 404 });
    }
    logger.logError(error, {
      duration: 0,
      path: `/api/document/${documentId}/delete`,
      method: "DELETE",
    });
    return data({ error: "Failed to delete document" }, { status: 500 });
  }
}
