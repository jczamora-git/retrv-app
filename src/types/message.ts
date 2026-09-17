export interface ChatMessage {
  id: string;
  conversationId: string;
  threadId?: string;
  postId?: string | null;
  post_id?: string | null;
  thread_id?: string | null;
  senderId: string;
  senderName?: string;
  text?: string;
  imageUrl?: string | null;
  imageKey?: string | null;
  clientRequestId?: string;
  client_request_id?: string;
  createdAt: number;
  read?: boolean;
  status?: 'sending' | 'sent' | 'failed' | 'delivered' | 'read';
}

