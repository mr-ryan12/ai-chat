// TODO: Remove this script — it was created only to test document ingestion manually
// and has been superseded by the upload-file route which handles user-scoped ingestion.
import { ingestDocument } from "~/server/utils/documentService";

async function main(): Promise<void> {
  const userId = process.env.INGEST_USER_ID;

  if (!userId) {
    console.error(
      "INGEST_USER_ID environment variable is required.\n" +
        "Usage: INGEST_USER_ID=<user-id> yarn run:ingest"
    );
    process.exit(1);
  }

  try {
    await ingestDocument("documents/hello_world.txt", userId);
    console.log("Document ingested successfully!");
  } catch (error) {
    console.error("Error ingesting document:", error);
    process.exit(1);
  }
}

main();
