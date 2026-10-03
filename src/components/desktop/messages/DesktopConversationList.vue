<template>
  <aside class="desktop-conv-list-pane" aria-label="Conversations">
    <!-- Pane Header -->
    <header class="conv-list-header">
      <h2 class="conv-list-title">Messages</h2>
      <div class="header-actions">
        <button
          type="button"
          class="icon-action-btn"
          aria-label="Refresh conversations"
          title="Refresh conversations"
          :disabled="loading"
          @click="$emit('refresh')"
        >
          <RefreshCw :size="16" :class="{ spinning: loading }" />
        </button>
      </div>
    </header>

    <!-- Search Conversations Field -->
    <div class="conv-search-wrap">
      <div class="search-input-box">
        <Search :size="16" class="search-icon" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="clear-search-btn"
          aria-label="Clear search"
          @click="searchQuery = ''"
        >
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Conversations Scrollable Area -->
    <div class="conv-list-scroll-area">
      <!-- 1. SKELETON LOADING STATE -->
      <div v-if="loading && conversations.length === 0" class="conv-skeleton-list" aria-label="Loading conversations">
        <div v-for="n in 5" :key="n" class="skeleton-conv-row">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-main">
            <div class="skeleton-line-top">
              <div class="skeleton-bar name-bar"></div>
              <div class="skeleton-bar time-bar"></div>
            </div>
            <div class="skeleton-bar msg-bar"></div>
          </div>
        </div>
      </div>

      <!-- 2. CONNECTION ERROR STATE -->
      <div v-else-if="hasConnectionError && conversations.length === 0" class="conv-empty-box error-box">
        <div class="empty-icon-circle error-circle">
          <WifiOff :size="28" />
        </div>
        <h3 class="empty-title">Connection failed</h3>
        <p class="empty-desc">Could not reach the messaging server.</p>
        <button type="button" class="empty-action-btn" @click="$emit('refresh')">
          <RefreshCw :size="14" />
          <span>Retry</span>
        </button>
      </div>

      <!-- 3. EMPTY INBOX STATE (0 total conversations) -->
      <div v-else-if="conversations.length === 0" class="conv-empty-box">
        <div class="empty-icon-circle">
          <MessageCircle :size="32" />
        </div>
        <h3 class="empty-title">No conversations yet</h3>
        <p class="empty-desc">
          Messages you start from Lost &amp; Found posts will appear here.
        </p>
        <button type="button" class="empty-action-btn" @click="$emit('browse-reports')">
          Browse reports
        </button>
      </div>

      <!-- 4. NO SEARCH MATCHES STATE -->
      <div v-else-if="filteredConversations.length === 0" class="conv-empty-box">
        <div class="empty-icon-circle">
          <Search :size="28" />
        </div>
        <h3 class="empty-title">No results found</h3>
        <p class="empty-desc">No conversations matching "{{ searchQuery }}".</p>
      </div>

      <!-- 5. CONVERSATION ROWS LIST -->
      <div v-else class="conv-rows-stream" role="list">
        <div
          v-for="conv in filteredConversations"
          :key="conv.id"
          role="listitem"
          tabindex="0"
          class="desktop-conv-row"
          :class="{
            active: selectedConversationId === conv.id,
            unread: getUnreadCount(conv) > 0
          }"
          @click="$emit('select', conv.id)"
          @keydown.enter="$emit('select', conv.id)"
        >
          <!-- Participant Avatar -->
          <div class="conv-avatar-wrap">
            <UserAvatar
              :name="conv.otherParticipant?.name || 'User'"
              :username="conv.otherParticipant?.username || 'user'"
              :avatar-url="conv.otherParticipant?.avatarUrl"
              size="md"
            />
            <span
              v-if="getUnreadCount(conv) > 0"
              class="unread-dot-badge"
              aria-label="Unread message"
            ></span>
          </div>

          <!-- Row Content -->
          <div class="conv-row-main">
            <div class="conv-row-top">
              <div class="conv-name-group">
                <span class="conv-user-name">{{ conv.otherParticipant?.name || 'Community Member' }}</span>
                <AchievementBadge :user-id="conv.otherParticipant?.id" :size="13" />
              </div>
              <time class="conv-time">{{ formatRelativeTime(conv.lastMessageAt || conv.updatedAt) }}</time>
            </div>

            <div class="conv-row-bottom">
              <p class="conv-last-msg">
                <span v-if="getThreadPrefix(conv)" class="conv-thread-tag">{{ getThreadPrefix(conv) }} · </span>
                <span>{{ conv.lastMessage || 'Conversation started' }}</span>
              </p>
              <span
                v-if="getUnreadCount(conv) > 0"
                class="conv-unread-pill"
                aria-label="Unread message count"
              >
                {{ getUnreadCount(conv) > 99 ? '99+' : getUnreadCount(conv) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  MessageCircle,
  RefreshCw,
  Search,
  WifiOff,
  X
} from 'lucide-vue-next';
import UserAvatar from '../../UserAvatar.vue';
import AchievementBadge from '../../AchievementBadge.vue';
import { currentAppUserId, sessionUid } from '../../../composables/useAuth';
import type { ConversationWithMeta } from '../../../types/conversation';

const props = defineProps<{
  conversations: ConversationWithMeta[];
  selectedConversationId: string | null;
  loading: boolean;
  hasConnectionError: boolean;
}>();

defineEmits<{
  (e: 'select', id: string): void;
  (e: 'refresh'): void;
  (e: 'browse-reports'): void;
}>();

const searchQuery = ref('');

const getUnreadCount = (conv: ConversationWithMeta): number => {
  const uid = currentAppUserId.value || sessionUid.value;
  if (uid && conv.unreadCounts && typeof conv.unreadCounts[uid] === 'number') {
    return conv.unreadCounts[uid];
  }
  return typeof conv.unreadCount === 'number'
    ? conv.unreadCount
    : conv.unread
    ? 1
    : 0;
};

const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

const getThreadPrefix = (conv: ConversationWithMeta): string | null => {
  const title = conv.lastMessageThreadTitle;
  if (title && title.toLowerCase() !== 'general' && title.trim() !== '') {
    return title.trim();
  }
  return null;
};

const filteredConversations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return props.conversations;

  return props.conversations.filter((conv) => {
    const name = conv.otherParticipant?.name?.toLowerCase() || '';
    const username = conv.otherParticipant?.username?.toLowerCase() || '';
    const lastMsg = conv.lastMessage?.toLowerCase() || '';
    const threadTitle = conv.lastMessageThreadTitle?.toLowerCase() || '';

    return (
      name.includes(q) ||
      username.includes(q) ||
      lastMsg.includes(q) ||
      threadTitle.includes(q)
    );
  });
});
</script>

<style scoped>
.desktop-conv-list-pane {
  width: 360px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--app-surface);
  border-right: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  box-sizing: border-box;
}

/* Header */
.conv-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  min-height: 58px;
  box-sizing: border-box;
}

.conv-list-title {
  margin: 0;
  font-size: 20px;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--app-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  color: var(--app-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-action-btn:hover:not(:disabled) {
  background: var(--app-surface-secondary);
  color: var(--app-text-primary);
}

.icon-action-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Search */
.conv-search-wrap {
  padding: 0 16px 12px;
}

.search-input-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  border-radius: 10px;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.search-input-box:focus-within {
  border-color: var(--app-primary, #2640DB);
  background: var(--app-surface);
}

.search-icon {
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 13.5px;
  color: var(--app-text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--app-text-tertiary);
}

.clear-search-btn {
  background: transparent;
  border: none;
  padding: 0;
  color: var(--app-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn:hover {
  color: var(--app-text-primary);
}

/* Scroll Area */
.conv-list-scroll-area {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--app-border, rgba(20, 25, 30, 0.15)) transparent;
}

.conv-list-scroll-area::-webkit-scrollbar {
  width: 5px;
}

.conv-list-scroll-area::-webkit-scrollbar-thumb {
  background: var(--app-border, rgba(20, 25, 30, 0.15));
  border-radius: 4px;
}

/* Conversation Row */
.conv-rows-stream {
  display: flex;
  flex-direction: column;
}

.desktop-conv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  border-bottom: 1px solid var(--app-border, rgba(20, 25, 30, 0.06));
  outline: none;
}

.desktop-conv-row:hover {
  background-color: var(--app-surface-secondary);
}

.desktop-conv-row.active {
  background-color: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
}

.desktop-conv-row:focus-visible {
  box-shadow: inset 0 0 0 2px var(--app-primary, #2640DB);
}

.conv-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.unread-dot-badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: var(--app-primary, #2640DB);
  border: 1.5px solid var(--app-surface, #ffffff);
}

.conv-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.conv-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.conv-name-group {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
}

.conv-user-name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--app-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desktop-conv-row.unread .conv-user-name {
  font-weight: 750;
}

.conv-time {
  font-size: 12px;
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.conv-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.conv-last-msg {
  margin: 0;
  font-size: 13px;
  color: var(--app-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.desktop-conv-row.unread .conv-last-msg {
  color: var(--app-text-primary);
  font-weight: 600;
}

.conv-thread-tag {
  font-weight: 600;
  color: var(--app-primary, #2640DB);
}

.conv-unread-pill {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background-color: var(--app-primary, #2640DB);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Empty & Error States */
.conv-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 20px;
  gap: 8px;
}

.empty-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-tertiary);
  margin-bottom: 4px;
}

.empty-icon-circle.error-circle {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.empty-desc {
  margin: 0;
  font-size: 13px;
  color: var(--app-text-secondary);
  line-height: 1.4;
  max-width: 240px;
}

.empty-action-btn {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.empty-action-btn:hover {
  opacity: 0.9;
}

/* Skeleton Loading */
.conv-skeleton-list {
  display: flex;
  flex-direction: column;
}

.skeleton-conv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--app-border, rgba(20, 25, 30, 0.06));
}

.skeleton-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  flex-shrink: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.skeleton-bar {
  background: var(--app-surface-secondary);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.name-bar {
  width: 100px;
  height: 14px;
}

.time-bar {
  width: 30px;
  height: 10px;
}

.msg-bar {
  width: 160px;
  height: 12px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>
