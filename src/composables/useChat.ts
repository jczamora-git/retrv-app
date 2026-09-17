import { ref, computed } from 'vue';
import { supabase } from '../utils/supabase';
import { useChatSocket } from './useChatSocket';
import { useConversations } from './useConversations';
import { useAuth } from './useAuth';
import type { ChatMessage } from '../types/message';
import type { ConversationThread } from '../types/conversation';

export function useChat(conversationId: string, initialThreadId = 'general') {
  const {
    sendMessage,
    getConversationMessages,
    getThreads
  } = useChatSocket();
  const { markAsRead } = useConversations();
  const { sessionUid } = useAuth();

  const activeThreadId = ref<string>(initialThreadId || 'general');
  const threads = ref<ConversationThread[]>([]);
  const messages = ref<ChatMessage[]>([]);
  const isMessagesLoading = ref(true);
  const isOtherTyping = ref(false);

  let realtimeChannel: any = null;
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

  const loadHistory = async (targetThreadId = 'all', isRefresh = false) => {
    if (messages.value.length === 0 && !isRefresh) {
      isMessagesLoading.value = true;
    }

    try {
      const [currentThreads, fetchedMessages] = await Promise.all([
        loadThreads(),
        getConversationMessages(conversationId, targetThreadId)
      ]);

      messageMap.clear();
      fetchedMessages.forEach((m) => messageMap.set(m.id, m));
      sortAndSyncMessages();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[useChat] Failed to load message history:', err);
      }
    } finally {
      isMessagesLoading.value = false;
    }
  };

  const switchThread = async (newThreadId: string) => {
    if (newThreadId === activeThreadId.value) return;

    activeThreadId.value = newThreadId;
    markAsRead(conversationId, newThreadId);
    await loadHistory('all');
  };

  const setupSocketListeners = async () => {
    if (!realtimeChannel) {
      try {
        realtimeChannel = supabase
          .channel(`public:messages:${conversationId}`)
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
                const newMsg: ChatMessage = {
                  id: newRow.id,
                  conversationId: newRow.conversation_id,
                  threadId: 'general',
                  senderId: newRow.sender_id,
                  senderName: newRow.sender_name || 'Member',
                  text: newRow.text || '',
                  imageUrl: newRow.image_url || undefined,
                  createdAt: newRow.created_at ? new Date(newRow.created_at).getTime() : Date.now(),
                  read: Boolean(newRow.read)
                };
                messageMap.set(newMsg.id, newMsg);
                sortAndSyncMessages();
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('[useChat] Realtime channel setup note:', err);
      }
    }
  };

  const sendChatMessage = async (
    text?: string,
    imageUrl?: string | null,
    imageKey?: string | null,
    targetThreadId?: string
  ): Promise<ChatMessage> => {
    const threadId = targetThreadId || activeThreadId.value || 'general';
    const msg = await sendMessage(conversationId, threadId, text || '', imageUrl, imageKey);

    messageMap.set(msg.id, msg);
    sortAndSyncMessages();

    return msg;
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
  };

  return {
    messages,
    threads,
    activeThreadId,
    activeThread,
    loading: isMessagesLoading,
    isMessagesLoading,
    isOtherTyping,
    loadThreads,
    loadHistory,
    switchThread,
    setupSocketListeners,
    sendChatMessage,
    sendText,
    handleTyping,
    cleanup
  };
}
