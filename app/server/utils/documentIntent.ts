// Intent detection for document retrieval routing.
// These helpers decide (1) whether a message should pull document context at all,
// (2) whether the user is pointing at a specific / just-uploaded document, and
// (3) whether they want the whole document rather than a semantic slice.

const DOCUMENT_KEYWORDS = [
  "document",
  "doc",
  "file",
  "pdf",
  "resume",
  "cv",
  "upload",
  "attachment",
  "text",
  "content",
];

const SPECIFIC_DOCUMENT_PATTERNS: RegExp[] = [
  /\b(just|recently) uploaded\b/,
  /\bi (just |recently )?uploaded\b/,
  /\bthis (document|doc|file|pdf|resume|cv|upload)\b/,
  /\bthat (document|doc|file|pdf|resume|cv|upload)\b/,
  /\bthe (document|doc|file|pdf|resume|cv) i\b/,
  /\bthe (upload|attachment)\b/,
  /\bmy (recent|latest|last) (upload|document|doc|file|resume|cv)\b/,
  /\b(most )?recent(ly)? (uploaded )?(document|doc|file|upload)\b/,
  /\blatest (document|doc|file|upload)\b/,
  /\bthe file i\b/,
];

const FULL_DOCUMENT_PATTERNS: RegExp[] = [
  /\bsummar(y|ize|ise|isation|ization)\b/,
  /\boverview\b/,
  /\btl;?dr\b/,
  /\bwhat('?s| is| does| are)\b.*\b(in|about|say)\b/,
  /\bwhole (document|doc|file)\b/,
  /\bentire (document|doc|file)\b/,
  /\b(key|main) (points|takeaways|ideas)\b/,
  /\bgist\b/,
];

// Broadened replacement for the old three-keyword gate: any document reference,
// including phrases like "the one I just uploaded", should route to retrieval.
export function wantsDocumentContext(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    DOCUMENT_KEYWORDS.some((keyword) => normalized.includes(keyword)) ||
    referencesSpecificDocument(message)
  );
}

// True when the user is pointing at a particular / recently uploaded document
// rather than asking a general question that happens to mention documents.
export function referencesSpecificDocument(message: string): boolean {
  const normalized = message.toLowerCase();
  return SPECIFIC_DOCUMENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

// True when the user wants the document as a whole (summary/overview) rather than
// a targeted lookup — this should return chunks in reading order, not by similarity.
export function wantsFullDocument(message: string): boolean {
  const normalized = message.toLowerCase();
  return FULL_DOCUMENT_PATTERNS.some((pattern) => pattern.test(normalized));
}
