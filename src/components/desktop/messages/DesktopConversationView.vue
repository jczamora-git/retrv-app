<template>
  <section class="desktop-chat-view" aria-label="Conversation Messages">
    <!-- Active Chat Header -->
    <header class="chat-header">
      <div class="header-participant-info" @click="handleOpenProfile">
        <UserAvatar
          :name="conversation.otherParticipant?.name || 'User'"
          :username="conversation.otherParticipant?.username || 'user'"
          :avatar-url="conversation.otherParticipant?.avatarUrl"
          size="md"
        />
        <div class="participant-meta">
          <div class="name-badge-row">
            <span class="participant-name">{{ conversation.otherParticipant?.name || 'Community Member' }}</span>
            <AchievementBadge :user-id="conversation.otherParticipant?.id" :size="14" />
          </div>
          <span class="participant-handle">@{{ conversation.otherParticipant?.username || 'user' }}</span>
        </div>
      </div>

      <!-- Right Header Actions & Post Context -->
      <div class="header-right-actions">
        <!-- Optional Regarding Post Context Chip -->
        <button
          v-if="postContextTitle"
          type="button"
          class="post-context-chip"
          title="View related report"
          @click="handleOpenPost"
        >
          <Tag :size="12" class="context-icon" />
          <span class="context-label">Regarding:</span>
          <span class="context-post-title">{{ postContextTitle }}</span>
        </button>

        <button
          type="button"
          class="view-profile-btn"
          @click="handleOpenProfile"
        >
          View Profile
        </button>
      </div>
    </header>

    <!-- Public Meetup Safety Notice -->
    <div class="chat-safety-notice">
      <ShieldAlert :size="14" class="safety-icon" />
      <span>For item exchanges, always consider meeting in a well-lit public place.</span>
    </div>

    <!-- Scrollable Messages History Area -->
    <div ref="messagesScrollContainer" class="messages-history-scroll">
      <!-- 1. Skeleton Loading State -->
      <div v-if="isMessagesLoading && messages.length === 0" class="chat-skeleton-stream">
        <div class="skeleton-bubble left w-50"></div>
        <div class="skeleton-bubble right w-40"></div>
        <div class="skeleton-bubble left w-70"></div>
        <div class="skeleton-bubble right w-60"></div>
      </div>

      <!-- 2. Empty Thread State -->
      <div v-else-if="messages.length === 0" class="empty-thread-box">
        <div class="empty-thread-icon">
          <MessageCircle :size="32" />
        </div>
        <p class="empty-thread-title">No messages yet</p>
        <p class="empty-thread-sub">Send a message to start coordinating.</p>
      </div>

      <!-- 3. Message Stream -->
      <div v-else class="messages-stream">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-row"
          :class="{
            'is-own': msg.senderId === myUid,
            'is-other': msg.senderId !== myUid
          }"
        >
          <!-- Other User Avatar on Left for Incoming Messages -->
          <div v-if="msg.senderId !== myUid" class="msg-avatar-col">
            <UserAvatar
              :name="conversation.otherParticipant?.name || 'User'"
              :username="conversation.otherParticipant?.username || 'user'"
              :avatar-url="conversation.otherParticipant?.avatarUrl"
              size="sm"
            />
          </div>

          <!-- Message Bubble Container -->
          <div class="message-bubble-wrapper">
            <div class="message-bubble" :class="{ 'has-image': Boolean(msg.imageUrl) }">
              <!-- Attached Photo -->
              <div v-if="msg.imageUrl" class="bubble-image-box">
                <img :src="msg.imageUrl" alt="Attached photo" class="bubble-img" />
              </div>

              <!-- Text Content -->
              <p v-if="msg.text" class="bubble-text">{{ msg.text }}</p>
            </div>

            <!-- Message Timestamp & Status -->
            <div class="message-meta-line">
              <time class="msg-timestamp">{{ formatTime(msg.createdAt) }}</time>
              <span v-if="msg.status === 'sending'" class="msg-status sending">Sending...</span>
              <span v-else-if="msg.status === 'failed'" class="msg-status failed">Failed</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Bottom Message Composer -->
    <footer class="chat-composer-wrap">
      <form class="composer-form" @submit.prevent="handleSendMessage">
        <textarea
          ref="composerInputRef"
          v-model="inputText"
          rows="1"
          class="composer-textarea"
          placeholder="Type a message..."
          :disabled="sending"
          @keydown.enter.exact.prevent="handleSendMessage"
        ></textarea>

        <button
          type="submit"
          class="composer-send-btn"
          :disabled="!inputText.trim() || sending"
          aria-label="Send message"
        >
          <SendHorizontal :size="18" />
        </button>
      </form>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  MessageCircle,
  SendHorizontal,
  ShieldAlert,
  Tag
} from 'lucide-vue-next';
import UserAvatar from '../../UserAvatar.vue';
import AchievementBadge from '../../AchievementBadge.vue';
import { useChat } from '../../../composables/useChat';
import { currentAppUserId, sessionUid, useAuth } from '../../../composables/useAuth';
import type { ConversationWithMeta } from '../../../types/conversation';

const props = defineProps<{
  conversation: ConversationWithMeta;
}>();

const emit = defineEmits<{
  (e: 'message-sent'): void;
}>();

const router = useRouter();
const { currentProfile } = useAuth();
const myUid = computed(() => currentAppUserId.value || sessionUid.value || currentProfile.value?.id || '');

const inputText = ref('');
const sending = ref(false);
const messagesScrollContainer = ref<HTMLDivElement | null>(null);
const composerInputRef = ref<HTMLTextAreaElement | null>(null);

// Initialize useChat composable
let chatInstance = useChat(props.conversation.id, 'all');

const messages = computed(() => chatInstance.messages.value);
const isMessagesLoading = computed(() => chatInstance.isMessagesLoading.value);

const postContextTitle = computed(() => {
  if (props.conversation.post?.title) {
    return props.conversation.post.title;
  }
  if (
    props.conversation.lastMessageThreadTitle &&
    props.conversation.lastMessageThreadTitle.toLowerCase() !== 'general'
  ) {
    return props.conversation.lastMessageThreadTitle;
  }
  return null;
});

const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    if (messagesScrollContainer.value) {
      messagesScrollContainer.value.scrollTo({
        top: messagesScrollContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  });
};

const setupChatForConversation = async (convId: string) => {
  if (chatInstance) {
    chatInstance.cleanup();
  }
  chatInstance = useChat(convId, 'all');
  await chatInstance.loadHistory('all');
  chatInstance.setupRealtimeSubscription();
  scrollToBottom(false);
};

watch(
  () => props.conversation.id,
  (newId) => {
    if (newId) {
      inputText.value = '';
      setupChatForConversation(newId);
    }
  },
  { immediate: true }
);

watch(
  () => messages.value.length,
  () => {
    scrollToBottom(true);
  }
);

onMounted(() => {
  scrollToBottom(false);
  composerInputRef.value?.focus();
});

onUnmounted(() => {
  if (chatInstance) {
    chatInstance.cleanup();
  }
});

const formatTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const handleOpenProfile = () => {
  if (props.conversation.otherParticipant?.id) {
    router.push(`/profile/${props.conversation.otherParticipant.id}`);
  }
};

const handleOpenPost = () => {
  if (props.conversation.postId) {
    router.push(`/post/${props.conversation.postId}`);
  }
};

const handleSendMessage = async () => {
  const text = inputText.value.trim();
  if (!text || sending.value) return;

  sending.value = true;
  inputText.value = '';

  try {
    await chatInstance.sendChatMessage(
      text,
      undefined,
      props.conversation.otherParticipant?.id,
      props.conversation.otherParticipant?.name
    );
    scrollToBottom(true);
    emit('message-sent');
  } catch (err) {
    console.error('[DesktopConversationView] Failed to send message:', err);
    // Restore text on failure
    inputText.value = text;
  } finally {
    sending.value = false;
    nextTick(() => {
      composerInputRef.value?.focus();
    });
  }
};
</script>

<style scoped>
.desktop-chat-view {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--app-surface);
  box-sizing: border-box;
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  min-height: 58px;
  border-bottom: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  box-sizing: border-box;
  background: var(--app-surface);
  flex-shrink: 0;
}

.header-participant-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.participant-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.name-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.participant-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.participant-handle {
  font-size: 12px;
  color: var(--app-text-tertiary);
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.post-context-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 9999px;
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
  border: 1px solid rgba(38, 64, 219, 0.15);
  color: var(--app-primary, #2640DB);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  max-width: 260px;
}

.post-context-chip:hover {
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.14));
}

.context-icon {
  flex-shrink: 0;
}

.context-label {
  font-weight: 600;
}

.context-post-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-profile-btn {
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  color: var(--app-text-primary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-profile-btn:hover {
  background: var(--app-surface-tertiary);
}

/* Safety Notice */
.chat-safety-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 16px;
  background: var(--app-surface-secondary);
  border-bottom: 1px solid var(--app-border, rgba(20, 25, 30, 0.06));
  font-size: 12px;
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.safety-icon {
  color: var(--app-lost, #f04444);
  flex-shrink: 0;
}

/* Messages History Scroll Area */
.messages-history-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: var(--app-border, rgba(20, 25, 30, 0.15)) transparent;
}

.messages-history-scroll::-webkit-scrollbar {
  width: 5px;
}

.messages-history-scroll::-webkit-scrollbar-thumb {
  background: var(--app-border, rgba(20, 25, 30, 0.15));
  border-radius: 4px;
}

.messages-stream {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 75%;
}

.message-row.is-own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-row.is-other {
  align-self: flex-start;
}

.msg-avatar-col {
  flex-shrink: 0;
  margin-bottom: 18px;
}

.message-bubble-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.message-row.is-own .message-bubble-wrapper {
  align-items: flex-end;
}

.message-row.is-other .message-bubble-wrapper {
  align-items: flex-start;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  word-break: break-word;
  line-height: 1.45;
  font-size: 14px;
}

.message-row.is-own .message-bubble {
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.message-row.is-other .message-bubble {
  background: var(--app-surface-secondary);
  color: var(--app-text-primary);
  border-bottom-left-radius: 4px;
}

.bubble-text {
  margin: 0;
  white-space: pre-wrap;
}

.bubble-image-box {
  max-width: 240px;
  max-height: 200px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 6px;
}

.bubble-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.message-meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--app-text-tertiary);
  padding: 0 4px;
}

.msg-status.sending {
  color: var(--app-text-tertiary);
}

.msg-status.failed {
  color: #ef4444;
}

/* Empty Thread */
.empty-thread-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto;
  text-align: center;
  gap: 6px;
}

.empty-thread-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-tertiary);
  margin-bottom: 6px;
}

.empty-thread-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.empty-thread-sub {
  margin: 0;
  font-size: 13px;
  color: var(--app-text-secondary);
}

/* Skeleton Stream */
.chat-skeleton-stream {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.skeleton-bubble {
  height: 36px;
  border-radius: 16px;
  background: var(--app-surface-secondary);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-bubble.left {
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.skeleton-bubble.right {
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.w-40 { width: 40%; }
.w-50 { width: 50%; }
.w-60 { width: 60%; }
.w-70 { width: 70%; }

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Bottom Composer */
.chat-composer-wrap {
  padding: 14px 20px;
  border-top: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  background: var(--app-surface);
  flex-shrink: 0;
}

.composer-form {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 6px 16px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.1));
  border-radius: 24px;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.composer-form:focus-within {
  border-color: var(--app-primary, #2640DB);
  background: var(--app-surface);
}

.composer-textarea {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1.4;
  color: var(--app-text-primary);
  resize: none;
  outline: none;
  font-family: inherit;
  max-height: 100px;
}

.composer-textarea::placeholder {
  color: var(--app-text-tertiary);
}

.composer-send-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.composer-send-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.04);
}

.composer-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
