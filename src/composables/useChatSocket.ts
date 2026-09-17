import { ref } from 'vue';
import { supabase } from '../utils/supabase';
import { getSessionUser, currentAppUserId } from './useAuth';
import { createNotification } from './useNotifications';
import { idempotentInsert, generateClientRequestId } from '../utils/idempotency';
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
    targetThreadId = 'all',
    limit = 50
  ): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Reverse so oldest of the 50 is first (ascending chronological order)
      const messages: ChatMessage[] = (data || []).reverse().map((row) => {
        const rowThreadId = row.thread_id || (row.post_id ? `post_${row.post_id}` : 'general');
        const rowPostId = row.post_id || (rowThreadId?.startsWith('post_') ? rowThreadId.replace('post_', '') : null);

        return {
          id: row.id,
          conversationId: row.conversation_id,
          threadId: rowThreadId,
          thread_id: rowThreadId,
          postId: rowPostId,
          post_id: rowPostId,
          senderId: row.sender_id,
          senderName: row.sender_name || 'Member',
          text: row.text || '',
          imageUrl: row.image_url || undefined,
          clientRequestId: row.client_request_id || row.clientRequestId || undefined,
          client_request_id: row.client_request_id || row.clientRequestId || undefined,
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          read: Boolean(row.read),
          status: 'sent'
        };
      });

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
    imagePath?: string | null,
    clientRequestId?: string,
    postId?: string | null
  ): Promise<ChatMessage> => {
    const session = await getSessionUser();
    const myUid = currentAppUserId.value || session?.id || session?.uid;
    if (!myUid) {
      throw new Error('You must be signed in to send messages.');
    }

    const clientReqId = clientRequestId || generateClientRequestId();
    const now = Date.now();
    const msgId = `msg_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanText = (text || '').trim();

    const resolvedThreadId = threadId || 'general';
    const resolvedPostId = postId || (resolvedThreadId.startsWith('post_') ? resolvedThreadId.replace('post_', '') : null);

    const newRecord = {
      id: msgId,
      conversation_id: conversationId,
      sender_id: myUid,
      sender_name: session?.name || 'Member',
      text: cleanText,
      image_url: imageUrl || null,
      thread_id: resolvedThreadId,
      post_id: resolvedPostId,
      read: false,
      client_request_id: clientReqId,
      created_at: new Date(now).toISOString()
    };

    try {
      const insertResult = await idempotentInsert('messages', newRecord, {
        userColumn: 'sender_id',
        userId: myUid,
        clientRequestId: clientReqId
      });

      const savedRow = insertResult.data || newRecord;
      const finalThreadId = savedRow.thread_id || resolvedThreadId;
      const finalPostId = savedRow.post_id || resolvedPostId;

      const chatMsg: ChatMessage = {
        id: savedRow.id || msgId,
        conversationId,
        threadId: finalThreadId,
        thread_id: finalThreadId,
        postId: finalPostId,
        post_id: finalPostId,
        senderId: myUid,
        senderName: savedRow.sender_name || session?.name || 'Member',
        text: savedRow.text || cleanText,
        imageUrl: savedRow.image_url || imageUrl || undefined,
        imageKey: imageKey || undefined,
        clientRequestId: clientReqId,
        client_request_id: clientReqId,
        createdAt: savedRow.created_at ? new Date(savedRow.created_at).getTime() : now,
        read: false,
        status: 'sent'
      };

      if (import.meta.env.DEV) {
        console.log('[ChatThread] send', {
          messageId: chatMsg.id,
          threadId: chatMsg.threadId,
          postId: chatMsg.postId
        });
      }

      // Only update unread counts and dispatch push/notifications if this is a genuinely NEW message (not a duplicate retry)
      if (!insertResult.isDuplicate) {
        const { data: convRow } = await supabase
          .from('conversations')
          .select('participant_ids, unread_counts')
          .eq('id', conversationId)
          .maybeSingle();

        const participantIds: string[] = Array.isArray(convRow?.participant_ids) && convRow.participant_ids.length > 0
          ? convRow.participant_ids
          : conversationId.replace(/^conv_/, '').split('__');

        const updatedUnreadCounts: Record<string, number> = {
          ...(convRow?.unread_counts || {})
        };

        // Ensure sender's unread count is 0
        updatedUnreadCounts[myUid] = 0;

        // Increment ONLY other participants' unread count & create notification
        for (const pid of participantIds) {
          if (pid && pid !== myUid) {
            updatedUnreadCounts[pid] = (typeof updatedUnreadCounts[pid] === 'number' ? updatedUnreadCounts[pid] : 0) + 1;
            createNotification({
              userId: pid,
              actorId: myUid,
              actorName: chatMsg.senderName,
              type: 'message',
              title: chatMsg.senderName || 'New message',
              message: cleanText || (imageUrl ? 'Sent an image' : 'Sent a message'),
              conversationId
            }).catch(() => {});
          }
        }

        await supabase.from('conversations').update({
          last_message: cleanText || (imageUrl ? '📷 Photo' : ''),
          last_message_at: new Date(now).toISOString(),
          updated_at: new Date(now).toISOString(),
          unread_counts: updatedUnreadCounts
        }).eq('id', conversationId);
      }

      messageNewCallbacks.forEach((cb) => cb(chatMsg));
      return chatMsg;
    } catch (err) {
      console.error('[useChatSocket] Send message error:', err);
      throw err;
    }
  };

  const markConversationAsRead = async (conversationId: string, uid: string) => {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('unread_counts')
        .eq('id', conversationId)
        .maybeSingle();

      const currentCounts: Record<string, number> = { ...(data?.unread_counts || {}) };
      currentCounts[uid] = 0;

      await supabase
        .from('conversations')
        .update({ unread_counts: currentCounts })
        .eq('id', conversationId);

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', uid);
    } catch (err) {
      console.warn('[useChatSocket] Mark as read warning:', err);
    }
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
