<template>
  <div class="desktop-notifications-page">
    <div class="desktop-notifications-container">
      <!-- Top Card / Header Section -->
      <header class="notifications-page-header">
        <div class="header-main-row">
          <div class="title-wrap">
            <h1 class="notifications-title">Notifications</h1>
            <span v-if="unreadCount > 0" class="unread-pill">
              {{ unreadCount }} new
            </span>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="btn-mark-all-read"
              :disabled="unreadCount === 0 || isMarkingAllRead"
              @click="handleMarkAllRead"
            >
              <CheckCheck :size="16" />
              <span>Mark all as read</span>
            </button>
          </div>
        </div>

        <!-- Filter Tabs (All / Unread) -->
        <div class="notifications-filter-tabs" role="tablist" aria-label="Notification Filters">
          <button
            type="button"
            role="tab"
            class="filter-tab-btn"
            :class="{ active: activeFilter === 'all' }"
            :aria-selected="activeFilter === 'all'"
            @click="activeFilter = 'all'"
          >
            <span>All</span>
            <span class="tab-badge">{{ notifications.length }}</span>
          </button>

          <button
            type="button"
            role="tab"
            class="filter-tab-btn"
            :class="{ active: activeFilter === 'unread' }"
            :aria-selected="activeFilter === 'unread'"
            @click="activeFilter = 'unread'"
          >
            <span>Unread</span>
            <span v-if="unreadCount > 0" class="tab-badge unread-badge">{{ unreadCount }}</span>
          </button>
        </div>
      </header>

      <!-- Main Feed Surface -->
      <main class="notifications-feed-card" aria-label="Notifications Feed">
        <!-- 1. Loading Skeletons -->
        <div v-if="loading && notifications.length === 0" class="notifications-loading-feed">
          <div v-for="i in 5" :key="i" class="skeleton-notif-row">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-text-block">
              <div class="skeleton-line line-primary"></div>
              <div class="skeleton-line line-snippet"></div>
              <div class="skeleton-line line-meta"></div>
            </div>
          </div>
        </div>

        <!-- 2. Error State -->
        <div v-else-if="error" class="notifications-error-state">
          <div class="error-icon-box">
            <AlertCircle :size="28" />
          </div>
          <h3 class="error-title">Couldn't load notifications</h3>
          <p class="error-subtitle">There was an issue fetching your latest notifications.</p>
          <button type="button" class="btn-retry" @click="handleRetry">
            <RotateCcw :size="15" />
            <span>Retry</span>
          </button>
        </div>

        <!-- 3. Empty State: No notifications at all -->
        <div v-else-if="notifications.length === 0" class="notifications-empty-state">
          <div class="empty-icon-wrap">
            <Bell :size="36" />
          </div>
          <h2 class="empty-title">No notifications yet</h2>
          <p class="empty-subtitle">
            Updates about your reports, comments, messages, and recoveries will appear here.
          </p>
        </div>

        <!-- 4. Empty State: All caught up (Unread filter empty) -->
        <div v-else-if="displayedNotifications.length === 0 && activeFilter === 'unread'" class="notifications-empty-state">
          <div class="empty-icon-wrap caught-up-icon">
            <CheckCircle2 :size="36" />
          </div>
          <h2 class="empty-title">You're all caught up</h2>
          <p class="empty-subtitle">
            No unread notifications right now.
          </p>
        </div>

        <!-- 5. Notifications List -->
        <div v-else class="notifications-list" role="list">
          <article
            v-for="item in displayedNotifications"
            :key="item.id"
            class="notification-row"
            :class="{ 'is-unread': !item.read && !item.isRead }"
            role="listitem"
            tabindex="0"
            @click="handleClickNotification(item)"
            @keydown.enter="handleClickNotification(item)"
          >
            <!-- Left: Avatar with Context Type Icon Badge -->
            <div class="notif-avatar-col">
              <div class="avatar-holder">
                <UserAvatar
                  :name="item.actorName || 'User'"
                  :username="item.actorUsername || 'user'"
                  :avatar-url="item.actorAvatarUrl"
                  size="md"
                />
                <div class="notif-type-badge" :class="getTypeBadgeClass(item.type)">
                  <component :is="getTypeIcon(item.type)" :size="12" />
                </div>
              </div>
            </div>

            <!-- Center: Notification Body -->
            <div class="notif-body-col">
              <div class="notif-main-line">
                <span class="actor-name">{{ item.actorName }}</span>
                <span class="action-phrase" :class="{ 'merit-phrase': isMeritType(item.type) }">
                  {{ getActionPhrase(item.type) }}
                </span>
              </div>

              <!-- Message/Comment Snippet (if available) -->
              <p v-if="hasMessageSnippet(item)" class="notif-snippet">
                &ldquo;{{ item.message || item.text }}&rdquo;
              </p>

              <!-- Meta line: Time + Post Reference -->
              <div class="notif-meta-line">
                <time class="notif-time">{{ formatTime(item.createdAt) }}</time>
                <span v-if="item.postTitle" class="post-title-ref">
                  &bull; {{ item.postTitle }}
                </span>
              </div>
            </div>

            <!-- Right: Unread Indicator -->
            <div class="notif-status-col">
              <span
                v-if="!item.read && !item.isRead"
                class="unread-dot"
                aria-label="Unread notification"
                title="Unread"
              ></span>
            </div>
          </article>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  MessageCircle,
  MessageSquare,
  Reply,
  Award,
  BadgeCheck,
  FileText,
  PlusCircle
} from "lucide-vue-next";
import UserAvatar from "../../components/UserAvatar.vue";
import { useNotifications } from "../../composables/useNotifications";
import type { AppNotification, NotificationType } from "../../types/notification";

const router = useRouter();
const {
  notifications,
  loading,
  unreadCount,
  loadNotifications,
  markAsRead,
  markAllAsRead
} = useNotifications();

const activeFilter = ref<"all" | "unread">("all");
const isMarkingAllRead = ref(false);
const error = ref(false);

onMounted(async () => {
  try {
    error.value = false;
    await loadNotifications();
  } catch (err) {
    error.value = true;
  }
});

const handleRetry = async () => {
  try {
    error.value = false;
    await loadNotifications();
  } catch (err) {
    error.value = true;
  }
};

const displayedNotifications = computed(() => {
  if (activeFilter.value === "unread") {
    return notifications.value.filter((n) => !n.read && !n.isRead);
  }
  return notifications.value;
});

const handleMarkAllRead = async () => {
  if (unreadCount.value === 0 || isMarkingAllRead.value) return;
  isMarkingAllRead.value = true;
  try {
    await markAllAsRead();
  } finally {
    isMarkingAllRead.value = false;
  }
};

const handleClickNotification = async (item: AppNotification) => {
  if (!item.read && !item.isRead) {
    await markAsRead(item.id);
  }

  // Deep-link to relevant target
  if (item.type === "message" && item.conversationId) {
    router.push(`/chat/${item.conversationId}`);
  } else if (item.type === "merit" || item.type === "merit_awarded") {
    router.push({ name: "Profile" });
  } else if (item.postId) {
    router.push(`/post/${item.postId}`);
  } else if (item.actorId && item.actorId !== "anonymous") {
    router.push(`/profile/${item.actorId}`);
  }
};

const formatTime = (timestamp: number): string => {
  if (!timestamp) return "just now";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isMeritType = (type: NotificationType) => {
  return type === "merit" || type === "merit_awarded";
};

const hasMessageSnippet = (item: AppNotification) => {
  return (
    Boolean(item.message || item.text) &&
    item.type !== "merit" &&
    item.type !== "merit_awarded"
  );
};

const getActionPhrase = (type: NotificationType): string => {
  switch (type) {
    case "merit":
    case "merit_awarded":
      return "awarded you a Community Merit 🏅";
    case "reply":
      return "replied to your comment";
    case "message":
      return "sent you a direct message";
    case "resolved_post":
      return "marked report resolved";
    case "new_post":
      return "posted a new report";
    case "post_update":
      return "updated report status";
    default:
      return "commented on your report";
  }
};

const getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case "message":
      return MessageCircle;
    case "reply":
      return Reply;
    case "merit":
    case "merit_awarded":
      return Award;
    case "resolved_post":
      return BadgeCheck;
    case "new_post":
      return PlusCircle;
    default:
      return MessageSquare;
  }
};

const getTypeBadgeClass = (type: NotificationType): string => {
  switch (type) {
    case "merit":
    case "merit_awarded":
      return "type-merit";
    case "message":
      return "type-message";
    case "resolved_post":
      return "type-resolved";
    case "new_post":
      return "type-new-post";
    default:
      return "type-comment";
  }
};
</script>

<style scoped>
.desktop-notifications-page {
  width: 100%;
  min-height: calc(100vh - var(--desktop-header-height, 64px));
  background: var(--app-bg);
  box-sizing: border-box;
}

.desktop-notifications-container {
  max-width: 780px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ----------------------------------------------------
   HEADER SECTION
   ---------------------------------------------------- */
.notifications-page-header {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 20px 24px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.header-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notifications-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0;
  letter-spacing: -0.015em;
}

.unread-pill {
  font-size: 12px;
  font-weight: 700;
  color: var(--retrv-primary);
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.10));
  padding: 3px 10px;
  border-radius: 9999px;
}

.btn-mark-all-read {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--app-border);
  color: var(--app-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-mark-all-read:hover:not(:disabled) {
  background: var(--app-surface-secondary);
  color: var(--retrv-primary);
  border-color: var(--app-border-strong);
}

.btn-mark-all-read:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Filter Tabs */
.notifications-filter-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid var(--app-border);
  padding-top: 12px;
}

.filter-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--app-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-tab-btn:hover {
  background: var(--app-surface-secondary);
  color: var(--app-text-primary);
}

.filter-tab-btn.active {
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
  color: var(--retrv-primary);
  font-weight: 600;
}

.tab-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 9999px;
  background: var(--app-border);
  color: var(--app-text-secondary);
}

.filter-tab-btn.active .tab-badge {
  background: rgba(38, 64, 219, 0.15);
  color: var(--retrv-primary);
}

.unread-badge {
  background: var(--retrv-primary);
  color: #ffffff;
}

.filter-tab-btn.active .unread-badge {
  background: var(--retrv-primary);
  color: #ffffff;
}

/* ----------------------------------------------------
   NOTIFICATIONS FEED CARD
   ---------------------------------------------------- */
.notifications-feed-card {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
}

.notifications-list {
  display: flex;
  flex-direction: column;
}

.notification-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 20px;
  gap: 14px;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid var(--app-border);
  cursor: pointer;
  transition: background-color 0.15s ease;
  outline: none;
}

.notification-row:last-child {
  border-bottom: none;
}

.notification-row:hover {
  background-color: var(--app-surface-secondary);
}

.notification-row:focus-visible {
  background-color: var(--app-surface-secondary);
  box-shadow: inset 0 0 0 2px var(--retrv-primary);
}

/* Subtle Unread Tint */
.notification-row.is-unread {
  background-color: rgba(38, 64, 219, 0.035);
}

.notification-row.is-unread:hover {
  background-color: rgba(38, 64, 219, 0.06);
}

/* Avatar & Icon Badge */
.notif-avatar-col {
  display: flex;
  justify-content: center;
}

.avatar-holder {
  position: relative;
  width: 44px;
  height: 44px;
}

.notif-type-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--app-surface);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.type-comment {
  background: var(--retrv-primary);
  color: #ffffff;
}

.type-message {
  background: #3b82f6;
  color: #ffffff;
}

.type-merit {
  background: #f59e0b;
  color: #ffffff;
}

.type-resolved {
  background: #10b981;
  color: #ffffff;
}

.type-new-post {
  background: #8b5cf6;
  color: #ffffff;
}

/* Notification Body */
.notif-body-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.notif-main-line {
  font-size: 14px;
  line-height: 1.45;
  color: var(--app-text-primary);
}

.actor-name {
  font-weight: 600;
  color: var(--app-text-primary);
  margin-right: 4px;
}

.notification-row.is-unread .actor-name {
  font-weight: 700;
}

.action-phrase {
  color: var(--app-text-secondary);
}

.notification-row.is-unread .action-phrase {
  color: var(--app-text-primary);
}

.merit-phrase {
  color: #d97706;
  font-weight: 600;
}

/* Quote snippet */
.notif-snippet {
  font-size: 13px;
  color: var(--app-text-secondary);
  line-height: 1.4;
  margin: 2px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* Meta info */
.notif-meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--app-text-muted, #94a3b8);
}

.notif-time {
  font-weight: 500;
}

.post-title-ref {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Unread dot */
.notif-status-col {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--retrv-primary);
}

/* ----------------------------------------------------
   EMPTY & ERROR STATES
   ---------------------------------------------------- */
.notifications-empty-state,
.notifications-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  color: var(--app-text-muted, #94a3b8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.caught-up-icon {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0 0 6px;
}

.empty-subtitle {
  font-size: 14px;
  color: var(--app-text-secondary);
  max-width: 380px;
  margin: 0;
  line-height: 1.5;
}

.error-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.10);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.error-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0 0 6px;
}

.error-subtitle {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 0 0 18px;
}

.btn-retry {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 20px;
  border-radius: 9999px;
  background: var(--retrv-primary);
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-retry:hover {
  background: var(--retrv-primary-deep);
}

/* ----------------------------------------------------
   SKELETON LOADING STATE
   ---------------------------------------------------- */
.notifications-loading-feed {
  display: flex;
  flex-direction: column;
}

.skeleton-notif-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--app-border);
}

.skeleton-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
}

.skeleton-text-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  background: var(--app-surface-secondary);
  border-radius: 4px;
}

.line-primary {
  width: 45%;
  height: 14px;
}

.line-snippet {
  width: 75%;
}

.line-meta {
  width: 25%;
}
</style>
