// Packages
import { prisma } from "~/server/db.server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";

// Utils
import {
  referencesSpecificDocument,
  wantsFullDocument,
} from "~/server/utils/documentIntent";

// Types
import { DocumentChunk } from "~/types/documentChunk.types";

const embeddings = new OpenAIEmbeddings();

// Retrieval limits. MAX_CHUNKS_PER_QUERY is the hard cap required by the DB rules (≤ 10).
const MAX_CHUNKS_PER_QUERY = 10;
const SEMANTIC_TOP_K = 5;
const DISTANCE_THRESHOLD = 0.85;
const NO_CONTENT_MESSAGE =
  "I couldn't find any relevant content in the documents.";

export async function ingestDocument(
  filePath: string,
  userId: string,
  metadata: Record<string, unknown> = {},
  conversationId: string | null = null
): Promise<void> {
  // Read the document
  const text = await fs.readFile(filePath, "utf-8");

  // Hierarchical chunking (by markdown headings, can be customized)
  const splitter = new MarkdownTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docs = await splitter.createDocuments([text]);

  // Compute document-level embedding (e.g., first 2000 chars or mean of chunk embeddings)
  const docEmbedding = await embeddings.embedQuery(text.slice(0, 2000));

  // Store document record
  const documentId = uuid();
  const contentHash = typeof metadata.contentHash === "string" ? metadata.contentHash : null;
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "Document" (id, title, "userId", "conversationId", "contentHash", embedding, metadata)
    VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb)
    `,
    documentId,
    metadata.title || filePath,
    userId,
    conversationId,
    contentHash,
    docEmbedding,
    JSON.stringify(metadata)
  );

  // Process each chunk
  let orderInDoc = 0;
  for (const doc of docs) {
    // Generate embedding for the chunk
    const embedding = await embeddings.embedQuery(doc.pageContent);
    // Extract section/page from metadata if available
    const section = doc.metadata?.heading || null;
    const page = doc.metadata?.page || null;
    // Store in database
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, section, page, "orderInDoc", metadata, "createdAt")
      VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8::jsonb, $9)
      `,
      uuid(),
      documentId,
      doc.pageContent,
      embedding,
      section,
      page,
      orderInDoc++,
      JSON.stringify(doc.metadata || {}),
      new Date()
    );
  }
}

export async function queryDocuments(
  query: string,
  userId: string,
  conversationId?: string
): Promise<string> {
  const queryEmbedding = await embeddings.embedQuery(query);

  // Layered routing: figure out whether the user is pointing at one specific
  // document ("the doc I just uploaded") before falling back to corpus-wide search.
  const targetDocumentId = await resolveTargetDocumentId(
    userId,
    query,
    conversationId
  );

  let chunks: DocumentChunk[];
  if (targetDocumentId) {
    // Scope retrieval to the document the user is referring to. For whole-document
    // intents (summaries) return chunks in reading order; otherwise rank by similarity.
    chunks = wantsFullDocument(query)
      ? await getDocumentChunksInOrder(targetDocumentId, MAX_CHUNKS_PER_QUERY)
      : await getSimilarChunksInDocument(
          targetDocumentId,
          queryEmbedding,
          SEMANTIC_TOP_K
        );
  } else {
    // No specific target — search across all of the user's documents.
    chunks = await getSimilarChunksForUser(
      userId,
      queryEmbedding,
      SEMANTIC_TOP_K
    );
  }

  const topChunks = chunks.slice(0, MAX_CHUNKS_PER_QUERY);
  if (topChunks.length === 0) {
    return NO_CONTENT_MESSAGE;
  }

  return topChunks.map((chunk) => chunk.content).join("\n\n");
}

// Resolve which single document (if any) the user is asking about.
// Priority: (1) the current conversation's most recent upload, (2) the user's most
// recent upload overall when they reference a specific/just-uploaded doc, else null.
async function resolveTargetDocumentId(
  userId: string,
  query: string,
  conversationId?: string
): Promise<string | null> {
  if (conversationId) {
    const conversationDoc = await prisma.document.findFirst({
      where: { userId, conversationId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (conversationDoc) {
      return conversationDoc.id;
    }
  }

  if (referencesSpecificDocument(query)) {
    const recentDoc = await prisma.document.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return recentDoc?.id ?? null;
  }

  return null;
}

// Chunks of a single document in reading order — used for whole-document summaries.
async function getDocumentChunksInOrder(
  documentId: string,
  limit: number
): Promise<DocumentChunk[]> {
  return prisma.$queryRaw<DocumentChunk[]>`
    SELECT content, "orderInDoc"
    FROM "DocumentChunk"
    WHERE "documentId" = ${documentId}
    ORDER BY "orderInDoc" ASC NULLS LAST
    LIMIT ${limit}
  `;
}

// Most similar chunks within a single, already-targeted document.
async function getSimilarChunksInDocument(
  documentId: string,
  queryEmbedding: number[],
  limit: number
): Promise<DocumentChunk[]> {
  const chunks = await prisma.$queryRaw<DocumentChunk[]>`
    SELECT DISTINCT ON (dc.content) dc.content, dc.embedding <-> ${queryEmbedding}::vector AS distance
    FROM "DocumentChunk" dc
    WHERE dc."documentId" = ${documentId}
    ORDER BY dc.content, distance ASC
  `;

  chunks.sort((a, b) => (a?.distance || 0) - (b?.distance || 0));
  return chunks.slice(0, limit);
}

// Corpus-wide semantic search scoped to the authenticated user (fallback path).
// DISTINCT ON (content) prevents duplicate chunks from multiple ingestions.
async function getSimilarChunksForUser(
  userId: string,
  queryEmbedding: number[],
  limit: number
): Promise<DocumentChunk[]> {
  const chunks = await prisma.$queryRaw<DocumentChunk[]>`
    SELECT DISTINCT ON (dc.content) dc.content, dc.embedding <-> ${queryEmbedding}::vector AS distance
    FROM "DocumentChunk" dc
    JOIN "Document" d ON dc."documentId" = d.id
    WHERE d."userId" = ${userId}
      AND dc.embedding <-> ${queryEmbedding}::vector < ${DISTANCE_THRESHOLD}
    ORDER BY dc.content, distance ASC
  `;

  chunks.sort((a, b) => (a?.distance || 0) - (b?.distance || 0));
  return chunks.slice(0, limit);
}

// HybridRetriever stub for agentic retrieval
export class HybridRetriever {
  async getRelevantDocuments(): Promise<DocumentChunk[]> {
    // 1. Embed query
    // 2. Run hybrid search (vector + FTS + metadata)
    // 3. Group/merge chunks (by section/page/order)
    // 4. Return as DocumentChunk[]
    // TODO: Integrate ANN vector DB for large scale (e.g., Pinecone, Weaviate)
    // TODO: Integrate agentic tools and executor here
    return [];
  }
}
