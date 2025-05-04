// Packages
import { prisma } from "~/server/db.server";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";

// Types
import { DocumentChunk } from "~/types/documentChunk.types";

const embeddings = new OpenAIEmbeddings();
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export async function ingestDocument(filePath: string) {
  // Read the document
  const text = await fs.readFile(filePath, "utf-8");

  // Split the text into chunks
  const docs = await textSplitter.createDocuments([text]);

  // Process each chunk
  for (const doc of docs) {
    // Generate embedding for the chunk
    const embedding = await embeddings.embedQuery(doc.pageContent);

    // Store in database
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "DocumentChunk" (id, content, embedding, "createdAt")
      VALUES ($1, $2, $3::vector, $4)
    `,
      uuid(),
      doc.pageContent,
      embedding,
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
