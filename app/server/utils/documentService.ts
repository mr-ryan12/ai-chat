// Packages
import { prisma } from "~/server/db.server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";

// Types
import { DocumentChunk } from "~/types/documentChunk.types";

const embeddings = new OpenAIEmbeddings();

export async function ingestDocument(
  filePath: string,
  metadata: Record<string, unknown> = {}
) {
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
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "Document" (id, title, embedding, metadata)
    VALUES ($1, $2, $3::vector, $4::jsonb)
    `,
    documentId,
    metadata.title || filePath,
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

export async function queryDocuments(query: string): Promise<string> {
  // Generate embedding for the query
  const queryEmbedding = await embeddings.embedQuery(query);

  // Find similar chunks using vector similarity search
  const chunks = await prisma.$queryRaw<DocumentChunk[]>`
    SELECT content, embedding <-> ${queryEmbedding}::vector as distance
    FROM "DocumentChunk"
    ORDER BY distance ASC
    LIMIT 3
  `;

  // Format the response
  if (chunks.length === 0) {
    return "I couldn't find any relevant content in the documents.";
  }

  return chunks.map((chunk) => chunk.content).join("\n\n");
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
