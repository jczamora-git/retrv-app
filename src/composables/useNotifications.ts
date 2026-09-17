import { ref, computed } from 'vue';
import { supabase } from '../utils/supabase';
import { useAuth, sessionUid, getSessionUser } from './useAuth';
import type { AppNotification } from '../types/notification';
import { shouldSendNotification } from './useNotificationPreferences';

const notifications = ref<AppNotification[]>([]);
const loading = ref(false);
let realtimeChannel: any = null;

export const unreadNotificationCount = computed<number>(() => {
  return notifications.value.filter((n) => !n.read).length;
});

export function useNotifications() {
  const { currentProfile } = useAuth();

  const sortNotifications = () => {
    notifications.value.sort((a, b) => b.createdAt - a.createdAt);
  };

  const mapNotificationRow = (row: any): AppNotification => {
    return {
      id: row.id,
      type: row.type || 'comment',
      actorId: row.actor_id || row.actorId || 'anonymous',
      actorName: row.actor_name || row.actorName || 'Community Member',
      actorUsername: row.actor_username || row.actorUsername,
      actorAvatarUrl: row.actor_avatar_url || row.actorAvatarUrl || null,
      postId: row.post_id || row.postId,
      postTitle: row.post_title || row.postTitle,
      commentId: row.comment_id || row.commentId,
      text: row.text || row.body || '',
      createdAt: row.created_at ? (typeof row.created_at === 'number' ? row.created_at : new Date(row.created_at).getTime()) : Date.now(),
      read: Boolean(row.read)
    };
  };

  const fetchNotifications = async (myUid: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', myUid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      notifications.value = (data || []).map(mapNotificationRow);
      sortNotifications();
    } catch (err) {
      console.warn('[useNotifications] Fetch notifications warning:', err);
    } finally {
      loading.value = false;
    }
  };

  const subscribeToNotifications = async () => {
    const session = await getSessionUser();
    const myUid = session?.uid || sessionUid.value;
    if (!myUid) return;

    loading.value = true;
    await fetchNotifications(myUid);

    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    try {
      realtimeChannel = supabase
        .channel(`public:notifications:${myUid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${myUid}`
          },
          () => {
            fetchNotifications(myUid);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[useNotifications] Realtime note:', err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const target = notifications.value.find((n) => n.id === notificationId);
    if (target) {
      target.read = true;
    }

    try {
      await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    } catch {}
  };

  const markAllAsRead = async () => {
    const session = await getSessionUser();
    const myUid = session?.uid || sessionUid.value;
    notifications.value.forEach((n) => {
      n.read = true;
    });

    if (myUid) {
      try {
        await supabase.from('notifications').update({ read: true }).eq('user_id', myUid);
      } catch {}
    }
  };

  const createCommentNotification = async (params: {
    postAuthorId: string;
    postId: string;
    postTitle?: string;
    commentId: string;
    commentText: string;
  }) => {
    const session = await getSessionUser();
    const currentUid = session?.uid || currentProfile.value?.id;
    if (!currentUid || params.postAuthorId === currentUid) return;

    // Honor recipient notification preferences
    const allowed = await shouldSendNotification(params.postAuthorId, 'comments');
    if (!allowed) return;

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord = {
      id: notifId,
      user_id: params.postAuthorId,
      type: 'comment',
      title: 'New comment on your post',
      body: params.commentText.trim().slice(0, 100),
      post_id: params.postId,
      actor_id: currentUid,
      actor_name: currentProfile.value?.name || session?.name || 'Community Member',
      read: false
    };

    try {
      await supabase.from('notifications').insert(newRecord);
    } catch {}
  };

  const createReplyNotification = async (params: {
    targetAuthorId: string;
    postId: string;
    postTitle?: string;
    commentId: string;
    replyText: string;
  }) => {
    const session = await getSessionUser();
    const currentUid = session?.uid || currentProfile.value?.id;
    if (!currentUid || params.targetAuthorId === currentUid) return;

    // Honor recipient notification preferences
    const allowed = await shouldSendNotification(params.targetAuthorId, 'replies');
    if (!allowed) return;

    const notifId = `notif_reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord = {
      id: notifId,
      user_id: params.targetAuthorId,
      type: 'reply',
      title: 'New reply to your comment',
      body: params.replyText.trim().slice(0, 100),
      post_id: params.postId,
      actor_id: currentUid,
      actor_name: currentProfile.value?.name || session?.name || 'Community Member',
      read: false
    };

    try {
      await supabase.from('notifications').insert(newRecord);
    } catch {}
  };

  const createMeritNotification = async (params: {
    recipientId: string;
    postId: string;
    postTitle?: string;
    awardedByName: string;
  }) => {
    const session = await getSessionUser();
    const currentUid = session?.uid || currentProfile.value?.id;
    if (!currentUid || params.recipientId === currentUid) return;

    // Honor recipient notification preferences
    const allowed = await shouldSendNotification(params.recipientId, 'merits');
    if (!allowed) return;

    const notifId = `notif_merit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord = {
      id: notifId,
      user_id: params.recipientId,
      type: 'merit_awarded',
      title: 'Community Merit Awarded',
      body: `${params.awardedByName} awarded you a Community Merit for helping recover ${params.postTitle || 'this item'}.`,
      post_id: params.postId,
      actor_id: currentUid,
      actor_name: params.awardedByName || currentProfile.value?.name || 'A community member',
      read: false
    };

    try {
      await supabase.from('notifications').insert(newRecord);
    } catch {}
  };

  return {
    notifications,
    loading,
    unreadCount: unreadNotificationCount,
    subscribeToNotifications,
    markAsRead,
    markAllAsRead,
    createCommentNotification,
    createReplyNotification,
    createMeritNotification
  };
}
