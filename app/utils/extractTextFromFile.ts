import pdfParse from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extract raw text from a PDF, DOCX, or TXT file.
 * @param buffer - The uploaded file's buffer
 * @param filename - The original file name
 * @param mimetype - The file MIME type
 * @returns A string of extracted plain text
 */
export async function extractTextFromFile({
  buffer,
  filename,
  mimetype,
}: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}): Promise<string> {
  // 📄 PDF
  if (mimetype === "application/pdf" || filename.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  // 📝 DOCX
  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  // 📃 TXT fallback
  if (mimetype === "text/plain" || filename.endsWith(".txt")) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error("Unsupported file type");
}
