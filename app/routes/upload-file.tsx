import { json } from "@remix-run/node";
import fs from "fs/promises";
import path from "path";

import { ingestDocument } from "../server/utils/documentService";
import { logger } from "../server/utils/logger";
import type { ActionFunctionArgs } from "@remix-run/node";
import { extractTextFromFile } from "../utils/extractTextFromFile";

export const action = async ({ request }: ActionFunctionArgs) => {
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
      return json({ error: "No file uploaded" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalname = file.name;
    const mimetype = file.type;

    let text = await extractTextFromFile({
      buffer,
      filename: originalname,
      mimetype,
    });

    // Save text to temp file
    const tempTextPath = path.join("/tmp", `${originalname}.txt`);
    await fs.writeFile(tempTextPath, text, "utf-8");
    await ingestDocument(tempTextPath);
    await fs.unlink(tempTextPath);

    logger.logRequest({
      method: request.method,
      path: "/upload-file",
      duration: 0,
      status: 200,
      service: "INTERNAL",
    });

    return json({ success: true });
  } catch (error) {
    logger.logError(error, {
      method: request.method,
      path: "/upload-file",
      duration: 0,
      status: 500,
      service: "INTERNAL",
    });
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

export default function UploadFile() {
  return null;
}

// TypeScript module declarations for missing types
// Remove if you add @types/pdf-parse or @types/mammoth in the future
// declare module "pdf-parse";
// declare module "mammoth";
