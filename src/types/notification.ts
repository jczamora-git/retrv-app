export type NotificationType =
  | 'message'
  | 'comment'
  | 'reply'
  | 'merit'
  | 'merit_awarded'
  | 'resolved_post'
  | 'new_post'
  | 'post_update';

export interface AppNotification {
  id: string;
  userId?: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorUsername?: string;
  actorAvatarUrl?: string | null;
  postId?: string | null;
  postTitle?: string | null;
  commentId?: string | null;
  conversationId?: string | null;
  title: string;
  message: string;
  text?: string;
  createdAt: number;
  read: boolean;
  isRead?: boolean;
}

export interface CreateNotificationParams {
  userId: string;
  actorId?: string | null;
  actorName?: string | null;
  actorUsername?: string | null;
  actorAvatarUrl?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  postId?: string | null;
  postTitle?: string | null;
  conversationId?: string | null;
  commentId?: string | null;
}
