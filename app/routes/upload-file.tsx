// Packages
import { ActionFunctionArgs } from "@remix-run/node";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Utils
import { ingestDocument } from "../server/utils/documentService";
import { ensureConversation } from "~/server/utils/apiCalls/getConversation";
import { logger } from "../server/utils/logger";
import { requireAuth } from "~/utils/auth.server";
import { extractTextFromFile } from "../utils/extractTextFromFile";
import { prisma } from "~/server/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireAuth(request);

  logger.logRequest({
    method: request.method,
    path: "/upload-file",
    duration: 0,
    status: 0,
    service: "INTERNAL",
  });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationIdInput = formData.get("conversationId");

    if (!file) {
      logger.logError("No file uploaded", {
        method: request.method,
        path: "/upload-file",
        duration: 0,
        status: 400,
        service: "INTERNAL",
      });
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalname = file.name;
    const mimetype = file.type;

    const text = await extractTextFromFile({
      buffer,
      filename: originalname,
      mimetype,
    });

    // Check for duplicate upload via content hash
    const contentHash = crypto.createHash("sha256").update(text).digest("hex");
    const existing = await prisma.document.findFirst({
      where: { userId, contentHash },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { error: "This document has already been uploaded." },
        { status: 409 },
      );
    }

    // Link the upload to its conversation, creating it if this is the first
    // interaction in the session. Done only after validation/dedup so a rejected
    // upload never spawns an empty conversation.
    let conversationId: string | null = null;
    if (typeof conversationIdInput === "string" && conversationIdInput !== "") {
      const conversation = await ensureConversation(
        conversationIdInput,
        userId,
        originalname,
      );
      conversationId = conversation.id;
    }

    // Generate secure filename to prevent path traversal
    const safeFilename = crypto.randomUUID() + ".txt";
    const tempTextPath = path.join("/tmp", safeFilename);

    try {
      await fs.writeFile(tempTextPath, text, "utf-8");
      await ingestDocument(
        tempTextPath,
        userId,
        { title: originalname, contentHash },
        conversationId,
      );
    } finally {
      // Always cleanup temp file
      try {
        await fs.unlink(tempTextPath);
      } catch (unlinkError) {
        logger.logError(unlinkError, {
          method: request.method,
          path: "/upload-file",
          duration: 0,
          status: 500,
          service: "INTERNAL",
        });
      }
    }

    logger.logRequest({
      method: request.method,
      path: "/upload-file",
      duration: 0,
      status: 200,
      service: "INTERNAL",
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.logError(error, {
      method: request.method,
      path: "/upload-file",
      duration: 0,
      status: 500,
      service: "INTERNAL",
    });
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
};
