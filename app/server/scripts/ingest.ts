import { ingestDocument } from "../services/documentService";

async function main() {
  try {
    await ingestDocument("documents/hello_world.txt");
    console.log("Document ingested successfully!");
  } catch (error) {
    console.error("Error ingesting document:", error);
  }
}

main();
