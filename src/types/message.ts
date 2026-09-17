export interface ChatMessage {
  id: string;
  conversationId: string;
  threadId?: string;
  senderId: string;
  senderName?: string;
  text?: string;
  imageUrl?: string | null;
  imageKey?: string | null;
  createdAt: number;
  read?: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

