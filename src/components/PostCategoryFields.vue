<template>
  <div class="category-fields-wrap">
    <!-- Single Compact Category Row on Form -->
    <button
      type="button"
      class="picker-row-btn"
      :disabled="disabled || isChecking"
      :aria-invalid="Boolean(error)"
      aria-haspopup="dialog"
      @click="openCategoryPicker"
    >
      <div class="row-left">
        <Tag :size="16" class="row-icon" />
        <span class="row-label">Category</span>
      </div>
      <div class="row-right">
        <span class="row-value" :class="{ placeholder: !category }">
          {{ displayCategorySummary || 'Choose category' }}
        </span>
        <ChevronRight :size="16" class="row-chevron" />
      </div>
    </button>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>

    <!-- Centered / Mobile Compact Category Picker Modal -->
    <ion-modal
      :is-open="isPickerOpen"
      class="compact-category-modal"
      aria-label="Choose a category"
      @did-dismiss="handlePickerDismiss"
    >
      <div class="picker-card-content">
        <!-- STEP 1: SELECT CATEGORY HEADER -->
        <header v-if="currentStep === 'category'" class="picker-header">
          <div class="header-top-row">
            <h2 class="picker-title">Select Category</h2>
            <button
              type="button"
              class="modal-close-btn"
              aria-label="Close"
              @click="isPickerOpen = false"
            >
              <X :size="20" />
            </button>
          </div>

          <!-- Instant Search Box -->
          <div class="search-input-wrap">
            <Search :size="16" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Search categories..."
              aria-label="Search categories"
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
        </header>

        <!-- STEP 2: SELECT SUBCATEGORY HEADER -->
        <header v-else class="picker-header subcat-header">
          <div class="header-top-row">
            <button
              type="button"
              class="back-to-categories-btn"
              aria-label="Back to categories"
              @click="goBackToCategories"
            >
              <ArrowLeft :size="18" />
              <span class="active-category-title">{{ activeCategoryName }}</span>
            </button>
            <button
              type="button"
              class="modal-close-btn"
              aria-label="Close"
              @click="isPickerOpen = false"
            >
              <X :size="20" />
            </button>
          </div>
          <p class="subcat-subtitle">Select a subcategory or choose none</p>
        </header>

        <!-- MODAL BODY -->
        <div class="picker-body">
          <!-- VIEW 1: 2-COLUMN CATEGORY GRID -->
          <div v-if="currentStep === 'category'" class="categories-view">
            <div v-if="filteredCategories.length === 0" class="empty-search-state">
              <p class="empty-text">No categories found</p>
            </div>

            <div v-else class="category-grid">
              <button
                v-for="cat in filteredCategories"
                :key="cat.key"
                type="button"
                class="category-tile"
                :class="{ selected: isCategorySelected(cat.name) }"
                @click="onSelectMainCategory(cat)"
              >
                <div class="tile-icon-box">
                  <component :is="getCategoryIcon(cat.key)" :size="22" class="tile-icon" />
                </div>
                <span class="tile-name">{{ cat.name }}</span>
                <Check
                  v-if="isCategorySelected(cat.name)"
                  :size="14"
                  class="tile-selected-badge"
                />
              </button>
            </div>
          </div>

          <!-- VIEW 2: 2-COLUMN SUBCATEGORY CHIPS -->
          <div v-else class="subcategories-view">
            <div class="subcategory-grid">
              <!-- Option: None (optional) -->
              <button
                type="button"
                class="subcat-chip"
                :class="{ selected: !subCategory }"
                @click="onSelectSubcategory('')"
              >
                <span class="subcat-name">None (optional)</span>
                <Check v-if="!subCategory" :size="14" class="chip-check" />
              </button>

              <!-- Available Subcategories -->
              <button
                v-for="sub in currentSubcategoryList"
                :key="sub"
                type="button"
                class="subcat-chip"
                :class="{ selected: isSubcategorySelected(sub) }"
                @click="onSelectSubcategory(sub)"
              >
                <span class="subcat-name">{{ sub }}</span>
                <Check v-if="isSubcategorySelected(sub)" :size="14" class="chip-check" />
              </button>
            </div>

            <!-- Custom Subcategory Option -->
            <div class="custom-subcategory-wrap">
              <button
                v-if="!showCustomInput"
                type="button"
                class="add-custom-link-btn"
                :disabled="disabled || isChecking"
                @click="showCustomInput = true"
              >
                <Plus :size="16" />
                <span>+ Add custom subcategory</span>
              </button>

              <div v-else class="custom-entry-box">
                <div class="custom-input-row">
                  <input
                    v-model="customName"
                    type="text"
                    aria-label="Custom subcategory name"
                    placeholder="e.g. momo"
                    maxlength="80"
                    :disabled="disabled || isChecking"
                    :aria-invalid="Boolean(customError)"
                    @keydown.enter.prevent="addCustomSubcategory"
                  />
                  <button
                    type="button"
                    class="save-custom-btn"
                    :disabled="!customName.trim() || disabled || isChecking"
                    @click="addCustomSubcategory"
                  >
                    <LoaderCircle v-if="isChecking" :size="15" class="checking-spinner" />
                    <span v-else>Add</span>
                  </button>
                  <button
                    type="button"
                    class="cancel-custom-btn"
                    aria-label="Cancel custom subcategory"
                    :disabled="disabled || isChecking"
                    @click="resetCustomInput"
                  >
                    <X :size="16" />
                  </button>
                </div>
                <p v-if="customError" class="field-error" role="alert">{{ customError }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { IonModal } from "@ionic/vue";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  Footprints,
  Gamepad2,
  Gem,
  GraduationCap,
  KeyRound,
  LoaderCircle,
  Package,
  PawPrint,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Tag,
  Users,
  Wallet,
  X
} from "lucide-vue-next";
import { useCategories } from "../composables/useCategories";
import { CategoryConfig, getCategoryConfig } from "../config/categories";

interface PendingSubcategory {
  category: string;
  name: string;
}

const props = withDefaults(
  defineProps<{
    category: string;
    subCategory?: string;
    pendingSubcategory?: PendingSubcategory;
    disabled?: boolean;
    error?: string;
  }>(),
  {
    subCategory: "",
    disabled: false,
    error: ""
  }
);

const emit = defineEmits<{
  (event: "update:category", value: string): void;
  (event: "update:subCategory", value: string): void;
  (event: "update:pendingSubcategory", value: PendingSubcategory | undefined): void;
  (event: "checking-change", value: boolean): void;
}>();

const {
  mainCategories,
  getSubcategoriesForCategory,
  resolveCustomSubcategory,
  normalizeCategoryKey
} = useCategories();

// Category Icon Mapping
const iconMap: Record<string, any> = {
  pets: PawPrint,
  accessories: Gem,
  bags: ShoppingBag,
  people: Users,
  gadgets: Smartphone,
  walletsandcards: Wallet,
  keys: KeyRound,
  documentsandids: FileText,
  clothing: Shirt,
  footwear: Footprints,
  schoolandoffice: GraduationCap,
  toys: Gamepad2,
  other: Package
};

const getCategoryIcon = (keyOrName: string) => {
  const norm = normalizeCategoryKey(keyOrName);
  return iconMap[norm] || Package;
};

// Modal and Navigation State
const isPickerOpen = ref(false);
const currentStep = ref<"category" | "subcategory">("category");
const activeCategoryName = ref("");
const searchQuery = ref("");
const showCustomInput = ref(false);
const customName = ref("");
const customError = ref("");
const isChecking = ref(false);
const localChoices = ref<Record<string, Record<string, { name: string; isNew: boolean }>>>({});
let isActive = true;

const categoryKey = (cat: string) => getCategoryConfig(cat)?.key || normalizeCategoryKey(cat);

const openCategoryPicker = () => {
  if (props.disabled || isChecking.value) return;
  searchQuery.value = "";
  if (props.category) {
    activeCategoryName.value = props.category;
    currentStep.value = "category";
  } else {
    currentStep.value = "category";
    activeCategoryName.value = "";
  }
  isPickerOpen.value = true;
};

const handlePickerDismiss = () => {
  isPickerOpen.value = false;
  resetCustomInput();
};

const goBackToCategories = () => {
  currentStep.value = "category";
  searchQuery.value = "";
  resetCustomInput();
};

// Search filter on categories
const filteredCategories = computed<CategoryConfig[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return mainCategories;
  return mainCategories.filter((cat) => {
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.key.toLowerCase().includes(q)
    );
  });
});

const isCategorySelected = (name: string) => {
  return normalizeCategoryKey(name) === normalizeCategoryKey(props.category);
};

const isSubcategorySelected = (name: string) => {
  return normalizeCategoryKey(name) === normalizeCategoryKey(props.subCategory);
};

const availableSubcategories = (cat: string) => {
  const names = [...getSubcategoriesForCategory(cat)];
  const seen = new Set(names.map(normalizeCategoryKey));
  for (const [key, entry] of Object.entries(localChoices.value[categoryKey(cat)] || {})) {
    if (!seen.has(key)) {
      names.push(entry.name);
      seen.add(key);
    }
  }
  return names;
};

const currentSubcategoryList = computed(() => {
  if (!activeCategoryName.value) return [];
  return availableSubcategories(activeCategoryName.value);
});

// Summary label for compact row on Create Post
const displayCategorySummary = computed(() => {
  if (!props.category) return "";
  if (props.subCategory) {
    return `${props.category} · ${props.subCategory}`;
  }
  return props.category;
});

const updatePendingSelection = (cat: string, name?: string) => {
  const key = normalizeCategoryKey(name);
  const entry = localChoices.value[categoryKey(cat)]?.[key];
  const alreadyRegistered = getSubcategoriesForCategory(cat).some(
    (existing) => normalizeCategoryKey(existing) === key
  );
  emit(
    "update:pendingSubcategory",
    entry?.isNew && !alreadyRegistered ? { category: cat, name: entry.name } : undefined
  );
};

// On selecting a main category:
const onSelectMainCategory = (cat: CategoryConfig) => {
  activeCategoryName.value = cat.name;
  const subcats = availableSubcategories(cat.name);

  // If category changed, update parent
  if (props.category !== cat.name) {
    emit("update:category", cat.name);
    // If previous subcategory is no longer valid, clear it
    const selectedKey = normalizeCategoryKey(props.subCategory);
    const stillValid = subcats.some((name) => normalizeCategoryKey(name) === selectedKey);
    if (props.subCategory && !stillValid) {
      emit("update:subCategory", "");
      updatePendingSelection(cat.name, undefined);
    }
  }

  // If category has subcategories, drill down into subcategory view
  if (subcats.length > 0) {
    currentStep.value = "subcategory";
    resetCustomInput();
  } else {
    // No subcategories: close modal
    emit("update:subCategory", "");
    updatePendingSelection(cat.name, undefined);
    isPickerOpen.value = false;
  }
};

// On selecting a subcategory:
const onSelectSubcategory = (name: string) => {
  if (props.disabled || isChecking.value) return;
  emit("update:subCategory", name);
  updatePendingSelection(activeCategoryName.value || props.category, name);
  isPickerOpen.value = false;
};

const resetCustomInput = () => {
  showCustomInput.value = false;
  customName.value = "";
  customError.value = "";
};

const addCustomSubcategory = async () => {
  if (props.disabled || isChecking.value) return;
  customError.value = "";
  const cat = activeCategoryName.value || props.category;
  if (!cat) {
    customError.value = "Choose a category first.";
    return;
  }
  const normalizedKey = normalizeCategoryKey(customName.value);
  if (!normalizedKey) {
    customError.value = "Enter a subcategory containing letters or numbers.";
    return;
  }

  isChecking.value = true;
  emit("checking-change", true);
  try {
    const existingLocal = localChoices.value[categoryKey(cat)]?.[normalizedKey];
    const resolved = await resolveCustomSubcategory(
      cat,
      existingLocal?.name || customName.value
    );
    if (!isActive) return;
    localChoices.value[resolved.categoryKey] ||= {};
    localChoices.value[resolved.categoryKey][resolved.normalizedKey] = {
      name: resolved.name,
      isNew: resolved.isNew
    };
    emit("update:subCategory", resolved.name);
    emit(
      "update:pendingSubcategory",
      resolved.isNew ? { category: cat, name: resolved.name } : undefined
    );
    resetCustomInput();
    isPickerOpen.value = false;
  } catch (error) {
    if (isActive) {
      customError.value =
        error instanceof Error ? error.message : "Could not check subcategory. Try again.";
    }
  } finally {
    isChecking.value = false;
    if (isActive) emit("checking-change", false);
  }
};

watch(() => props.category, resetCustomInput);

watch([() => props.category, () => props.subCategory], () => {
  if (
    props.pendingSubcategory &&
    (categoryKey(props.pendingSubcategory.category) !== categoryKey(props.category) ||
      normalizeCategoryKey(props.pendingSubcategory.name) !== normalizeCategoryKey(props.subCategory))
  ) {
    emit("update:pendingSubcategory", undefined);
  }
});

onUnmounted(() => {
  isActive = false;
});
</script>

<style scoped>
.category-fields-wrap {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Compact Single Row Button on Form */
.picker-row-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 48px;
  padding: 12px 2px;
  border: none;
  border-bottom: 1px solid var(--app-card-border);
  background: transparent;
  font: inherit;
  color: var(--app-text-primary);
  text-align: left;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.picker-row-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.picker-row-btn:active:not(:disabled) {
  opacity: 0.7;
}

.row-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--app-text-secondary);
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.row-icon {
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.row-right {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.row-value {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--app-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-value.placeholder {
  color: var(--app-text-tertiary);
  font-weight: 400;
}

.row-chevron {
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.field-error {
  margin: 4px 0 0;
  color: var(--ion-color-danger, #ef4444);
  font-size: 12px;
}

/* Modal Styling - Centered / Mobile Dialog (NOT a bottom sheet) */
.compact-category-modal {
  --width: calc(100% - 32px);
  --max-width: 420px;
  --height: auto;
  --max-height: 75vh;
  --border-radius: 20px;
  --box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
}

.compact-category-modal::part(content) {
  border-radius: 20px;
  overflow: hidden;
  background: var(--app-surface, #141820);
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
}

.picker-card-content {
  display: flex;
  flex-direction: column;
  max-height: 75vh;
  background: var(--app-surface);
  color: var(--app-text-primary);
  box-sizing: border-box;
}

/* Header */
.picker-header {
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--app-card-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.subcat-header {
  gap: 4px;
}

.header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.picker-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--app-text-primary);
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--app-text-secondary);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.15s ease;
}

.modal-close-btn:active {
  background: var(--app-surface-secondary);
}

/* Back button in Subcategory view */
.back-to-categories-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--app-text-primary);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.back-to-categories-btn:active {
  opacity: 0.75;
}

.active-category-title {
  color: var(--app-text-primary);
}

.subcat-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--app-text-secondary);
}

/* Instant Search Input */
.search-input-wrap {
  display: flex;
  align-items: center;
  position: relative;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-card-border);
  border-radius: 12px;
  padding: 0 10px 0 32px;
  height: 38px;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--app-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13.5px;
  color: var(--app-text-primary);
}

.search-input::placeholder {
  color: var(--app-text-tertiary);
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: var(--app-text-tertiary);
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Body & Internal Scroll */
.picker-body {
  overflow-y: auto;
  flex: 1;
  padding: 14px 16px 20px;
  scrollbar-width: thin;
  scrollbar-color: var(--app-card-border) transparent;
}

.picker-body::-webkit-scrollbar {
  width: 4px;
}

.picker-body::-webkit-scrollbar-thumb {
  background: var(--app-card-border);
  border-radius: 4px;
}

/* Empty Search State */
.empty-search-state {
  padding: 32px 16px;
  text-align: center;
}

.empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--app-text-tertiary);
}

/* 2-Column Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.category-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 78px;
  padding: 10px 8px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-card-border);
  border-radius: 13px;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.15s ease, background-color 0.15s ease;
  text-align: center;
}

.category-tile:hover {
  background: var(--app-surface-tertiary, rgba(255, 255, 255, 0.06));
  border-color: rgba(38, 64, 219, 0.4);
}

.category-tile:active {
  transform: scale(0.97);
}

.category-tile.selected {
  border-color: var(--app-primary, #2640DB);
  background: rgba(38, 64, 219, 0.09);
}

.tile-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-icon {
  color: var(--app-text-secondary);
  transition: color 0.15s ease;
}

.category-tile.selected .tile-icon {
  color: var(--app-primary, #2640DB);
}

.tile-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--app-text-primary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.category-tile.selected .tile-name {
  color: var(--app-primary, #2640DB);
}

.tile-selected-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  color: var(--app-primary, #2640DB);
}

/* 2-Column Subcategory Grid & Chips */
.subcategory-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.subcat-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  min-height: 42px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-card-border);
  border-radius: 11px;
  cursor: pointer;
  transition: all 0.12s ease;
  text-align: left;
}

.subcat-chip:hover {
  background: var(--app-surface-tertiary, rgba(255, 255, 255, 0.06));
  border-color: rgba(38, 64, 219, 0.4);
}

.subcat-chip:active {
  transform: scale(0.98);
}

.subcat-chip.selected {
  border-color: var(--app-primary, #2640DB);
  background: rgba(38, 64, 219, 0.09);
}

.subcat-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.subcat-chip.selected .subcat-name {
  color: var(--app-primary, #2640DB);
  font-weight: 600;
}

.chip-check {
  color: var(--app-primary, #2640DB);
  flex-shrink: 0;
  margin-left: 6px;
}

/* Custom Subcategory Section */
.custom-subcategory-wrap {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--app-card-border);
}

.add-custom-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--app-primary, #2640DB);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 0;
  cursor: pointer;
}

.add-custom-link-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-entry-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.custom-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-input-row input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--app-card-border);
  background: var(--app-surface-secondary);
  color: var(--app-text-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
}

.custom-input-row input:focus {
  border-color: var(--app-primary, #2640DB);
}

.save-custom-btn {
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-custom-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-custom-btn {
  background: transparent;
  border: none;
  color: var(--app-text-secondary);
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checking-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Mobile responsive constraints (360px - 430px) */
@media (max-width: 380px) {
  .compact-category-modal {
    --width: calc(100% - 24px);
  }

  .category-grid {
    gap: 8px;
  }

  .category-tile {
    height: 72px;
    padding: 8px 6px;
  }

  .tile-name {
    font-size: 11.5px;
  }

  .subcategory-grid {
    gap: 6px;
  }

  .subcat-chip {
    padding: 8px 10px;
  }
}
</style>
