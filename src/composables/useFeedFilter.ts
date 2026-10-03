import { computed, ref, watch, type Component } from "vue";
import {
  LayoutGrid,
  CircleHelp,
  SearchCheck,
  BadgeCheck
} from "lucide-vue-next";
import type { PostFilter, PostFilters } from "../types/post";
import { normalizeCategoryKey } from "../config/categories";

export interface FilterTabItem {
  value: PostFilter;
  label: string;
  icon: Component;
}

export const filterTabs: FilterTabItem[] = [
  { value: "All", label: "All", icon: LayoutGrid },
  { value: "Lost", label: "Lost", icon: CircleHelp },
  { value: "Found", label: "Found", icon: SearchCheck },
  { value: "Resolved", label: "Resolved", icon: BadgeCheck }
];

// Module-level shared singleton reactive state to guarantee single source of truth
const searchQuery = ref("");
const debouncedSearchQuery = ref("");
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, (newVal) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchQuery.value = newVal;
  }, 250);
});

const appliedFilters = ref<PostFilters>({
  type: "All",
  categories: [],
  subcategories: []
});

const isSearchActive = ref(false);

export function useFeedFilter() {
  const activeFilterCount = computed(() =>
    (appliedFilters.value.type === "All" ? 0 : 1)
    + appliedFilters.value.categories.length
    + appliedFilters.value.subcategories.length
  );

  const hasActiveFilters = computed(() => activeFilterCount.value > 0);

  const filterButtonLabel = computed(() =>
    hasActiveFilters.value
      ? `Filter posts, ${activeFilterCount.value} active`
      : "Filter posts"
  );

  const setType = (type: PostFilter) => {
    appliedFilters.value.type = type;
  };

  const toggleCategory = (categoryName: string) => {
    const key = normalizeCategoryKey(categoryName);
    const existingIndex = appliedFilters.value.categories.findIndex(
      (c) => normalizeCategoryKey(c) === key
    );
    if (existingIndex >= 0) {
      appliedFilters.value.categories.splice(existingIndex, 1);
    } else {
      appliedFilters.value.categories.push(categoryName);
    }
  };

  const isCategorySelected = (categoryName: string) => {
    const key = normalizeCategoryKey(categoryName);
    return appliedFilters.value.categories.some(
      (c) => normalizeCategoryKey(c) === key
    );
  };

  const clearAllFilters = () => {
    appliedFilters.value = {
      type: "All",
      categories: [],
      subcategories: []
    };
    searchQuery.value = "";
    debouncedSearchQuery.value = "";
  };

  const clearSearch = () => {
    searchQuery.value = "";
    debouncedSearchQuery.value = "";
  };

  return {
    searchQuery,
    debouncedSearchQuery,
    appliedFilters,
    isSearchActive,
    activeFilterCount,
    hasActiveFilters,
    filterButtonLabel,
    filterTabs,
    setType,
    toggleCategory,
    isCategorySelected,
    clearAllFilters,
    clearSearch
  };
}
