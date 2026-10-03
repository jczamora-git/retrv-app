<template>
  <div class="composer-category-panel">
    <div class="panel-section-label">Choose a category</div>

    <!-- 2-Column Compact Category Grid -->
    <div class="category-grid" role="group" aria-label="Main categories">
      <button
        v-for="cat in mainCategories"
        :key="cat.key"
        type="button"
        class="category-tile"
        :class="{ selected: isCategorySelected(cat.name) }"
        :aria-pressed="isCategorySelected(cat.name)"
        @click="onSelectMainCategory(cat)"
      >
        <div class="tile-icon-box">
          <component
            :is="getCategoryIcon(cat.key)"
            :size="18"
            class="tile-icon"
            aria-hidden="true"
          />
        </div>
        <span class="tile-name">{{ cat.name }}</span>
        <Check
          v-if="isCategorySelected(cat.name)"
          :size="14"
          class="tile-selected-badge"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Subcategory Section (Visible when active category has subcategories) -->
    <div
      v-if="activeCategoryName && currentSubcategoryList.length > 0"
      class="subcategories-section"
    >
      <div class="subcat-header-row">
        <span class="subcat-heading">Subcategory for {{ activeCategoryName }} (optional)</span>
      </div>

      <div class="subcategory-grid" role="group" aria-label="Subcategories">
        <!-- Option: None -->
        <button
          type="button"
          class="subcat-chip"
          :class="{ selected: !subCategory }"
          :aria-pressed="!subCategory"
          @click="onSelectSubcategory('')"
        >
          <span class="subcat-name">None</span>
          <Check v-if="!subCategory" :size="13" class="chip-check" />
        </button>

        <!-- Available Subcategories -->
        <button
          v-for="sub in currentSubcategoryList"
          :key="sub"
          type="button"
          class="subcat-chip"
          :class="{ selected: isSubcategorySelected(sub) }"
          :aria-pressed="isSubcategorySelected(sub)"
          @click="onSelectSubcategory(sub)"
        >
          <span class="subcat-name">{{ sub }}</span>
          <Check v-if="isSubcategorySelected(sub)" :size="13" class="chip-check" />
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
          <Plus :size="14" />
          <span>Add custom subcategory</span>
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
              <LoaderCircle v-if="isChecking" :size="14" class="checking-spinner" />
              <span v-else>Add</span>
            </button>
            <button
              type="button"
              class="cancel-custom-btn"
              aria-label="Cancel custom subcategory"
              :disabled="disabled || isChecking"
              @click="resetCustomInput"
            >
              <X :size="15" />
            </button>
          </div>
          <p v-if="customError" class="field-error" role="alert">{{ customError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { Check, LoaderCircle, Plus, X } from "lucide-vue-next";
import { useCategories } from "../../composables/useCategories";
import { CategoryConfig, getCategoryConfig } from "../../config/categories";
import { getCategoryIcon } from "../../config/categoryIcons";

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
  (event: "select-and-close"): void;
}>();

const {
  mainCategories,
  getSubcategoriesForCategory,
  resolveCustomSubcategory,
  normalizeCategoryKey
} = useCategories();

const activeCategoryName = ref(props.category || "");
const showCustomInput = ref(false);
const customName = ref("");
const customError = ref("");
const isChecking = ref(false);
const localChoices = ref<Record<string, Record<string, { name: string; isNew: boolean }>>>({});
let isActive = true;

const categoryKey = (cat: string) => getCategoryConfig(cat)?.key || normalizeCategoryKey(cat);

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

const onSelectMainCategory = (cat: CategoryConfig) => {
  activeCategoryName.value = cat.name;
  const subcats = availableSubcategories(cat.name);

  if (props.category !== cat.name) {
    emit("update:category", cat.name);
    const selectedKey = normalizeCategoryKey(props.subCategory);
    const stillValid = subcats.some((name) => normalizeCategoryKey(name) === selectedKey);
    if (props.subCategory && !stillValid) {
      emit("update:subCategory", "");
      updatePendingSelection(cat.name, undefined);
    }
  }

  // If no subcategories, optionally auto-close
  if (subcats.length === 0) {
    emit("update:subCategory", "");
    updatePendingSelection(cat.name, undefined);
    emit("select-and-close");
  }
};

const onSelectSubcategory = (name: string) => {
  if (props.disabled || isChecking.value) return;
  emit("update:subCategory", name);
  updatePendingSelection(activeCategoryName.value || props.category, name);
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
  } catch (error) {
    if (isActive) {
      customError.value =
        error instanceof Error ? error.message : "Could not check subcategory. Try again.";
    }
  } finally {
    isChecking.value = false;
  }
};

watch(
  () => props.category,
  (newVal) => {
    if (newVal) {
      activeCategoryName.value = newVal;
    }
    resetCustomInput();
  }
);

onUnmounted(() => {
  isActive = false;
});
</script>

<style scoped>
.composer-category-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.panel-section-label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--app-text-tertiary);
  padding-left: 2px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.category-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  min-height: 44px;
  border-radius: 10px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  user-select: none;
  min-width: 0;
}

.category-tile:hover {
  border-color: var(--app-border-strong, rgba(20, 25, 30, 0.18));
  background: var(--app-surface-tertiary);
}

.category-tile.selected {
  background: var(--app-primary-soft, rgba(38, 64, 219, 0.08));
  border-color: var(--app-primary, #2640DB);
}

.tile-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.tile-icon {
  color: var(--app-text-tertiary);
  transition: color 0.15s ease;
}

.category-tile:hover .tile-icon {
  color: var(--app-text-primary);
}

.category-tile.selected .tile-icon {
  color: var(--app-primary, #2640DB);
}

.tile-name {
  flex: 1;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--app-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-tile.selected .tile-name {
  color: var(--app-primary, #2640DB);
  font-weight: 600;
}

.tile-selected-badge {
  color: var(--app-primary, #2640DB);
  flex-shrink: 0;
}

/* Subcategories Section */
.subcategories-section {
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subcat-header-row {
  margin-bottom: 4px;
}

.subcat-heading {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--app-text-tertiary);
}

.subcategory-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.subcat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  font-size: 12.5px;
  font-weight: 500;
  color: var(--app-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.subcat-chip:hover {
  background: var(--app-surface-tertiary);
  color: var(--app-text-primary);
}

.subcat-chip.selected {
  background: var(--app-primary, #2640DB);
  border-color: var(--app-primary, #2640DB);
  color: #ffffff;
  font-weight: 600;
}

.chip-check {
  color: #ffffff;
}

.custom-subcategory-wrap {
  margin-top: 8px;
}

.add-custom-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--app-primary, #2640DB);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 2px;
}

.add-custom-link-btn:hover {
  text-decoration: underline;
}

.add-custom-link-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-entry-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.custom-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.custom-input-row input {
  flex: 1;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.15));
  background: var(--app-surface);
  color: var(--app-text-primary);
  font-size: 13px;
  outline: none;
}

.custom-input-row input:focus {
  border-color: var(--app-primary, #2640DB);
}

.save-custom-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  font-size: 12.5px;
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
  height: 34px;
  width: 34px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.15));
  color: var(--app-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-custom-btn:hover {
  color: var(--app-text-primary);
  background: var(--app-surface-tertiary);
}

.field-error {
  margin: 4px 0 0;
  color: #ef4444;
  font-size: 12px;
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
</style>
