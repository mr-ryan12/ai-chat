export interface IDatabaseMessage {
  content: string;
  role: string;
  conversationId: string;
  id: string;
  createdAt: Date;
}
