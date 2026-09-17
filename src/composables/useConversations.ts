import { ref, computed } from 'vue';
import { useAuth, getSessionUser, sessionUid, currentAppUserId } from './useAuth';
import { usePosts } from './usePosts';
import { useProfiles } from './useProfiles';
import {
  globalConversations,
  messageUnreadCount,
  setConversationRead,
  resetLocalConversationUnread
} from './useMessageUnread';
import {
  useChatSocket,
  onConversationUpdated,
  onMessageNew
} from './useChatSocket';
import type { Conversation, ConversationThread, ConversationWithMeta } from '../types/conversation';
import type { Profile } from '../types/profile';

const conversations = globalConversations;
const isConversationsLoading = ref(false);
const hasConnectionError = ref(false);
let inFlightConversationsPromise: Promise<ConversationWithMeta[]> | null = null;

export interface CreateConversationOptions {
  otherUserId: string;
  postId?: string | null;
  postTitle?: string;
  postSubtitle?: string;
  postLocation?: string;
  threadId?: string;
}

export const totalUnreadCount = messageUnreadCount;


export async function createOrGetConversation(
  arg1: CreateConversationOptions | string,
  arg2?: string | null
): Promise<Conversation & { thread?: ConversationThread; threadsList?: ConversationThread[] }> {
  let otherUserId = '';
  let postId: string | null | undefined = null;
  let postTitle: string | undefined = undefined;
  let postSubtitle: string | undefined = undefined;
  let postLocation: string | undefined = undefined;
  let threadId: string | undefined = undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    otherUserId = arg1.otherUserId;
    postId = arg1.postId;
    postTitle = arg1.postTitle;
    postSubtitle = arg1.postSubtitle;
    postLocation = arg1.postLocation;
    threadId = arg1.threadId;
  } else if (typeof arg1 === 'string') {
    if (arg1.startsWith('post_') && arg2) {
      postId = arg1;
      otherUserId = arg2;
    } else {
      otherUserId = arg1;
      postId = arg2;
    }
  }

  const session = await getSessionUser();
  if (!session?.uid || (session.isAnonymous && !session.isDevAccount)) {
    throw new Error('You must be signed in to send messages.');
  }
  const currentUid = session.uid;

  if (!otherUserId || typeof otherUserId !== 'string' || otherUserId.trim() === '') {
    throw new Error('Unable to start conversation. Invalid recipient.');
  }
  if (otherUserId === currentUid) {
    throw new Error('Cannot start a conversation with yourself.');
  }

  const normalizedPostId =
    postId && typeof postId === 'string' && postId.trim() !== '' ? postId.trim() : null;

  const senderProfile = {
    name: session.name || 'Member',
    username: session.username || 'user',
    avatarUrl: null
  };

  const { createOrGetConversation: socketCreateOrGet } = useChatSocket();
  const res = await socketCreateOrGet(
    normalizedPostId,
    otherUserId,
    senderProfile,
    undefined,
    {
      threadId,
      postTitle,
      postSubtitle,
      postLocation
    }
  );

  return {
    ...res.conversation,
    thread: res.thread,
    threadsList: res.threads,
    id: res.conversation.id
  };
}

export const createOrGetDirectConversation = (
  otherUserId: string,
  postId?: string | null
): Promise<Conversation & { thread?: ConversationThread }> =>
  createOrGetConversation({ otherUserId, postId });

export function useConversations() {
  const { currentProfile } = useAuth();
  const { getPostById } = usePosts();
  const { loadProfile } = useProfiles();
  const {
    getConversationList,
    markConversationAsRead
  } = useChatSocket();

  const resolveOtherProfile = async (
    otherUid: string,
    conv: Conversation
  ): Promise<Profile> => {
    const loaded = await loadProfile(otherUid);
    if (loaded) return loaded;

    if (conv.participantDetails && conv.participantDetails[otherUid]) {
      const details = conv.participantDetails[otherUid];
      return {
        id: otherUid,
        name: details.name || 'Community Member',
        username: details.username || 'user',
        phone: '',
        avatarUrl: details.avatarUrl || null,
        createdAt: 0,
        updatedAt: 0
      };
    }

    return {
      id: otherUid,
      name: 'Community Member',
      username: 'member',
      phone: '',
      avatarUrl: null,
      createdAt: 0,
      updatedAt: 0
    };
  };

  const markAsRead = async (conversationId: string, threadId?: string) => {
    await setConversationRead(conversationId);
  };

  const isConversationUnread = (conv: Conversation): boolean => {
    const myUid = currentAppUserId.value || sessionUid.value || currentProfile.value?.id;
    if (!myUid) return false;

    if (conv.unreadCounts && typeof conv.unreadCounts[myUid] === 'number') {
      return conv.unreadCounts[myUid] > 0;
    }

    if (!conv.lastMessageAt || !conv.lastMessageSenderId) return false;
    if (conv.lastMessageSenderId === myUid) return false;

    const lastRead = Number(localStorage.getItem(`laf_read_${conv.id}`) || 0);
    return conv.lastMessageAt > lastRead;
  };

  const subscribeToConversations = async (): Promise<ConversationWithMeta[]> => {
    const myUid = currentAppUserId.value || sessionUid.value || currentProfile.value?.id;
    if (!myUid) return [];

    if (inFlightConversationsPromise) {
      return inFlightConversationsPromise;
    }

    if (conversations.value.length === 0) {
      isConversationsLoading.value = true;
    }
    hasConnectionError.value = false;

    inFlightConversationsPromise = (async () => {
      try {
        const rawList = await getConversationList(myUid);

        const otherUids = rawList.map((c) => (c.participantIds || []).find((id: string) => id !== myUid));
        const postIds = rawList.map((c) => c.postId).filter(Boolean) as string[];

        await Promise.all([
          useProfiles().loadProfiles(otherUids),
          Promise.all(postIds.map((pid) => getPostById(pid)))
        ]);

        const loaded: ConversationWithMeta[] = [];

        for (const rawConv of rawList) {
          const otherUid = (rawConv.participantIds || []).find((id: string) => id !== myUid);
          const otherProfile = otherUid ? await resolveOtherProfile(otherUid, rawConv) : null;
          let post = null;
          if (rawConv.postId) {
            post = await getPostById(rawConv.postId);
          }

          const counts = rawConv.unreadCounts || {};
          const unreadCount =
            typeof counts[myUid] === 'number'
              ? counts[myUid]
              : isConversationUnread(rawConv)
              ? 1
              : 0;

          loaded.push({
            ...rawConv,
            unreadCounts: counts,
            otherParticipant: otherProfile,
            post,
            unread: unreadCount > 0,
            unreadCount
          });
        }

        loaded.sort((a, b) => (b.lastMessageAt || b.updatedAt) - (a.lastMessageAt || a.updatedAt));
        conversations.value = loaded;
        hasConnectionError.value = false;

        return loaded;
      } catch (err) {
        if (conversations.value.length === 0) {
          hasConnectionError.value = true;
        }
        return conversations.value;
      } finally {
        isConversationsLoading.value = false;
        inFlightConversationsPromise = null;
      }
    })();

    return inFlightConversationsPromise;
  };

  const stopConversationSubscription = () => {};

  return {
    conversations,
    loading: isConversationsLoading,
    isConversationsLoading,
    hasConnectionError,
    totalUnreadCount,
    subscribeToConversations,
    stopConversationSubscription,
    markAsRead,
    createOrGetConversation,
    createOrGetDirectConversation
  };
}
