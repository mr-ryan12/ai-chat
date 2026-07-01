// Shape of a document as shown in the document manager UI.
// createdAt is a string because it crosses the JSON loader boundary.
export interface DocumentListItem {
  id: string;
  title: string | null;
  createdAt: string;
  conversationId: string | null;
}
