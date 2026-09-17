import { ref, computed } from 'vue';
import { supabase } from '../utils/supabase';
import { useAuth, sessionUid, getSessionUser, currentAppUserId } from './useAuth';
import type { AppNotification, CreateNotificationParams } from '../types/notification';
import { shouldSendNotification } from './useNotificationPreferences';

const notifications = ref<AppNotification[]>([]);
const loading = ref(false);
let realtimeChannel: any = null;
let currentSubscribedUid: string | null = null;

export const unreadNotificationCount = computed<number>(() => {
  return notifications.value.filter((n) => !n.read && !n.isRead).length;
});

export const mapNotificationRow = (row: any): AppNotification => {
  const textContent = row.message || row.body || row.text || '';
  const isRead = Boolean(row.is_read || row.read);

  return {
    id: String(row.id),
    userId: row.user_id,
    type: row.type || 'comment',
    actorId: row.actor_id || 'anonymous',
    actorName: row.actor_name || 'Community Member',
    actorUsername: row.actor_username,
    actorAvatarUrl: row.actor_avatar_url || null,
    postId: row.post_id,
    postTitle: row.post_title,
    commentId: row.comment_id,
    conversationId: row.conversation_id,
    title: row.title || 'Notification',
    message: textContent,
    text: textContent,
    createdAt: row.created_at
      ? typeof row.created_at === 'number'
        ? row.created_at
        : new Date(row.created_at).getTime()
      : Date.now(),
    read: isRead,
    isRead
  };
};

/**
 * Universal helper to create and insert a notification row into Supabase.
 * Respects recipient preferences and skips self-notifications.
 */
export const createNotification = async (params: CreateNotificationParams): Promise<boolean> => {
  const {
    userId,
    actorId,
    actorName,
    actorUsername,
    actorAvatarUrl,
    type,
    title,
    message,
    postId,
    postTitle,
    conversationId,
    commentId
  } = params;

  // 1. Never notify a user about their own actions
  if (!userId || (actorId && userId === actorId)) {
    return false;
  }

  // 2. Map notification type to preference key and verify recipient allowed it
  let prefKey: 'messages' | 'comments' | 'replies' | 'newPosts' | 'merits' | 'resolvedPosts' | 'postUpdates' = 'comments';
  if (type === 'message') prefKey = 'messages';
  else if (type === 'reply') prefKey = 'replies';
  else if (type === 'merit' || type === 'merit_awarded') prefKey = 'merits';
  else if (type === 'resolved_post') prefKey = 'resolvedPosts';
  else if (type === 'new_post') prefKey = 'newPosts';
  else if (type === 'post_update') prefKey = 'postUpdates';

  const isAllowed = await shouldSendNotification(userId, prefKey);
  if (!isAllowed) {
    return false;
  }

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    id: notifId,
    user_id: userId,
    actor_id: actorId || null,
    actor_name: actorName || 'Community Member',
    actor_username: actorUsername || null,
    actor_avatar_url: actorAvatarUrl || null,
    type,
    title: title.trim(),
    message: message.trim(),
    body: message.trim(),
    post_id: postId || null,
    post_title: postTitle || null,
    conversation_id: conversationId || null,
    comment_id: commentId || null,
    is_read: false,
    read: false,
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase.from('notifications').insert(record);
    if (error) {
      console.warn('[useNotifications] Insert notification warning:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[useNotifications] Insert notification error:', err);
    return false;
  }
};

export function useNotifications() {
  const { currentProfile } = useAuth();

  const sortNotifications = () => {
    notifications.value.sort((a, b) => b.createdAt - a.createdAt);
  };

  const loadNotifications = async (limit = 50) => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid || sessionUid.value;
    if (!myUid) return [];

    loading.value = true;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', myUid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      notifications.value = (data || []).map(mapNotificationRow);
      sortNotifications();
      return notifications.value;
    } catch (err) {
      console.warn('[useNotifications] Load notifications warning:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  const subscribeToNotifications = async () => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid || sessionUid.value;
    if (!myUid) return;

    if (currentSubscribedUid === myUid && realtimeChannel) {
      return;
    }

    await loadNotifications();

    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    currentSubscribedUid = myUid;

    try {
      realtimeChannel = supabase
        .channel(`notifications:${myUid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${myUid}`
          },
          (payload: any) => {
            if (payload.new) {
              const newNotif = mapNotificationRow(payload.new);
              // Deduplicate
              if (!notifications.value.some((n) => n.id === newNotif.id)) {
                notifications.value.unshift(newNotif);
                sortNotifications();
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${myUid}`
          },
          (payload: any) => {
            if (payload.new) {
              const updated = mapNotificationRow(payload.new);
              const idx = notifications.value.findIndex((n) => n.id === updated.id);
              if (idx >= 0) {
                notifications.value[idx] = updated;
              }
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[useNotifications] Realtime channel setup error:', err);
    }
  };

  const unsubscribeFromNotifications = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
      currentSubscribedUid = null;
    }
  };

  const markAsRead = async (notificationId: string) => {
    const myUid = currentAppUserId.value || sessionUid.value;
    const target = notifications.value.find((n) => n.id === notificationId);
    if (target) {
      target.read = true;
      target.isRead = true;
    }

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read: true })
        .eq('id', notificationId)
        .eq('user_id', myUid || target?.userId);
    } catch (err) {
      console.warn('[useNotifications] Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid || sessionUid.value;

    notifications.value.forEach((n) => {
      n.read = true;
      n.isRead = true;
    });

    if (myUid) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true, read: true })
          .eq('user_id', myUid)
          .eq('is_read', false);
      } catch (err) {
        console.warn('[useNotifications] Mark all read error:', err);
      }
    }
  };

  // Specific Action Creators
  const createCommentNotification = async (params: {
    postAuthorId: string;
    postId: string;
    postTitle?: string;
    commentId: string;
    commentText: string;
  }) => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid;
    const myName = currentProfile.value?.name || session?.name || 'Community Member';

    return createNotification({
      userId: params.postAuthorId,
      actorId: myUid,
      actorName: myName,
      actorUsername: currentProfile.value?.username || session?.username,
      actorAvatarUrl: currentProfile.value?.avatarUrl,
      type: 'comment',
      title: 'New comment',
      message: `${myName} commented on your post "${params.postTitle || 'Lost & Found'}".`,
      postId: params.postId,
      postTitle: params.postTitle,
      commentId: params.commentId
    });
  };

  const createReplyNotification = async (params: {
    targetAuthorId: string;
    postId: string;
    postTitle?: string;
    commentId: string;
    replyText: string;
  }) => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid;
    const myName = currentProfile.value?.name || session?.name || 'Community Member';

    return createNotification({
      userId: params.targetAuthorId,
      actorId: myUid,
      actorName: myName,
      actorUsername: currentProfile.value?.username || session?.username,
      actorAvatarUrl: currentProfile.value?.avatarUrl,
      type: 'reply',
      title: 'New reply',
      message: `${myName} replied to your comment on "${params.postTitle || 'a post'}".`,
      postId: params.postId,
      postTitle: params.postTitle,
      commentId: params.commentId
    });
  };

  const createMeritNotification = async (params: {
    recipientId: string;
    postId: string;
    postTitle?: string;
    awardedByName: string;
    meritTitle?: string;
  }) => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid;

    return createNotification({
      userId: params.recipientId,
      actorId: myUid,
      actorName: params.awardedByName || currentProfile.value?.name || 'A community member',
      type: 'merit',
      title: 'Community Merit received',
      message: `You earned a ${params.meritTitle || 'Community Helper'} merit for helping with "${params.postTitle || 'item recovery'}".`,
      postId: params.postId,
      postTitle: params.postTitle
    });
  };

  const createResolvedPostNotification = async (params: {
    recipientId: string;
    postId: string;
    postTitle: string;
    status: string;
  }) => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid;

    return createNotification({
      userId: params.recipientId,
      actorId: myUid,
      actorName: currentProfile.value?.name || 'Retrv Community',
      type: 'resolved_post',
      title: 'Post marked resolved',
      message: `The post "${params.postTitle}" has been successfully marked as ${params.status}.`,
      postId: params.postId,
      postTitle: params.postTitle
    });
  };

  const createMessageNotification = async (params: {
    recipientId: string;
    conversationId: string;
    senderName: string;
    messageText: string;
  }) => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid;

    return createNotification({
      userId: params.recipientId,
      actorId: myUid,
      actorName: params.senderName,
      type: 'message',
      title: params.senderName || 'New message',
      message: params.messageText || 'Sent a message',
      conversationId: params.conversationId
    });
  };

  return {
    notifications,
    loading,
    isLoading: loading,
    unreadCount: unreadNotificationCount,
    loadNotifications,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    createCommentNotification,
    createReplyNotification,
    createMeritNotification,
    createResolvedPostNotification,
    createMessageNotification
  };
}
