import { ref, computed } from 'vue';
import { supabase } from '../utils/supabase';
import { currentAppUserId, sessionUid } from './useAuth';
import type { ConversationWithMeta } from '../types/conversation';

// Global shared reactive conversation cache
export const globalConversations = ref<ConversationWithMeta[]>([]);

let globalConversationsChannel: any = null;

/**
 * Global reactive unread count across all private conversations for current user.
 */
export const messageUnreadCount = computed<number>(() => {
  const myUid = currentAppUserId.value || sessionUid.value;
  if (!myUid) return 0;

  return globalConversations.value.reduce((total, conv) => {
    let count = 0;
    if (conv.unreadCounts && typeof conv.unreadCounts[myUid] === 'number') {
      count = conv.unreadCounts[myUid];
    } else if (typeof conv.unreadCount === 'number') {
      count = conv.unreadCount;
    } else if (conv.unread) {
      count = 1;
    }
    return total + (count > 0 ? count : 0);
  }, 0);
});

/**
 * Immediately reset local unread state for zero-latency UI updates.
 */
export const resetLocalConversationUnread = (conversationId: string): void => {
  const myUid = currentAppUserId.value || sessionUid.value;
  if (!myUid || !conversationId) return;

  const target = globalConversations.value.find((c) => c.id === conversationId);
  if (target) {
    if (!target.unreadCounts) target.unreadCounts = {};
    target.unreadCounts[myUid] = 0;
    target.unreadCount = 0;
    target.unread = false;
  }
};

/**
 * Increment local unread count for recipient when sending a message.
 */
export const incrementLocalUnread = (conversationId: string, recipientUserId: string): void => {
  if (!conversationId || !recipientUserId) return;
  const target = globalConversations.value.find((c) => c.id === conversationId);
  if (target) {
    if (!target.unreadCounts) target.unreadCounts = {};
    target.unreadCounts[recipientUserId] = (target.unreadCounts[recipientUserId] || 0) + 1;
  }
};

/**
 * Mark a conversation as read in local cache and persist to Supabase unread_counts field.
 */
export const setConversationRead = async (conversationId: string): Promise<void> => {
  const myUid = currentAppUserId.value || sessionUid.value;
  if (!myUid || !conversationId) return;

  // 1. Immediately reset in-memory state
  resetLocalConversationUnread(conversationId);
  try {
    localStorage.setItem(`laf_read_${conversationId}`, String(Date.now()));
  } catch {}

  // 2. Persist updated unread_counts to Supabase
  try {
    const { data } = await supabase
      .from('conversations')
      .select('unread_counts')
      .eq('id', conversationId)
      .maybeSingle();

    const counts: Record<string, number> = { ...(data?.unread_counts || {}) };
    counts[myUid] = 0;

    await supabase
      .from('conversations')
      .update({ unread_counts: counts })
      .eq('id', conversationId);

    // Also mark message rows as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', myUid);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[useMessageUnread] Failed to persist read state in Supabase:', err);
    }
  }
};

/**
 * Single user-level Supabase Realtime channel for live conversation & unread count updates.
 */
export const setupConversationsRealtime = () => {
  if (globalConversationsChannel) return;

  try {
    globalConversationsChannel = supabase
      .channel('user-conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload: any) => {
          const myUid = currentAppUserId.value || sessionUid.value;
          if (!myUid) return;

          const row = payload.new;
          if (!row || !row.id) return;

          const participantIds: string[] = Array.isArray(row.participant_ids)
            ? row.participant_ids
            : [];

          if (participantIds.includes(myUid) || row.id.includes(myUid)) {
            const existingIdx = globalConversations.value.findIndex((c) => c.id === row.id);
            const counts = row.unread_counts || {};
            const unreadCount = typeof counts[myUid] === 'number' ? counts[myUid] : 0;
            const lastMsgAt = row.last_message_at
              ? new Date(row.last_message_at).getTime()
              : Date.now();
            const updatedAt = row.updated_at
              ? new Date(row.updated_at).getTime()
              : Date.now();

            if (existingIdx >= 0) {
              const existing = globalConversations.value[existingIdx];
              globalConversations.value[existingIdx] = {
                ...existing,
                lastMessage: row.last_message || existing.lastMessage,
                lastMessageAt: lastMsgAt,
                updatedAt,
                unreadCounts: counts,
                unreadCount,
                unread: unreadCount > 0
              };
              // Re-sort to float latest conversation to top
              globalConversations.value.sort(
                (a, b) =>
                  (b.lastMessageAt || b.updatedAt) - (a.lastMessageAt || a.updatedAt)
              );
            }
          }
        }
      )
      .subscribe();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[useMessageUnread] Conversation realtime setup warning:', err);
    }
  }
};

export const cleanupConversationsRealtime = () => {
  if (globalConversationsChannel) {
    supabase.removeChannel(globalConversationsChannel);
    globalConversationsChannel = null;
  }
};

export function useMessageUnread() {
  return {
    messageUnreadCount,
    setConversationRead,
    resetLocalConversationUnread,
    incrementLocalUnread,
    setupConversationsRealtime,
    cleanupConversationsRealtime
  };
}
