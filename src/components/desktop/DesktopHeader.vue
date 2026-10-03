<template>
  <header class="desktop-header-root">
    <div class="desktop-header-inner">
      <!-- Left: Retrv Wordmark / Brand -->
      <div class="desktop-brand-col">
        <button
          type="button"
          class="brand-link-btn"
          aria-label="Retrv Home"
          @click="handleBrandClick"
        >
          <img
            src="/retrv-text.svg"
            alt="Retrv"
            class="desktop-brand-wordmark"
          />
        </button>
      </div>

      <!-- Center: Dedicated Search Field -->
      <div class="desktop-search-col">
        <div class="desktop-search-box" :class="{ focused: isSearchFocused }">
          <Search :size="18" class="search-lead-icon" aria-hidden="true" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            class="desktop-search-input"
            placeholder="Search lost or found items..."
            aria-label="Search lost or found items"
            autocomplete="off"
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
            @keydown.esc="clearSearch"
          />
          <button
            v-if="searchQuery.trim()"
            type="button"
            class="search-clear-btn"
            aria-label="Clear search query"
            @click="clearSearch"
          >
            <X :size="16" />
          </button>
        </div>
      </div>

      <!-- Right: Actions (Create Report, Notifications, Profile) -->
      <div class="desktop-actions-col">
        <!-- Create Report Button -->
        <button
          type="button"
          class="desktop-create-btn"
          aria-label="Create Report"
          @click="$emit('open-create')"
        >
          <Plus :size="18" class="create-btn-icon" aria-hidden="true" />
          <span class="create-btn-text">Create Report</span>
        </button>

        <!-- Notification Bell -->
        <button
          type="button"
          class="desktop-icon-btn bell-btn"
          aria-label="Notifications"
          @click="$emit('open-notifications')"
        >
          <Bell :size="20" class="action-icon" aria-hidden="true" />
          <span
            v-if="unreadCount > 0"
            class="desktop-bell-badge"
            aria-label="Unread notifications count"
          >
            {{ unreadBadgeFormatted }}
          </span>
        </button>

        <!-- Profile Avatar Link -->
        <button
          type="button"
          class="desktop-profile-btn"
          aria-label="My Profile"
          @click="handleProfileClick"
        >
          <UserAvatar
            :name="currentProfile?.name || 'User'"
            :username="currentProfile?.username || 'member'"
            :avatar-url="currentProfile?.avatarUrl"
            size="sm"
          />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Search, Plus, Bell, X } from "lucide-vue-next";
import UserAvatar from "../UserAvatar.vue";
import { useAuth } from "../../composables/useAuth";
import { useFeedFilter } from "../../composables/useFeedFilter";

const props = withDefaults(
  defineProps<{
    unreadCount?: number;
  }>(),
  {
    unreadCount: 0
  }
);

defineEmits<{
  "open-create": [];
  "open-notifications": [];
}>();

const router = useRouter();
const { currentProfile } = useAuth();
const { searchQuery, clearSearch } = useFeedFilter();

const isSearchFocused = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

const unreadBadgeFormatted = computed(() => {
  if (props.unreadCount <= 0) return "";
  if (props.unreadCount > 99) return "99+";
  return String(props.unreadCount);
});

const handleBrandClick = () => {
  clearSearch();
  router.push("/tabs/home");
};

const handleProfileClick = () => {
  router.push("/tabs/profile");
};
</script>

<style scoped>
.desktop-header-root {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 120;
  width: 100%;
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.desktop-header-inner {
  width: 100%;
  max-width: 100%;
  height: 64px;
  padding: 0 24px 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  box-sizing: border-box;
}

/* Brand Column (Anchored left, matching 240px left rail) */
.desktop-brand-col {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.brand-link-btn {
  background: transparent;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  outline: none;
  transition: opacity 0.15s ease;
}

.brand-link-btn:hover {
  opacity: 0.85;
}

.brand-link-btn:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 4px;
}

.desktop-brand-wordmark {
  height: 26px;
  width: auto;
  object-fit: contain;
}

/* Search Column (Positioned in main content area) */
.desktop-search-col {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  max-width: 520px;
  margin-left: 20px;
}

.desktop-search-box {
  width: 100%;
  height: 42px;
  background: var(--app-input-background, #F2F4F7);
  border: 1px solid var(--app-input-border, rgba(20, 25, 30, 0.08));
  border-radius: 21px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 10px;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.desktop-search-box.focused {
  background: var(--app-surface);
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-soft, rgba(38, 64, 219, 0.12));
}

.search-lead-icon {
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.desktop-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--app-text-primary);
  font-family: inherit;
  width: 100%;
}

.desktop-search-input::placeholder {
  color: var(--app-text-tertiary);
}

.search-clear-btn {
  background: transparent;
  border: none;
  color: var(--app-text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.search-clear-btn:hover {
  color: var(--app-text-primary);
  background-color: var(--app-surface-secondary);
}

/* Actions Column */
.desktop-actions-col {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.desktop-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  border-radius: 20px;
  padding: 8px 18px;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.1px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(38, 64, 219, 0.25);
  transition: background-color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
}

.desktop-create-btn:hover {
  background: var(--app-primary-deep, #0019B7);
  box-shadow: 0 4px 12px rgba(38, 64, 219, 0.35);
  transform: translateY(-1px);
}

.desktop-create-btn:active {
  transform: translateY(0);
}

.desktop-create-btn:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.create-btn-icon {
  stroke-width: 2.2;
}

.desktop-icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: var(--app-surface-secondary, #F2F4F7);
  border: 1px solid var(--app-border);
  color: var(--app-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.12s ease, color 0.15s ease;
}

.desktop-icon-btn:hover {
  background-color: var(--app-surface-tertiary, #E8ECEF);
  color: var(--app-primary);
  transform: translateY(-1px);
}

.desktop-icon-btn:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}

.desktop-bell-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background-color: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--app-surface);
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
}

.desktop-profile-btn {
  background: transparent;
  border: none;
  padding: 2px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.desktop-profile-btn:hover {
  transform: scale(1.06);
}

.desktop-profile-btn:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}
</style>
