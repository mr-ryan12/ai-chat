export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  distance?: number;
  section?: string;
  page?: number;
  orderInDoc?: number;
  metadata?: Record<string, unknown>;
}

export interface Document {
  id: string;
  title?: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}