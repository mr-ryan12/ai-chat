// Server
import { prisma } from "../../db.server";

// Types
import type { DocumentListItem } from "~/types/document.types";

// List the authenticated user's uploaded documents, newest first.
export async function getDocuments(userId: string): Promise<DocumentListItem[]> {
  const documents = await prisma.document.findMany({
    where: { userId },
    select: { id: true, title: true, createdAt: true, conversationId: true },
    orderBy: { createdAt: "desc" },
  });

  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    createdAt: document.createdAt.toISOString(),
    conversationId: document.conversationId,
  }));
}
