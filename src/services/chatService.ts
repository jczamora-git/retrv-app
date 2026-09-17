import { supabase } from '../utils/supabase';
import { getSessionUser, currentAppUserId } from '../composables/useAuth';
import { createNotification } from '../composables/useNotifications';
import { idempotentInsert, generateClientRequestId } from '../utils/idempotency';
import type { ChatMessage } from '../types/message';
import type { Conversation, ConversationThread } from '../types/conversation';

/**
 * Fetch or create a 1-on-1 Supabase conversation.
 */
export async function createOrGetSupabaseConversation(
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
): Promise<{ conversation: Conversation; thread: ConversationThread; threads: ConversationThread[] }> {
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
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[chatService] Error querying existing conversation:', err);
    }
  }

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
    if (import.meta.env.DEV) {
      console.warn('[chatService] Save conversation warning:', err);
    }
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
}

/**
 * Fetch list of conversations for the current user from Supabase.
 */
export async function fetchSupabaseConversationList(myUid: string): Promise<Conversation[]> {
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
          lastMessageAt: row.last_message_at ? new Date(row.last_message_at).getTime() : undefined,
          unreadCounts: row.unread_counts || {},
          postId: row.post_id || undefined,
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
        });
      }
    });

    return list;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[chatService] Failed loading conversations from Supabase:', err);
    }
    return [];
  }
}

/**
 * Fetch threads for a conversation.
 */
export async function fetchSupabaseThreads(conversationId: string): Promise<ConversationThread[]> {
  const list: ConversationThread[] = [
    {
      id: 'general',
      conversationId,
      type: 'general',
      title: 'General',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  try {
    const { data } = await supabase
      .from('messages')
      .select('thread_id, post_id, created_at')
      .eq('conversation_id', conversationId);

    const seenPosts = new Set<string>();
    (data || []).forEach((row) => {
      const threadId = row.thread_id || (row.post_id ? `post_${row.post_id}` : null);
      if (threadId && threadId.startsWith('post_')) {
        const postId = row.post_id || threadId.replace('post_', '');
        if (postId && !seenPosts.has(postId)) {
          seenPosts.add(postId);
          list.push({
            id: `post_${postId}`,
            conversationId,
            type: 'post',
            title: 'Post Discussion',
            postId,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
          });
        }
      }
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[chatService] Failed fetching threads from Supabase:', err);
    }
  }

  return list;
}

/**
 * Fetch messages for a conversation from Supabase.
 */
export async function fetchSupabaseConversationMessages(
  conversationId: string,
  targetThreadId = 'all',
  limit = 50
): Promise<ChatMessage[]> {
  try {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (targetThreadId && targetThreadId !== 'all') {
      if (targetThreadId.startsWith('post_')) {
        const targetPostId = targetThreadId.replace('post_', '');
        query = query.or(`thread_id.eq.${targetThreadId},post_id.eq.${targetPostId}`);
      } else {
        query = query.eq('thread_id', targetThreadId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const messages: ChatMessage[] = (data || []).map((row) => {
      const rowThreadId = row.thread_id || (row.post_id ? `post_${row.post_id}` : 'general');
      const rowPostId = row.post_id || (rowThreadId.startsWith('post_') ? rowThreadId.replace('post_', '') : null);

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
    if (import.meta.env.DEV) {
      console.warn('[chatService] Failed fetching messages from Supabase:', err);
    }
    return [];
  }
}

/**
 * Send a message via Supabase with idempotency deduplication.
 */
export async function sendSupabaseMessage(
  conversationId: string,
  threadId: string,
  text: string,
  imageUrl?: string | null,
  imageKey?: string | null,
  imagePath?: string | null,
  clientRequestId?: string,
  postId?: string | null
): Promise<ChatMessage> {
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

    // Only update unread counts and dispatch notifications if this is a NEW message (not duplicate)
    if (!insertResult.isDuplicate) {
      const { data: convRow } = await supabase
        .from('conversations')
        .select('participant_ids, unread_counts')
        .eq('id', conversationId)
        .maybeSingle();

      const participantIds: string[] =
        Array.isArray(convRow?.participant_ids) && convRow.participant_ids.length > 0
          ? convRow.participant_ids
          : conversationId.replace(/^conv_/, '').split('__');

      const updatedUnreadCounts: Record<string, number> = {
        ...(convRow?.unread_counts || {})
      };

      // Sender unread is always 0
      updatedUnreadCounts[myUid] = 0;

      // Increment recipients unread counts & notify
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

      await supabase
        .from('conversations')
        .update({
          last_message: cleanText || (imageUrl ? '📷 Photo' : ''),
          last_message_at: new Date(now).toISOString(),
          updated_at: new Date(now).toISOString(),
          unread_counts: updatedUnreadCounts
        })
        .eq('id', conversationId);
    }

    return chatMsg;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[chatService] Send message error:', err);
    }
    throw err;
  }
}

/**
 * Mark a conversation as read in Supabase.
 */
export async function markSupabaseConversationAsRead(conversationId: string, uid: string): Promise<void> {
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
    if (import.meta.env.DEV) {
      console.warn('[chatService] Mark as read warning:', err);
    }
  }
}
