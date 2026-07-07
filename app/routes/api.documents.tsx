// Packages
import { data, LoaderFunctionArgs } from "@remix-run/node";

// Utils
import { logger } from "~/server/utils/logger";
import { requireAuth } from "~/utils/auth.server";
import { getDocuments } from "~/server/utils/apiCalls/getDocuments";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuth(request);

  try {
    const documents = await getDocuments(userId);
    return data({ documents });
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: "/api/documents",
      method: "GET",
    });
    return data({ documents: [], error: "Failed to load documents" }, { status: 500 });
  }
}
