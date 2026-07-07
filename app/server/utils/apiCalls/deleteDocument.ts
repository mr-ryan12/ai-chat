// Server
import { prisma } from "../../db.server";

// Utils
import { logger } from "../logger";

export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<{ success: true }> {
  // Verify ownership before deleting anything (tenant isolation).
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true },
  });

  if (!document) {
    // Distinct message so the route can map this to a 404.
    throw new Error("Document not found or does not belong to user");
  }

  try {
    // Remove the document's chunks/embeddings first (FK), then the document itself,
    // atomically — no orphaned chunks are left behind (see database.md).
    await prisma.$transaction([
      prisma.documentChunk.deleteMany({ where: { documentId } }),
      prisma.document.delete({ where: { id: documentId } }),
    ]);

    return { success: true };
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: `/api/document/${documentId}/delete`,
      method: "DELETE",
    });
    throw new Error("Failed to delete document");
  }
}
