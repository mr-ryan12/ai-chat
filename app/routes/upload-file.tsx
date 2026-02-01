// Packages
import { data, ActionFunctionArgs } from "@remix-run/node";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Utils
import { ingestDocument } from "../server/utils/documentService";
import { logger } from "../server/utils/logger";
import { requireAuth } from "~/utils/auth.server";
import { extractTextFromFile } from "../utils/extractTextFromFile";

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAuth(request);

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

    if (!file) {
      logger.logError("No file uploaded", {
        method: request.method,
        path: "/upload-file",
        duration: 0,
        status: 400,
        service: "INTERNAL",
      });
      return data({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalname = file.name;
    const mimetype = file.type;

    const text = await extractTextFromFile({
      buffer,
      filename: originalname,
      mimetype,
    });

    // Generate secure filename to prevent path traversal
    const safeFilename = crypto.randomUUID() + ".txt";
    const tempTextPath = path.join("/tmp", safeFilename);

    try {
      await fs.writeFile(tempTextPath, text, "utf-8");
      await ingestDocument(tempTextPath);
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

    return data({ success: true });
  } catch (error) {
    logger.logError(error, {
      method: request.method,
      path: "/upload-file",
      duration: 0,
      status: 500,
      service: "INTERNAL",
    });
    return data(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
};

export default function UploadFile() {
  return null;
}
