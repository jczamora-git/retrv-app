<template>
  <aside class="desktop-sidebar-root" aria-label="Desktop Navigation and Filters">
    <!-- Primary Navigation Section -->
    <nav class="sidebar-nav-section" aria-label="Primary Navigation">
      <ul class="nav-items-list" role="list">
        <!-- Home -->
        <li role="listitem">
          <button
            type="button"
            class="sidebar-nav-link"
            :class="{ active: currentTab === 'home' }"
            :aria-current="currentTab === 'home' ? 'page' : undefined"
            @click="handleNav('home')"
          >
            <div class="nav-icon-wrap">
              <House :size="20" :stroke-width="currentTab === 'home' ? 2.3 : 1.9" />
            </div>
            <span class="nav-link-label">Home</span>
          </button>
        </li>

        <!-- Messages -->
        <li role="listitem">
          <button
            type="button"
            class="sidebar-nav-link"
            :class="{ active: currentTab === 'messages' }"
            :aria-current="currentTab === 'messages' ? 'page' : undefined"
            @click="handleNav('messages')"
          >
            <div class="nav-icon-wrap relative-icon">
              <MessageCircle :size="20" :stroke-width="currentTab === 'messages' ? 2.3 : 1.9" />
              <span
                v-if="messageUnreadCount > 0"
                class="sidebar-unread-dot"
                aria-label="Unread messages"
              ></span>
            </div>
            <span class="nav-link-label">Messages</span>
            <span
              v-if="messageUnreadCount > 0"
              class="unread-count-pill"
            >
              {{ unreadCountFormatted }}
            </span>
          </button>
        </li>

        <!-- Profile -->
        <li role="listitem">
          <button
            type="button"
            class="sidebar-nav-link"
            :class="{ active: currentTab === 'profile' }"
            :aria-current="currentTab === 'profile' ? 'page' : undefined"
            @click="handleNav('profile')"
          >
            <div class="nav-icon-wrap">
              <UserRound :size="20" :stroke-width="currentTab === 'profile' ? 2.3 : 1.9" />
            </div>
            <span class="nav-link-label">Profile</span>
          </button>
        </li>

        <!-- Explore Maps (Placeholder Only) -->
        <li role="listitem">
          <button
            type="button"
            class="sidebar-nav-link disabled-link"
            aria-disabled="true"
            title="Explore Maps is coming in a future update"
            @click="handleMapsClick"
          >
            <div class="nav-icon-wrap">
              <MapPin :size="20" :stroke-width="1.8" />
            </div>
            <span class="nav-link-label">Explore Maps</span>
            <span class="coming-soon-badge">Soon</span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Visual Separator -->
    <div class="sidebar-divider" role="separator" aria-hidden="true"></div>

    <!-- Category Filters Section -->
    <section class="sidebar-filter-section" aria-label="Category Filters">
      <div class="filter-header-row">
        <span class="filter-heading">Filters</span>
        <button
          v-if="appliedFilters.categories.length > 0"
          type="button"
          class="clear-filters-link"
          aria-label="Clear selected category filters"
          @click="clearCategoryFilters"
        >
          Clear
        </button>
      </div>

      <ul class="categories-list" role="list">
        <li
          v-for="cat in visibleCategories"
          :key="cat.key"
          role="listitem"
        >
          <button
            type="button"
            class="category-filter-item"
            :class="{ selected: isCategorySelected(cat.name) }"
            :aria-pressed="isCategorySelected(cat.name)"
            @click="handleCategoryClick(cat.name)"
          >
            <span class="category-bullet" aria-hidden="true"></span>
            <span class="category-name">{{ cat.name }}</span>
          </button>
        </li>
      </ul>

      <!-- Show more / Show less toggle -->
      <button
        v-if="MAIN_CATEGORIES.length > INITIAL_CATEGORY_COUNT"
        type="button"
        class="show-more-toggle-btn"
        :aria-expanded="isExpanded"
        @click="isExpanded = !isExpanded"
      >
        <span>{{ isExpanded ? "Show less" : `Show more (${MAIN_CATEGORIES.length - INITIAL_CATEGORY_COUNT})` }}</span>
        <component :is="isExpanded ? ChevronUp : ChevronDown" :size="15" aria-hidden="true" />
      </button>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  House,
  MessageCircle,
  UserRound,
  MapPin,
  ChevronDown,
  ChevronUp
} from "lucide-vue-next";
import { MAIN_CATEGORIES } from "../../config/categories";
import { useFeedFilter } from "../../composables/useFeedFilter";
import { useMessageUnread } from "../../composables/useMessageUnread";
import { toastController } from "@ionic/vue";

const INITIAL_CATEGORY_COUNT = 7;

withDefaults(
  defineProps<{
    currentTab?: "home" | "messages" | "profile";
  }>(),
  {
    currentTab: "home"
  }
);

const emit = defineEmits<{
  "select-tab": [tab: "home" | "messages" | "profile"];
}>();

const router = useRouter();
const { messageUnreadCount } = useMessageUnread();
const { appliedFilters, isCategorySelected, toggleCategory } = useFeedFilter();

const isExpanded = ref(false);

const visibleCategories = computed(() => {
  if (isExpanded.value) return MAIN_CATEGORIES;
  return MAIN_CATEGORIES.slice(0, INITIAL_CATEGORY_COUNT);
});

const unreadCountFormatted = computed(() => {
  if (messageUnreadCount.value <= 0) return "";
  if (messageUnreadCount.value > 99) return "99+";
  return String(messageUnreadCount.value);
});

const handleNav = (tab: "home" | "messages" | "profile") => {
  emit("select-tab", tab);
};

const handleMapsClick = async () => {
  const toast = await toastController.create({
    message: "Explore Maps is coming soon in a future update.",
    duration: 2500,
    position: "bottom"
  });
  await toast.present();
};

const handleCategoryClick = (categoryName: string) => {
  toggleCategory(categoryName);
  // Ensure we are on home tab to see the filtered feed
  if (!window.location.pathname.includes("/tabs/home")) {
    router.push("/tabs/home");
  }
};

const clearCategoryFilters = () => {
  appliedFilters.value.categories = [];
  appliedFilters.value.subcategories = [];
};
</script>

<style scoped>
.desktop-sidebar-root {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 0 24px 0;
  user-select: none;
}

/* Primary Navigation */
.sidebar-nav-section {
  width: 100%;
}

.nav-items-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-nav-link {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--app-text-secondary);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.1px;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.sidebar-nav-link:hover:not(.disabled-link) {
  background-color: var(--app-surface-secondary);
  color: var(--app-text-primary);
}

.sidebar-nav-link.active {
  background-color: var(--app-primary-soft, rgba(38, 64, 219, 0.10));
  color: var(--app-primary, #2640DB);
  font-weight: 600;
}

.sidebar-nav-link:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 1px;
}

.nav-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: inherit;
  flex-shrink: 0;
}

.relative-icon {
  position: relative;
}

.sidebar-unread-dot {
  position: absolute;
  top: -1px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ef4444;
  border: 1.5px solid var(--app-surface);
}

.nav-link-label {
  flex: 1;
}

.unread-count-pill {
  font-size: 11px;
  font-weight: 700;
  background-color: #ef4444;
  color: #ffffff;
  padding: 1px 7px;
  border-radius: 10px;
}

.disabled-link {
  opacity: 0.65;
  cursor: default;
}

.coming-soon-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: var(--app-surface-tertiary, #E8ECEF);
  color: var(--app-text-tertiary);
  padding: 2px 6px;
  border-radius: 6px;
}

/* Divider */
.sidebar-divider {
  width: 100%;
  height: 1px;
  background-color: var(--app-border, rgba(20, 25, 30, 0.08));
  margin: 18px 0;
}

/* Filters Section */
.sidebar-filter-section {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.filter-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 10px 14px;
}

.filter-heading {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--app-text-tertiary);
}

.clear-filters-link {
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-primary);
  cursor: pointer;
  padding: 0;
}

.clear-filters-link:hover {
  text-decoration: underline;
}

.categories-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-filter-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-radius: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--app-text-secondary);
  font-size: 14px;
  font-weight: 450;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.category-filter-item:hover {
  background-color: var(--app-surface-secondary);
  color: var(--app-text-primary);
}

.category-filter-item.selected {
  background-color: var(--app-primary-soft, rgba(38, 64, 219, 0.10));
  color: var(--app-primary, #2640DB);
  font-weight: 600;
}

.category-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--app-text-tertiary);
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.category-filter-item.selected .category-bullet {
  background-color: var(--app-primary);
  transform: scale(1.3);
}

.category-name {
  flex: 1;
}

.show-more-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  color: var(--app-text-tertiary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.show-more-toggle-btn:hover {
  color: var(--app-text-primary);
  background-color: var(--app-surface-secondary);
}

.show-more-toggle-btn:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 1px;
}
</style>
