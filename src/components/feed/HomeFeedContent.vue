<template>
  <div class="home-feed-content modern-container">
    <!-- Active Filter Removable Chips (Only shown when advanced filters are active) -->
    <div v-if="activeChips.length > 0" class="active-filter-chips-row">
      <button
        v-for="chip in activeChips"
        :key="chip.id"
        type="button"
        class="active-chip-pill"
        :aria-label="`Remove ${chip.label} filter`"
        @click="removeChip(chip)"
      >
        <span>{{ chip.label }}</span>
        <X :size="12" class="chip-x-icon" />
      </button>
      <button
        type="button"
        class="clear-all-chips-btn"
        @click="clearAllFilters"
      >
        Clear all
      </button>
    </div>

    <!-- Social Category Filter Pills -->
    <section class="categories-section" aria-label="Filter posts">
      <div class="compact-filter-row" role="tablist">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          role="tab"
          class="compact-filter-pill"
          :class="{ active: appliedFilters.type === tab.value }"
          :aria-selected="appliedFilters.type === tab.value"
          @click="appliedFilters.type = tab.value"
        >
          <component :is="tab.icon" :size="15" class="pill-icon" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </section>

    <!-- Feed Section Heading -->
    <div class="feed-section-header">
      <div class="feed-title-block">
        <h2 class="feed-title">
          {{ appliedFilters.type === 'All' ? 'Recent Posts' : `${appliedFilters.type} Posts` }}
        </h2>
        <span class="feed-pill-badge">
          {{ filteredPosts.length }}
        </span>
      </div>
    </div>

    <!-- Skeleton Loading State -->
    <div v-if="postsLoading" class="feed-list">
      <PostCardSkeleton :count="3" />
    </div>

    <!-- Error State -->
    <div v-else-if="postsError" class="feed-error-box">
      <AlertCircle :size="32" class="error-icon" />
      <p class="error-title">Couldn't load feed</p>
      <p class="error-sub">{{ postsError }}</p>
      <button type="button" class="retry-btn" @click="() => fetchPosts()">
        Retry
      </button>
    </div>

    <!-- Empty State: Search Results -->
    <div
      v-else-if="filteredPosts.length === 0 && searchQuery.trim()"
      class="feed-empty-state"
    >
      <div class="empty-icon-wrap">
        <Search :size="28" />
      </div>
      <h3 class="empty-title">No posts found</h3>
      <p class="empty-sub">
        No items matching "{{ searchQuery }}". Try checking your spelling or another filter.
      </p>
      <button type="button" class="empty-action-btn" @click="searchQuery = ''">
        Clear Search
      </button>
    </div>

    <div
      v-else-if="filteredPosts.length === 0 && hasActiveFilters"
      class="feed-empty-state"
    >
      <SlidersHorizontal :size="32" />
      <h3 class="empty-title">No matching posts</h3>
      <p class="empty-sub">Try another category or clear your filters to see more posts.</p>
      <button type="button" class="empty-action-btn" @click="clearAllFilters">
        Clear Filters
      </button>
    </div>

    <!-- Empty State: Clean Feed (No logo on Home) -->
    <div
      v-else-if="filteredPosts.length === 0"
      class="feed-empty-state"
    >
      <Inbox :size="40" class="empty-feed-icon" />
      <h3 class="empty-title">No posts yet</h3>
      <p class="empty-sub">Start the community by posting a lost or found item.</p>
      <button
        type="button"
        class="empty-action-btn primary"
        @click="emit('open-composer')"
      >
        Create Post
      </button>
    </div>

    <!-- Posts Timeline Feed -->
    <div v-else class="feed-list">
      <PostCard
        v-for="post in filteredPosts"
        :key="post.id"
        :post="post"
        :is-helpful="isHelpfulByMe(post.id)"
        @toggle-helpful="handleToggleHelpful"
      />
    </div>

    <!-- Infinite Scroll Sentinel & Compact Bottom Status -->
    <div ref="sentinelRef" class="feed-sentinel">
      <div v-if="postsLoadingMore" class="loading-more-box" role="status" aria-label="Loading more posts">
        <div class="loading-more-spinner"></div>
        <span class="loading-more-text">Loading more posts...</span>
      </div>
      <div v-else-if="postsLoadMoreError" class="load-more-error-box">
        <p class="load-more-error-text">{{ postsLoadMoreError }}</p>
        <button type="button" class="load-more-retry-btn" @click="handleRetryLoadMore">
          Retry
        </button>
      </div>
      <div v-else-if="!postsHasMore && filteredPosts.length > 0" class="caught-up-box">
        <span class="caught-up-text">You're all caught up</span>
      </div>
    </div>

    <!-- Bottom Spacing for Floating Dock (Mobile only) -->
    <div v-if="!isDesktop" class="dock-spacer"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from "vue";
import {
  Search,
  X,
  AlertCircle,
  Inbox,
  SlidersHorizontal
} from "lucide-vue-next";
import PostCard from "../PostCard.vue";
import PostCardSkeleton from "../PostCardSkeleton.vue";
import { useCategories } from "../../composables/useCategories";
import { usePosts } from "../../composables/usePosts";
import { useProfiles } from "../../composables/useProfiles";
import { useFeedFilter } from "../../composables/useFeedFilter";
import { normalizeCategoryKey } from "../../config/categories";

const emit = defineEmits<{
  (e: "open-composer"): void;
}>();

const {
  postsLoading,
  postsLoadingMore,
  postsHasMore,
  postsError,
  postsLoadMoreError,
  fetchPosts,
  loadMorePosts,
  getFilteredPosts,
  toggleHelpful,
  isHelpfulByMe
} = usePosts();
const { loadProfiles } = useProfiles();
const { getSubcategoriesForCategory } = useCategories();

const {
  searchQuery,
  debouncedSearchQuery,
  appliedFilters,
  hasActiveFilters,
  filterTabs,
  clearAllFilters
} = useFeedFilter();

const isDesktop = ref(
  typeof window !== "undefined" ? window.matchMedia("(min-width: 1200px)").matches : false
);

let mediaQueryList: MediaQueryList | null = null;
const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
  isDesktop.value = e.matches;
  nextTick(() => {
    setupInfiniteScroll();
  });
};

interface FilterChip {
  id: string;
  group: "category" | "subcategory";
  label: string;
}

const activeChips = computed<FilterChip[]>(() => [
  ...appliedFilters.value.categories.map((label) => ({
    id: `category:${normalizeCategoryKey(label)}`,
    group: "category" as const,
    label
  })),
  ...appliedFilters.value.subcategories.map((label) => ({
    id: `subcategory:${normalizeCategoryKey(label)}`,
    group: "subcategory" as const,
    label
  }))
]);

const removeChip = (chip: FilterChip) => {
  const key = normalizeCategoryKey(chip.label);
  if (chip.group === "subcategory") {
    appliedFilters.value.subcategories = appliedFilters.value.subcategories.filter(
      (name) => normalizeCategoryKey(name) !== key
    );
    return;
  }

  appliedFilters.value.categories = appliedFilters.value.categories.filter(
    (name) => normalizeCategoryKey(name) !== key
  );
  const allowedSubcategories = new Set(
    appliedFilters.value.categories.flatMap(getSubcategoriesForCategory).map(normalizeCategoryKey)
  );
  appliedFilters.value.subcategories = appliedFilters.value.subcategories.filter(
    (name) => allowedSubcategories.has(normalizeCategoryKey(name))
  );
};

const sentinelRef = ref<HTMLElement | null>(null);
let infiniteScrollObserver: IntersectionObserver | null = null;

const fetchCurrentFeed = (isRefresh = false) => {
  fetchPosts({
    filter: appliedFilters.value.type,
    search: debouncedSearchQuery.value,
    categories: appliedFilters.value.categories,
    subcategories: appliedFilters.value.subcategories,
    isRefresh
  });
};

const getScrollRoot = (): Element | null => {
  if (typeof document === "undefined") return null;
  if (isDesktop.value) {
    return document.querySelector(".desktop-app-shell") || document.querySelector(".app-shell-page");
  }
  return null;
};

const setupInfiniteScroll = () => {
  if (typeof IntersectionObserver === "undefined") return;
  if (infiniteScrollObserver) {
    infiniteScrollObserver.disconnect();
    infiniteScrollObserver = null;
  }

  infiniteScrollObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        if (!postsLoading.value && !postsLoadingMore.value && postsHasMore.value) {
          loadMorePosts();
        }
      }
    },
    {
      root: getScrollRoot(),
      rootMargin: "300px",
      threshold: 0
    }
  );

  if (sentinelRef.value) {
    infiniteScrollObserver.observe(sentinelRef.value);
  }
};

watch(sentinelRef, (newEl) => {
  if (newEl && infiniteScrollObserver) {
    infiniteScrollObserver.disconnect();
    infiniteScrollObserver.observe(newEl);
  }
});

watch(
  [
    () => appliedFilters.value.type,
    () => appliedFilters.value.categories,
    () => appliedFilters.value.subcategories,
    debouncedSearchQuery
  ],
  () => {
    fetchCurrentFeed(false);
  },
  { deep: true }
);

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
  nextTick(() => {
    setupInfiniteScroll();
  });
  fetchCurrentFeed(false);
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
  if (infiniteScrollObserver) {
    infiniteScrollObserver.disconnect();
    infiniteScrollObserver = null;
  }
});

const filteredPosts = computed(() => {
  return getFilteredPosts(appliedFilters.value.type, debouncedSearchQuery.value, appliedFilters.value);
});

watchEffect(() => {
  if (filteredPosts.value && filteredPosts.value.length > 0) {
    loadProfiles(filteredPosts.value.map((p) => p.authorId));
  }
});

const handleRetryLoadMore = () => {
  loadMorePosts();
};

const handleToggleHelpful = async (postId: string) => {
  await toggleHelpful(postId);
};

defineExpose({
  fetchCurrentFeed
});
</script>

<style scoped>
.home-feed-content {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.modern-container {
  padding: 16px 16px 24px 16px;
  display: flex;
  flex-direction: column;
}

.active-filter-chips-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.active-chip-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-card-border);
  color: var(--app-text-primary);
  padding: 6px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.active-chip-pill:hover {
  background: var(--app-surface);
  border-color: var(--app-primary);
}

.chip-x-icon {
  color: var(--app-text-tertiary);
}

.clear-all-chips-btn {
  background: transparent;
  border: none;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
}

.clear-all-chips-btn:hover {
  text-decoration: underline;
}

.categories-section {
  margin-bottom: 16px;
}

.compact-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.compact-filter-row::-webkit-scrollbar {
  display: none;
}

.compact-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
  background: var(--app-surface);
  color: var(--app-text-secondary);
  border: 1px solid var(--app-card-border);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.compact-filter-pill.active {
  background: var(--app-primary);
  color: #ffffff;
  border-color: var(--app-primary);
}

.pill-icon {
  flex-shrink: 0;
}

.feed-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.feed-title-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feed-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--app-text-primary);
  letter-spacing: -0.2px;
}

.feed-pill-badge {
  background: var(--app-surface-secondary);
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feed-error-box,
.feed-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  background: var(--app-surface);
  border: 1px solid var(--app-card-border);
  border-radius: 16px;
  margin-top: 8px;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--app-surface-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-secondary);
  margin-bottom: 16px;
}

.empty-feed-icon,
.error-icon {
  color: var(--app-text-tertiary);
  margin-bottom: 16px;
}

.error-icon {
  color: var(--ion-color-danger, #ef4444);
}

.empty-title,
.error-title {
  margin: 0 0 6px 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.empty-sub,
.error-sub {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--app-text-secondary);
  max-width: 320px;
  line-height: 1.4;
}

.empty-action-btn,
.retry-btn {
  background: var(--app-surface-secondary);
  color: var(--app-text-primary);
  border: 1px solid var(--app-card-border);
  border-radius: 10px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.empty-action-btn.primary {
  background: var(--app-primary);
  color: #ffffff;
  border-color: var(--app-primary);
}

.retry-btn {
  background: var(--app-primary);
  color: #ffffff;
  border: none;
}

.dock-spacer {
  height: 70px;
}

/* Infinite Scroll Sentinel & Compact Bottom Status */
.feed-sentinel {
  width: 100%;
  min-height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0;
}

.loading-more-box {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--app-text-secondary);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--app-surface-secondary);
}

.loading-more-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--app-separator, rgba(255, 255, 255, 0.12));
  border-top-color: var(--app-primary);
  border-radius: 50%;
  animation: sentinel-spin 0.7s linear infinite;
}

@keyframes sentinel-spin {
  to {
    transform: rotate(360deg);
  }
}

.load-more-error-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 12px;
  background: var(--app-surface);
  border: 1px solid var(--app-card-border);
}

.load-more-error-text {
  margin: 0;
  font-size: 13px;
  color: var(--ion-color-danger, #ef4444);
}

.load-more-retry-btn {
  background: var(--app-primary);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.caught-up-box {
  padding: 16px 0;
  text-align: center;
}

.caught-up-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--app-text-tertiary, rgba(255, 255, 255, 0.4));
  letter-spacing: 0.2px;
}

/* Tablet & Desktop Adjustments */
@media (min-width: 768px) and (max-width: 1199.98px) {
  .modern-container {
    max-width: var(--max-content-width, 720px);
    margin: 0 auto;
  }
}

@media (min-width: 1200px) {
  .modern-container {
    padding: 24px 0 80px 0;
    width: 100%;
    max-width: var(--desktop-feed-width, 680px);
    margin: 0 auto;
  }

  .categories-section {
    margin-bottom: 4px;
  }

  .compact-filter-pill:hover {
    background: var(--app-surface-secondary);
    color: var(--app-text-primary);
  }

  .compact-filter-pill.active:hover {
    background: var(--app-primary-soft);
    color: var(--app-primary);
  }

  .dock-spacer {
    display: none !important;
  }
}
</style>
