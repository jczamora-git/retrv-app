export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  parentCommentId?: string | null;
  rootCommentId?: string | null;
  clientRequestId?: string;
  client_request_id?: string;
  status?: 'sending' | 'sent' | 'failed';
}

