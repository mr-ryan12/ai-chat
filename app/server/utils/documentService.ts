// Packages
import { Prisma } from "@prisma/client";
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
import { logger } from "~/server/utils/logger";

// Packages (node)
import { randomUUID } from "crypto";

// Types
import { DocumentChunk } from "~/types/documentChunk.types";

// text-embedding-3-small: 1536 dims (matches the vector(1536) column), a quality
// upgrade over the old ada-002 default at ~5x lower cost.
const EMBEDDING_MODEL = "text-embedding-3-small";
const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL });

// Retrieval limits. MAX_CHUNKS_PER_QUERY is the hard cap required by the DB rules (≤ 10).
const MAX_CHUNKS_PER_QUERY = 10;
const SEMANTIC_TOP_K = 5;
// Candidate pool pulled from each retriever before fusion.
const HYBRID_CANDIDATE_POOL = 20;
// RRF constant — dampens the weight of top ranks so lower ranks still contribute.
const RRF_K = 60;
// Relevance floor for corpus-wide vector search (L2 distance via the `<->` operator).
const VECTOR_DISTANCE_THRESHOLD = 0.85;
// Hard ceiling on injected document context (chat-responses.md). Token count is
// estimated (~chars/token) to stay dependency-free — a guardrail, not a billing meter.
const MAX_CONTEXT_TOKENS = 3000;
const CHARS_PER_TOKEN = 4;
const NO_CONTENT_MESSAGE =
  "I couldn't find any relevant content in the documents.";

interface RankedChunk {
  id: string;
  content: string;
}

interface RetrievalScope {
  userId: string;
  documentId?: string;
}

// Combine ranked lists by Reciprocal Rank Fusion: each list contributes 1/(k+rank)
// to a chunk's score, so chunks ranked highly by several retrievers rise to the top —
// without normalizing the incomparable score scales of vector distance vs. ts_rank.
function reciprocalRankFusion(
  rankedLists: RankedChunk[][],
  k: number,
  limit: number
): RankedChunk[] {
  const scores = new Map<string, { content: string; score: number }>();
  for (const list of rankedLists) {
    list.forEach((chunk, index) => {
      const contribution = 1 / (k + index + 1);
      const existing = scores.get(chunk.id);
      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(chunk.id, { content: chunk.content, score: contribution });
      }
    });
  }

  return [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([id, { content }]) => ({ id, content }));
}

// Hybrid retrieval: pgvector similarity + Postgres full-text search, fused with RRF
// and scoped to the authenticated user (and optionally a single document).
export class HybridRetriever {
  constructor(private readonly embeddings: OpenAIEmbeddings) {}

  async retrieve(
    query: string,
    scope: RetrievalScope,
    limit: number
  ): Promise<RankedChunk[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    const poolSize = Math.max(limit, HYBRID_CANDIDATE_POOL);

    const [vectorHits, fullTextHits] = await Promise.all([
      this.vectorSearch(queryEmbedding, scope, poolSize),
      this.fullTextSearch(query, scope, poolSize),
    ]);

    return reciprocalRankFusion([vectorHits, fullTextHits], RRF_K, limit);
  }

  private scopeFilter(scope: RetrievalScope): Prisma.Sql {
    return scope.documentId
      ? Prisma.sql`AND dc."documentId" = ${scope.documentId}`
      : Prisma.empty;
  }

  private vectorSearch(
    queryEmbedding: number[],
    scope: RetrievalScope,
    limit: number
  ): Promise<RankedChunk[]> {
    // Apply a relevance floor for corpus-wide search so unrelated documents are
    // excluded (and a truly-empty result can surface the no-content message). When a
    // specific document is already targeted, return its best chunks without a floor.
    const relevanceFloor = scope.documentId
      ? Prisma.empty
      : Prisma.sql`AND dc.embedding <-> ${queryEmbedding}::vector < ${VECTOR_DISTANCE_THRESHOLD}`;

    return prisma.$queryRaw<RankedChunk[]>(Prisma.sql`
      SELECT dc.id, dc.content
      FROM "DocumentChunk" dc
      JOIN "Document" d ON dc."documentId" = d.id
      WHERE d."userId" = ${scope.userId} ${this.scopeFilter(scope)} ${relevanceFloor}
      ORDER BY dc.embedding <-> ${queryEmbedding}::vector ASC
      LIMIT ${limit}
    `);
  }

  private fullTextSearch(
    query: string,
    scope: RetrievalScope,
    limit: number
  ): Promise<RankedChunk[]> {
    return prisma.$queryRaw<RankedChunk[]>(Prisma.sql`
      SELECT dc.id, dc.content
      FROM "DocumentChunk" dc
      JOIN "Document" d ON dc."documentId" = d.id
      WHERE d."userId" = ${scope.userId} ${this.scopeFilter(scope)}
        AND dc.fts @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(dc.fts, plainto_tsquery('english', ${query})) DESC
      LIMIT ${limit}
    `);
  }
}

const hybridRetriever = new HybridRetriever(embeddings);

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

  // Process each chunk. DocumentChunk.fts is a generated column (to_tsvector on
  // content), so no full-text column needs to be written here.
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
  // Layered routing: figure out whether the user is pointing at one specific
  // document ("the doc I just uploaded") before falling back to corpus-wide search.
  const targetDocumentId = await resolveTargetDocumentId(
    userId,
    query,
    conversationId
  );

  let chunks: { content: string }[];
  if (targetDocumentId && wantsFullDocument(query)) {
    // Whole-document intent (summary): return the target doc's chunks in reading order.
    chunks = await getDocumentChunksInOrder(targetDocumentId, MAX_CHUNKS_PER_QUERY);
  } else {
    // Hybrid search — scoped to the target document when one was resolved, else
    // across all of the user's documents.
    chunks = await hybridRetriever.retrieve(
      query,
      { userId, documentId: targetDocumentId ?? undefined },
      SEMANTIC_TOP_K
    );
  }

  const topChunks = chunks.slice(0, MAX_CHUNKS_PER_QUERY);
  if (topChunks.length === 0) {
    return NO_CONTENT_MESSAGE;
  }

  const context = topChunks.map((chunk) => chunk.content).join("\n\n");
  return enforceContextBudget(context, userId);
}

// Enforce the MAX_CONTEXT_TOKENS ceiling on injected context. Truncates
// deterministically and logs a cost-limit event — never trims silently.
function enforceContextBudget(context: string, userId: string): string {
  const maxChars = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;
  if (context.length <= maxChars) {
    return context;
  }

  logger.logCostLimit({
    correlationId: randomUUID(),
    userId,
    limitTokens: MAX_CONTEXT_TOKENS,
    estimatedTokens: Math.ceil(context.length / CHARS_PER_TOKEN),
  });

  const notice = "\n\n[Context truncated to fit the token budget.]";
  return context.slice(0, maxChars - notice.length) + notice;
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
