<template>
  <nav class="desktop-nav-sidebar-root" aria-label="Desktop Navigation and Filters">
    <!-- Primary Navigation Section -->
    <div class="sidebar-nav-section">
      <ul class="nav-items-list" role="list">
        <!-- Home -->
        <li role="listitem">
          <button
            type="button"
            class="sidebar-nav-link"
            :class="{ active: isHomeActive }"
            :aria-current="isHomeActive ? 'page' : undefined"
            @click="handleNav('home')"
          >
            <div class="nav-icon-wrap">
              <House :size="20" :stroke-width="isHomeActive ? 2.3 : 1.9" />
            </div>
            <span class="nav-link-label">Home</span>
          </button>
        </li>

        <!-- Messages -->
        <li role="listitem">
          <button
            type="button"
            class="sidebar-nav-link"
            :class="{ active: isMessagesActive }"
            :aria-current="isMessagesActive ? 'page' : undefined"
            @click="handleNav('messages')"
          >
            <div class="nav-icon-wrap relative-icon">
              <MessageCircle :size="20" :stroke-width="isMessagesActive ? 2.3 : 1.9" />
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
            :class="{ active: isProfileActive }"
            :aria-current="isProfileActive ? 'page' : undefined"
            @click="handleNav('profile')"
          >
            <div class="nav-icon-wrap">
              <UserRound :size="20" :stroke-width="isProfileActive ? 2.3 : 1.9" />
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
    </div>

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

      <div class="category-filter-list" role="group" aria-label="Category filter options">
        <button
          v-for="cat in visibleCategories"
          :key="cat.name"
          type="button"
          class="category-filter-row"
          :class="{ active: isCategorySelected(cat.name) }"
          :aria-pressed="isCategorySelected(cat.name)"
          @click="handleCategoryClick(cat.name)"
        >
          <div class="cat-icon-wrap">
            <component
              :is="getCategoryIcon(cat.key)"
              :size="17"
              class="cat-row-icon"
              aria-hidden="true"
            />
          </div>
          <span class="cat-row-label">{{ cat.name }}</span>
        </button>

        <!-- Expand / Collapse Toggle Button -->
        <button
          type="button"
          class="expand-categories-row"
          :aria-expanded="isExpanded"
          @click="isExpanded = !isExpanded"
        >
          <span class="expand-label">
            {{ isExpanded ? "Show less" : `Show ${MAIN_CATEGORIES.length - INITIAL_CATEGORY_COUNT} more` }}
          </span>
          <component
            :is="isExpanded ? ChevronUp : ChevronDown"
            :size="14"
            class="expand-toggle-icon"
            aria-hidden="true"
          />
        </button>
      </div>
    </section>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  House,
  MessageCircle,
  UserRound,
  MapPin,
  ChevronDown,
  ChevronUp
} from "lucide-vue-next";
import { MAIN_CATEGORIES } from "../../config/categories";
import { getCategoryIcon } from "../../config/categoryIcons";
import { useFeedFilter } from "../../composables/useFeedFilter";
import { useMessageUnread } from "../../composables/useMessageUnread";

const INITIAL_CATEGORY_COUNT = 7;

const props = withDefaults(
  defineProps<{
    currentTab?: "home" | "messages" | "profile" | "notifications";
  }>(),
  {
    currentTab: "home"
  }
);

const emit = defineEmits<{
  "select-tab": [tab: "home" | "messages" | "profile"];
}>();

const route = useRoute();
const router = useRouter();
const { messageUnreadCount } = useMessageUnread();
const { appliedFilters, isCategorySelected, toggleCategory } = useFeedFilter();

const isExpanded = ref(false);

const isHomeActive = computed(() => {
  return route?.name === "Home" || route?.path === "/" || props.currentTab === "home";
});

const isMessagesActive = computed(() => {
  return route?.name === "Messages" || route?.path?.startsWith("/messages") || props.currentTab === "messages";
});

const isProfileActive = computed(() => {
  return route?.name === "Profile" || route?.path?.startsWith("/profile") || props.currentTab === "profile";
});

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

const handleMapsClick = () => {
  // Graceful feedback for desktop
  window.alert("Explore Maps is coming soon in a future update.");
};

const handleCategoryClick = (categoryName: string) => {
  toggleCategory(categoryName);
  if (route?.name !== "Home" && route?.path !== "/") {
    router.push({ name: "Home" });
  }
};

const clearCategoryFilters = () => {
  appliedFilters.value.categories = [];
  appliedFilters.value.subcategories = [];
};
</script>

<style scoped>
.desktop-nav-sidebar-root {
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
  font-weight: 650;
}

.nav-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.relative-icon {
  position: relative;
}

.sidebar-unread-dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--app-primary, #2640DB);
  border: 2px solid var(--app-bg, #ffffff);
}

.nav-link-label {
  flex: 1;
}

.unread-count-pill {
  padding: 2px 7px;
  border-radius: 10px;
  background-color: var(--app-primary, #2640DB);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

/* Explore Maps Disabled State */
.sidebar-nav-link.disabled-link {
  opacity: 0.55;
  cursor: default;
}

.coming-soon-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 6px;
  border-radius: 6px;
  background-color: var(--app-surface-secondary, rgba(20, 25, 30, 0.05));
  color: var(--app-text-tertiary);
}

/* Divider */
.sidebar-divider {
  width: 100%;
  height: 1px;
  background-color: var(--app-border, rgba(20, 25, 30, 0.08));
  margin: 18px 0 16px 0;
}

/* Category Filters Section */
.sidebar-filter-section {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.filter-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  margin-bottom: 8px;
}

.filter-heading {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--app-text-tertiary);
}

.clear-filters-link {
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-primary, #2640DB);
  cursor: pointer;
  padding: 0;
}

.clear-filters-link:hover {
  text-decoration: underline;
}

/* Category Filter Vertical List */
.category-filter-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.category-filter-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--app-text-secondary);
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.1px;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
  user-select: none;
}

.category-filter-row:hover {
  background-color: var(--app-surface-secondary);
  color: var(--app-text-primary);
}

.category-filter-row.active {
  background-color: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
  color: var(--app-primary, #2640DB);
  font-weight: 600;
}

.cat-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.cat-row-icon {
  color: var(--app-text-tertiary);
  transition: color 0.15s ease;
}

.category-filter-row:hover .cat-row-icon {
  color: var(--app-text-primary);
}

.category-filter-row.active .cat-row-icon {
  color: var(--app-primary, #2640DB);
}

.cat-row-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Expand / Collapse Row */
.expand-categories-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: var(--app-text-tertiary);
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  margin-top: 4px;
  user-select: none;
}

.expand-categories-row:hover {
  background-color: var(--app-surface-secondary);
  color: var(--app-text-primary);
}

.expand-toggle-icon {
  color: inherit;
}
</style>

