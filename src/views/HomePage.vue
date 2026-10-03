<template>
  <!-- Desktop Web View (>= 1200px) -->
  <div v-if="isDesktop" class="desktop-home-page">
    <HomeFeedContent @open-composer="openCreateComposer" />

    <!-- Create Post Modal -->
    <PostComposerModal
      :is-open="showComposer"
      :publishing="publishingPost"
      initial-type="lost"
      @close="showComposer = false"
      @submit="handleDirectCreate"
    />
  </div>

  <!-- Native Mobile & Tablet View (< 1200px) -->
  <ion-page v-else class="home-ion-page">
    <!-- Fixed Mobile Home Header with Notifications, Search, and Filter -->
    <ion-header class="ion-no-border home-ion-header">
      <ion-toolbar class="home-ion-toolbar">
        <div class="header-inner-box">
          <header class="home-top-bar">
            <div v-if="!isSearchActive" class="brand-bar-row">
              <div class="brand-wordmark-wrap">
                <img
                  src="/retrv-text.svg"
                  alt="Retrv"
                  class="home-brand-wordmark"
                />
              </div>
              <div class="header-actions-wrap">
                <button
                  type="button"
                  class="header-icon-btn bell-btn"
                  aria-label="Notifications"
                  @click="showNotificationsModal = true"
                >
                  <Bell :size="21" />
                  <span
                    v-if="unreadCount > 0"
                    class="bell-unread-badge"
                    aria-label="Unread notifications count"
                  >
                    {{ unreadBadgeFormatted }}
                  </span>
                </button>
                <button
                  type="button"
                  class="header-icon-btn"
                  aria-label="Search lost and found posts"
                  @click="openSearch"
                >
                  <Search :size="21" />
                </button>
                <button
                  type="button"
                  class="header-icon-btn filter-btn"
                  :class="{ active: hasActiveFilters }"
                  :aria-label="filterButtonLabel"
                  aria-haspopup="dialog"
                  :aria-expanded="showFilterSheet"
                  @click="showFilterSheet = true"
                >
                  <SlidersHorizontal :size="20" />
                  <span v-if="hasActiveFilters" class="filter-active-count" aria-hidden="true">
                    {{ activeFilterCount }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Expanded Search Row -->
            <div v-else class="expanded-search-bar">
              <Search :size="18" class="search-leading-icon" aria-hidden="true" />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="search"
                class="search-input"
                placeholder="Search lost &amp; found posts..."
                aria-label="Search lost and found posts"
                autocomplete="off"
              />
              <button
                type="button"
                class="header-icon-btn filter-btn"
                :class="{ active: hasActiveFilters }"
                :aria-label="filterButtonLabel"
                aria-haspopup="dialog"
                :aria-expanded="showFilterSheet"
                @click="showFilterSheet = true"
              >
                <SlidersHorizontal :size="20" />
                <span v-if="hasActiveFilters" class="filter-active-count" aria-hidden="true">
                  {{ activeFilterCount }}
                </span>
              </button>
              <button
                type="button"
                class="close-search-btn"
                aria-label="Close search"
                @click="closeSearch"
              >
                <X :size="18" />
              </button>
            </div>
          </header>
        </div>
      </ion-toolbar>
    </ion-header>

    <!-- Native Ionic Content Scroll Host -->
    <ion-content class="feed-content" :fullscreen="false" :force-overscroll="false">
      <!-- Native iOS Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ion-refresh="handleRefresh">
        <ion-refresher-content pulling-icon="arrow-down" refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- Shared Home Feed Content UI -->
      <HomeFeedContent ref="feedContentRef" @open-composer="openCreateComposer" />
    </ion-content>

    <FilterSheetModal
      :is-open="showFilterSheet"
      :applied-filters="appliedFilters"
      @close="showFilterSheet = false"
      @apply="applyFilters"
    />

    <!-- Create Post Modal -->
    <PostComposerModal
      :is-open="showComposer"
      :publishing="publishingPost"
      initial-type="lost"
      @close="showComposer = false"
      @submit="handleDirectCreate"
    />

    <!-- Notifications Sheet Modal -->
    <NotificationsModal
      :is-open="showNotificationsModal"
      @close="showNotificationsModal = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonToolbar
} from "@ionic/vue";
import {
  Bell,
  Search,
  X,
  SlidersHorizontal
} from "lucide-vue-next";
import HomeFeedContent from "../components/feed/HomeFeedContent.vue";
import PostComposerModal from "../components/PostComposerModal.vue";
import FilterSheetModal from "../components/FilterSheetModal.vue";
import NotificationsModal from "../components/NotificationsModal.vue";
import { useNotifications } from "../composables/useNotifications";
import { useFeedFilter } from "../composables/useFeedFilter";
import type { PostFilters } from "../types/post";

const { unreadCount } = useNotifications();

const {
  searchQuery,
  appliedFilters,
  isSearchActive,
  activeFilterCount,
  hasActiveFilters,
  filterButtonLabel,
  clearSearch
} = useFeedFilter();

const isDesktop = ref(
  typeof window !== "undefined" ? window.matchMedia("(min-width: 1200px)").matches : false
);

let mediaQueryList: MediaQueryList | null = null;
const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
  isDesktop.value = e.matches;
};

const showNotificationsModal = ref(false);

const unreadBadgeFormatted = computed(() => {
  if (unreadCount.value <= 0) return "";
  if (unreadCount.value > 99) return "99+";
  return String(unreadCount.value);
});

const showFilterSheet = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);
const feedContentRef = ref<InstanceType<typeof HomeFeedContent> | null>(null);

const openSearch = async () => {
  isSearchActive.value = true;
  await nextTick();
  searchInputRef.value?.focus();
};

const closeSearch = () => {
  clearSearch();
  isSearchActive.value = false;
};

const showComposer = ref(false);
const publishingPost = ref(false);

const applyFilters = (filters: PostFilters) => {
  appliedFilters.value = {
    type: filters.type,
    categories: [...filters.categories],
    subcategories: [...filters.subcategories]
  };
  showFilterSheet.value = false;
};

onMounted(() => {
  if (typeof window !== "undefined") {
    mediaQueryList = window.matchMedia("(min-width: 1200px)");
    isDesktop.value = mediaQueryList.matches;
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleMediaChange);
    } else {
      mediaQueryList.addListener(handleMediaChange);
    }
  }
});

onUnmounted(() => {
  if (mediaQueryList) {
    if (mediaQueryList.removeEventListener) {
      mediaQueryList.removeEventListener("change", handleMediaChange);
    } else {
      mediaQueryList.removeListener(handleMediaChange);
    }
    mediaQueryList = null;
  }
});

const handleRefresh = async (event: CustomEvent) => {
  try {
    await feedContentRef.value?.fetchCurrentFeed(true);
  } finally {
    event.detail.complete();
  }
};

const openCreateComposer = () => {
  showComposer.value = true;
};

const handleDirectCreate = () => {
  showComposer.value = false;
};
</script>

<style scoped>
.desktop-home-page {
  width: 100%;
  max-width: var(--desktop-feed-width, 680px);
  margin: 0 auto;
  display: block;
}

.feed-content {
  --background: var(--app-bg);
}

.home-ion-header {
  background: var(--app-bg);
  border-bottom: 1px solid var(--app-card-border);
  z-index: 100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.home-ion-toolbar {
  --background: var(--app-bg);
  --border-width: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;
  --min-height: 56px;
}

.header-inner-box {
  width: 100%;
  padding: 8px 16px;
  box-sizing: border-box;
}

.home-top-bar {
  width: 100%;
}

.brand-bar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 40px;
}

.brand-wordmark-wrap {
  display: flex;
  align-items: center;
}

.home-brand-wordmark {
  height: 22px;
  width: auto;
  object-fit: contain;
}

.header-actions-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-card-border);
  color: var(--app-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.header-icon-btn:hover {
  background: var(--app-surface);
  color: var(--app-text-primary);
}

.header-icon-btn.active {
  background: var(--app-primary-soft);
  color: var(--app-primary);
  border-color: var(--app-primary);
}

.bell-unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--app-primary);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--app-bg);
}

.filter-active-count {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--app-primary);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--app-bg);
}

.expanded-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
}

.search-leading-icon {
  color: var(--app-text-tertiary);
  margin-left: 4px;
}

.search-input {
  flex: 1;
  height: 36px;
  background: var(--app-input-background, var(--app-surface-secondary));
  border: 1px solid var(--app-input-border, var(--app-card-border));
  border-radius: 18px;
  padding: 0 14px;
  font-size: 14px;
  color: var(--app-text-primary);
  outline: none;
}

.close-search-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--app-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
