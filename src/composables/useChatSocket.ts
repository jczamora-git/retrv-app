import { ref } from 'vue';
import { supabase } from '../utils/supabase';
import { getSessionUser, currentAppUserId } from './useAuth';
import type { ChatMessage } from '../types/message';
import type { Conversation, ConversationThread } from '../types/conversation';

const isConnected = ref(true);

type ConversationUpdatedCallback = (conv: Conversation) => void;
type ThreadUpdatedCallback = (thread: ConversationThread) => void;
type MessageNewCallback = (msg: ChatMessage) => void;

const conversationUpdatedCallbacks = new Set<ConversationUpdatedCallback>();
const threadUpdatedCallbacks = new Set<ThreadUpdatedCallback>();
const messageNewCallbacks = new Set<MessageNewCallback>();

export function onConversationUpdated(cb: ConversationUpdatedCallback) {
  conversationUpdatedCallbacks.add(cb);
  return () => {
    conversationUpdatedCallbacks.delete(cb);
  };
}

export function onThreadUpdated(cb: ThreadUpdatedCallback) {
  threadUpdatedCallbacks.add(cb);
  return () => {
    threadUpdatedCallbacks.delete(cb);
  };
}

export function onMessageNew(cb: MessageNewCallback) {
  messageNewCallbacks.add(cb);
  return () => {
    messageNewCallbacks.delete(cb);
  };
}

export function useChatSocket() {
  const initSocket = async () => {
    return null;
  };

  const createOrGetConversation = async (
    postId: string | null | undefined,
    otherUserId: string,
    senderProfile?: { name: string; username: string; avatarUrl?: string | null },
    otherUserProfile?: { name: string; username: string; avatarUrl?: string | null },
    extra?: {
      threadId?: string;
      postTitle?: string;
      postSubtitle?: string;
      postLocation?: string;
    }
  ): Promise<{ conversation: Conversation; thread: ConversationThread; threads: ConversationThread[] }> => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid;
    if (!myUid) {
      throw new Error('You must be signed in to access conversations.');
    }

    const pairKey = [myUid, otherUserId].sort().join('__');
    const convId = `conv_${pairKey}`;
    const now = Date.now();

    const targetThreadId = extra?.threadId || (postId ? `post_${postId}` : 'general');
    const targetThreadTitle = extra?.postTitle || (postId ? 'Post Discussion' : 'General');

    let existingConv: Conversation | null = null;
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', convId)
        .maybeSingle();

      if (data) {
        existingConv = {
          id: data.id,
          participantIds: Array.isArray(data.participant_ids) ? data.participant_ids : [myUid, otherUserId],
          participantDetails: data.participants || {},
          lastMessage: data.last_message || undefined,
          unreadCounts: data.unread_counts || {},
          createdAt: data.created_at ? new Date(data.created_at).getTime() : now,
          updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : now
        };
      }
    } catch {}

    const participantDetails: Record<string, any> = {
      ...(existingConv?.participantDetails || {})
    };

    if (senderProfile) {
      participantDetails[myUid] = {
        name: senderProfile.name,
        username: senderProfile.username,
        avatarUrl: senderProfile.avatarUrl || null
      };
    }
    if (otherUserProfile) {
      participantDetails[otherUserId] = {
        name: otherUserProfile.name,
        username: otherUserProfile.username,
        avatarUrl: otherUserProfile.avatarUrl || null
      };
    }

    const conversationData: Conversation = {
      id: convId,
      participantIds: [myUid, otherUserId],
      participantDetails,
      lastMessage: existingConv?.lastMessage,
      unreadCounts: existingConv?.unreadCounts || { [myUid]: 0, [otherUserId]: 0 },
      createdAt: existingConv?.createdAt || now,
      updatedAt: now
    };

    const targetThread: ConversationThread = {
      id: targetThreadId,
      conversationId: convId,
      type: postId ? 'post' : 'general',
      title: targetThreadTitle,
      postId: postId || undefined,
      postSubtitle: extra?.postTitle || extra?.postSubtitle,
      postLocation: extra?.postLocation,
      createdAt: now,
      updatedAt: now
    };

    try {
      await supabase.from('conversations').upsert({
        id: convId,
        participant_ids: [myUid, otherUserId],
        participants: participantDetails,
        post_id: postId || null,
        post_title: extra?.postTitle || null,
        unread_counts: conversationData.unreadCounts,
        updated_at: new Date(now).toISOString()
      });
    } catch (err) {
      console.warn('[useChatSocket] Save conversation warning:', err);
    }

    return {
      conversation: conversationData,
      thread: targetThread,
      threads: [
        {
          id: 'general',
          conversationId: convId,
          type: 'general',
          title: 'General',
          createdAt: now,
          updatedAt: now
        },
        ...(targetThreadId !== 'general' ? [targetThread] : [])
      ]
    };
  };

  const getConversationList = async (myUid: string): Promise<Conversation[]> => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const list: Conversation[] = [];
      (data || []).forEach((row) => {
        const participantIds: string[] = Array.isArray(row.participant_ids) ? row.participant_ids : [];
        if (participantIds.includes(myUid) || row.id?.includes(myUid)) {
          list.push({
            id: row.id,
            participantIds: participantIds.length ? participantIds : [myUid],
            participantDetails: row.participants || {},
            lastMessage: row.last_message || undefined,
            unreadCounts: row.unread_counts || {},
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
          });
        }
      });

      return list;
    } catch (err) {
      console.warn('[useChatSocket] Failed loading conversations:', err);
      return [];
    }
  };

  const getThreads = async (convId: string): Promise<ConversationThread[]> => {
    return [
      {
        id: 'general',
        conversationId: convId,
        type: 'general',
        title: 'General',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  };

  const getConversationMessages = async (
    convId: string,
    targetThreadId = 'all'
  ): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messages: ChatMessage[] = (data || []).map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        threadId: 'general',
        senderId: row.sender_id,
        senderName: row.sender_name || 'Member',
        text: row.text || '',
        imageUrl: row.image_url || undefined,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        read: Boolean(row.read)
      }));

      return messages;
    } catch (err) {
      console.warn('[useChatSocket] Failed fetching messages:', err);
      return [];
    }
  };

  const sendMessage = async (
    conversationId: string,
    threadId: string,
    text: string,
    imageUrl?: string | null,
    imageKey?: string | null,
    imagePath?: string | null
  ): Promise<ChatMessage> => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid;
    if (!myUid) {
      throw new Error('You must be signed in to send messages.');
    }

    const now = Date.now();
    const msgId = `msg_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanText = (text || '').trim();

    const chatMsg: ChatMessage = {
      id: msgId,
      conversationId,
      threadId: threadId || 'general',
      senderId: myUid,
      senderName: session?.name || 'Member',
      text: cleanText,
      imageUrl: imageUrl || undefined,
      imageKey: imageKey || undefined,
      createdAt: now,
      read: false
    };

    try {
      await supabase.from('messages').insert({
        id: msgId,
        conversation_id: conversationId,
        sender_id: myUid,
        sender_name: chatMsg.senderName,
        text: cleanText,
        image_url: imageUrl || null,
        read: false,
        created_at: new Date(now).toISOString()
      });

      await supabase.from('conversations').update({
        last_message: cleanText || (imageUrl ? '📷 Photo' : ''),
        last_message_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
      }).eq('id', conversationId);
    } catch (err) {
      console.error('[useChatSocket] Send message error:', err);
      throw err;
    }

    messageNewCallbacks.forEach((cb) => cb(chatMsg));
    return chatMsg;
  };

  const markConversationAsRead = async (conversationId: string, uid: string) => {
    try {
      await supabase.from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', uid);
    } catch {}
  };

  return {
    isConnected,
    initSocket,
    createOrGetConversation,
    getConversationList,
    getThreads,
    getConversationMessages,
    sendMessage,
    markConversationAsRead
  };
}
