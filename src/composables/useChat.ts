import { ref, computed, onUnmounted } from 'vue';
import { supabase } from '../utils/supabase';
import { useChatSocket } from './useChatSocket';
import { useMessageUnread } from './useMessageUnread';
import { currentAppUserId, sessionUid } from './useAuth';
import { generateClientRequestId } from '../utils/idempotency';
import type { ChatMessage } from '../types/message';
import type { ConversationThread } from '../types/conversation';

export function useChat(conversationId: string, initialThreadId = 'general') {
  const {
    sendMessage,
    getConversationMessages,
    getThreads
  } = useChatSocket();
  const { setConversationRead } = useMessageUnread();

  const activeThreadId = ref<string>(initialThreadId || 'general');
  const threads = ref<ConversationThread[]>([]);
  const messages = ref<ChatMessage[]>([]);
  const isMessagesLoading = ref(true);
  const isOtherTyping = ref(false);
  const realtimeStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting');

  let realtimeChannel: any = null;
  let hasInitiallyLoaded = false;
  const messageMap = new Map<string, ChatMessage>();

  const activeThread = computed<ConversationThread | undefined>(() => {
    return (
      threads.value.find((t) => t.id === activeThreadId.value) || {
        id: activeThreadId.value,
        conversationId,
        type: activeThreadId.value === 'general' ? 'general' : 'post',
        title: activeThreadId.value === 'general' ? 'General' : 'Post Discussion',
        createdAt: 0,
        updatedAt: 0
      }
    );
  });

  const sortAndSyncMessages = () => {
    messages.value = Array.from(messageMap.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
  };

  const loadThreads = async (): Promise<ConversationThread[]> => {
    const list = await getThreads(conversationId);
    threads.value = list;
    return list;
  };

  /**
   * Fetch latest 50 messages from Supabase and reconcile with local state
   */
  const loadHistory = async (targetThreadId = 'all', isRefresh = false) => {
    if (messages.value.length === 0 && !isRefresh) {
      isMessagesLoading.value = true;
    }

    try {
      const [currentThreads, fetchedMessages] = await Promise.all([
        loadThreads(),
        getConversationMessages(conversationId, targetThreadId, 50)
      ]);

      // Reconcile fetched messages against map, clearing matched optimistic items
      fetchedMessages.forEach((m) => {
        if (m.clientRequestId || m.client_request_id) {
          const reqId = m.clientRequestId || m.client_request_id;
          for (const [key, item] of messageMap.entries()) {
            if (item.clientRequestId === reqId || item.client_request_id === reqId) {
              messageMap.delete(key);
            }
          }
        }
        messageMap.set(m.id, m);
      });

      sortAndSyncMessages();
      hasInitiallyLoaded = true;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[useChat] Failed to load message history:', err);
      }
    } finally {
      isMessagesLoading.value = false;
    }
  };

  /**
   * Subscribe to Supabase Realtime Postgres Changes for this conversation ONLY.
   */
  const setupRealtimeSubscription = () => {
    if (!conversationId) return;

    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    realtimeStatus.value = 'connecting';

    try {
      realtimeChannel = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: any) => {
            if (payload.new) {
              const newRow = payload.new;
              const myUid = currentAppUserId.value || sessionUid.value;
              const reqId = newRow.client_request_id || newRow.clientRequestId;

              // 1. Exact match by message ID
              if (messageMap.has(newRow.id)) {
                return;
              }

              // 2. Reconcile with optimistic item via client_request_id
              if (reqId) {
                for (const [key, item] of messageMap.entries()) {
                  if (item.clientRequestId === reqId || item.client_request_id === reqId) {
                    messageMap.delete(key);
                    break;
                  }
                }
              }

              const rowThreadId = newRow.thread_id || (newRow.post_id ? `post_${newRow.post_id}` : 'general');
              const rowPostId = newRow.post_id || (rowThreadId?.startsWith('post_') ? rowThreadId.replace('post_', '') : null);

              const newMsg: ChatMessage = {
                id: newRow.id,
                conversationId: newRow.conversation_id,
                threadId: rowThreadId,
                thread_id: rowThreadId,
                postId: rowPostId,
                post_id: rowPostId,
                senderId: newRow.sender_id,
                senderName: newRow.sender_name || 'Member',
                text: newRow.text || '',
                imageUrl: newRow.image_url || undefined,
                clientRequestId: reqId,
                client_request_id: reqId,
                createdAt: newRow.created_at ? new Date(newRow.created_at).getTime() : Date.now(),
                read: Boolean(newRow.read),
                status: 'sent'
              };

              if (import.meta.env.DEV) {
                console.log('[ChatThread] realtime', {
                  messageId: newMsg.id,
                  threadId: newMsg.threadId,
                  postId: newMsg.postId
                });
              }

              messageMap.set(newMsg.id, newMsg);
              sortAndSyncMessages();

              // Active chat read behavior: If recipient is viewing chat, mark read immediately
              if (newRow.sender_id !== myUid) {
                setConversationRead(conversationId).catch(() => {});
              }
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            realtimeStatus.value = 'connected';
            // If reconnecting, re-fetch latest messages once to catch missed events
            if (hasInitiallyLoaded) {
              loadHistory('all', true).catch(() => {});
            }
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            realtimeStatus.value = 'disconnected';
          }
        });
    } catch (err) {
      realtimeStatus.value = 'disconnected';
      if (import.meta.env.DEV) {
        console.warn('[useChat] Realtime channel setup note:', err);
      }
    }
  };

  // Re-sync on app return to foreground
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && hasInitiallyLoaded) {
      loadHistory('all', true).catch(() => {});
      if (!realtimeChannel) {
        setupRealtimeSubscription();
      }
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  const switchThread = async (newThreadId: string) => {
    if (newThreadId === activeThreadId.value) return;

    activeThreadId.value = newThreadId;
    await setConversationRead(conversationId);
    await loadHistory('all');
  };

  const sendChatMessage = async (
    text?: string,
    imageUrl?: string | null,
    imageKey?: string | null,
    targetThreadId?: string,
    existingClientRequestId?: string,
    targetPostId?: string | null
  ): Promise<ChatMessage> => {
    const threadId = targetThreadId || activeThreadId.value || 'general';
    const resolvedPostId = targetPostId || (threadId.startsWith('post_') ? threadId.replace('post_', '') : null);
    const myUid = currentAppUserId.value || sessionUid.value || 'me';
    const clientReqId = existingClientRequestId || generateClientRequestId();
    const cleanText = (text || '').trim();

    // Optimistic message
    const tempId = `temp_${clientReqId}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId,
      threadId,
      thread_id: threadId,
      postId: resolvedPostId,
      post_id: resolvedPostId,
      senderId: myUid,
      text: cleanText,
      imageUrl: imageUrl || undefined,
      imageKey: imageKey || undefined,
      clientRequestId: clientReqId,
      client_request_id: clientReqId,
      createdAt: Date.now(),
      read: false,
      status: 'sending'
    };

    messageMap.set(tempId, optimisticMsg);
    sortAndSyncMessages();

    try {
      const savedMsg = await sendMessage(
        conversationId,
        threadId,
        cleanText,
        imageUrl,
        imageKey,
        undefined,
        clientReqId,
        resolvedPostId
      );

      // Reconcile optimistic item with persisted row
      if (tempId !== savedMsg.id) {
        messageMap.delete(tempId);
      }
      messageMap.set(savedMsg.id, {
        ...savedMsg,
        status: 'sent'
      });
      sortAndSyncMessages();

      return savedMsg;
    } catch (err) {
      console.warn('[useChat] Message send failed:', err);
      optimisticMsg.status = 'failed';
      messageMap.set(tempId, optimisticMsg);
      sortAndSyncMessages();
      throw err;
    }
  };

  const retrySendMessage = async (msg: ChatMessage) => {
    const reqId = msg.clientRequestId || msg.client_request_id || generateClientRequestId();
    return sendChatMessage(msg.text, msg.imageUrl, msg.imageKey, msg.threadId, reqId, msg.postId);
  };

  const sendText = async (text: string): Promise<ChatMessage> => {
    return sendChatMessage(text);
  };

  const handleTyping = () => {};

  const cleanup = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  onUnmounted(() => {
    cleanup();
  });

  return {
    messages,
    threads,
    activeThreadId,
    activeThread,
    loading: isMessagesLoading,
    isMessagesLoading,
    isOtherTyping,
    realtimeStatus,
    loadThreads,
    loadHistory,
    switchThread,
    setupSocketListeners: setupRealtimeSubscription,
    setupRealtimeSubscription,
    sendChatMessage,
    retrySendMessage,
    sendText,
    handleTyping,
    cleanup
  };
}
