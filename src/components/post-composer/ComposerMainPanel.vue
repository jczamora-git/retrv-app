<template>
  <div class="composer-main-panel">
    <!-- Author Profile Row -->
    <div class="composer-author-row">
      <UserAvatar
        :name="currentProfile?.name || 'User'"
        :username="currentProfile?.username || 'user'"
        :avatar-url="currentProfile?.avatarUrl"
        size="md"
      />
      <div class="author-meta">
        <span class="author-name">{{ currentProfile?.name || 'Anonymous' }}</span>
        <span class="author-handle">@{{ currentProfile?.username || 'community' }}</span>
      </div>
    </div>

    <!-- Minimal Lost / Found Chips Selector -->
    <div class="type-chips-row">
      <button
        type="button"
        class="type-chip lost-chip"
        :class="{ active: form.type === 'lost' }"
        @click="$emit('update:type', 'lost')"
      >
        <span class="chip-dot"></span>
        <span>Lost</span>
      </button>
      <button
        type="button"
        class="type-chip found-chip"
        :class="{ active: form.type === 'found' }"
        @click="$emit('update:type', 'found')"
      >
        <span class="chip-dot"></span>
        <span>Found</span>
      </button>
    </div>

    <!-- Main Title Input -->
    <div class="title-area">
      <input
        :value="form.title"
        type="text"
        class="composer-title-input"
        :placeholder="form.type === 'found' ? 'What did you find?' : 'What did you lose?'"
        maxlength="80"
        @input="$emit('update:title', ($event.target as HTMLInputElement).value)"
      />
      <span v-if="errors.title" class="field-error-text">{{ errors.title }}</span>
    </div>

    <!-- Main Description Textarea -->
    <div class="desc-area">
      <textarea
        :value="form.description"
        rows="4"
        class="composer-desc-input"
        :placeholder="form.type === 'found' ? 'Describe the item, distinctive marks, or where it is safely kept...' : 'Tell the community what happened, contents, identifying markings...'"
        maxlength="800"
        @input="$emit('update:description', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <span v-if="errors.description" class="field-error-text">{{ errors.description }}</span>
    </div>

    <!-- Photo Attachment Preview or Add Photo Button -->
    <div v-if="previewPhotoUrl" class="photo-preview-wrap">
      <img :src="previewPhotoUrl" alt="Attached photo" class="preview-img" />
      <div class="photo-overlay-actions">
        <button
          type="button"
          class="overlay-action-btn change-btn"
          :disabled="submitting"
          @click="$emit('trigger-photo')"
        >
          <Camera :size="14" />
          <span>Change</span>
        </button>
        <button
          type="button"
          class="overlay-action-btn remove-btn"
          :disabled="submitting"
          @click="$emit('remove-photo')"
        >
          <Trash2 :size="14" />
          <span>Remove</span>
        </button>
      </div>
    </div>

    <div v-else class="photo-add-section">
      <button
        type="button"
        class="add-photo-btn"
        :disabled="submitting"
        @click="$emit('trigger-photo')"
      >
        <ImagePlus :size="18" />
        <span>Add Photo</span>
      </button>
    </div>

    <span v-if="photoError" class="field-error-text">{{ photoError }}</span>

    <!-- Temporary Android Upload Diagnostics (Shown only on failure) -->
    <UploadDebugBanner />

    <!-- Attachment Rows (Compact list, no cards) -->
    <div class="attachment-rows-list">
      <!-- Category Row (Triggers Category Panel) -->
      <button
        type="button"
        class="attachment-row-btn"
        :disabled="submitting"
        @click="$emit('open-panel', 'category')"
      >
        <div class="row-left">
          <component
            :is="form.category ? getCategoryIcon(form.category) : Tag"
            :size="16"
            class="row-icon"
            :class="{ 'has-cat-icon': Boolean(form.category) }"
            aria-hidden="true"
          />
          <span class="row-label">Category</span>
        </div>
        <div class="row-right">
          <span class="row-value" :class="{ placeholder: !form.category }">
            {{ displayCategorySummary || 'Choose category' }}
          </span>
          <ChevronRight :size="16" class="row-chevron" />
        </div>
      </button>
      <span v-if="errors.category" class="field-error-text row-error">{{ errors.category }}</span>

      <!-- Location Row -->
      <div class="attachment-row">
        <div class="row-left">
          <MapPin :size="16" class="row-icon" />
          <span class="row-label">{{ form.type === 'found' ? 'Found At' : 'Location' }}</span>
        </div>
        <div class="row-right input-right">
          <input
            :value="form.location"
            type="text"
            class="row-input"
            placeholder="e.g. Central Mall, 2nd Floor"
            maxlength="100"
            @input="$emit('update:location', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- Date Row (Triggers Date Panel) -->
      <button
        type="button"
        class="attachment-row-btn"
        :disabled="submitting"
        @click="$emit('open-panel', 'date')"
      >
        <div class="row-left">
          <CalendarDays :size="16" class="row-icon" />
          <span class="row-label">Date</span>
        </div>
        <div class="row-right">
          <span class="row-value" :class="{ placeholder: !form.eventDate }">
            {{ formattedDisplayDate || 'Select date' }}
          </span>
          <ChevronRight :size="16" class="row-chevron" />
        </div>
      </button>
      <span v-if="errors.eventDate" class="field-error-text row-error">{{ errors.eventDate }}</span>
    </div>

    <!-- Visibility Footer -->
    <div class="post-visibility-footer">
      <Globe :size="15" class="globe-icon" />
      <span>Post visibility: Public · Visible to community</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  Camera,
  Trash2,
  ImagePlus,
  Tag,
  MapPin,
  CalendarDays,
  ChevronRight,
  Globe
} from "lucide-vue-next";
import UserAvatar from "../UserAvatar.vue";
import UploadDebugBanner from "../UploadDebugBanner.vue";
import { getCategoryIcon } from "../../config/categoryIcons";
import type { Profile } from "../../types/profile";
import type { PostFormData } from "../../types/post";

const props = defineProps<{
  form: PostFormData;
  currentProfile: Profile | null;
  previewPhotoUrl: string | null;
  photoError: string;
  errors: Record<string, string>;
  submitting: boolean;
}>();

defineEmits<{
  (e: "open-panel", panel: "category" | "date"): void;
  (e: "trigger-photo"): void;
  (e: "remove-photo"): void;
  (e: "update:type", val: "lost" | "found"): void;
  (e: "update:title", val: string): void;
  (e: "update:description", val: string): void;
  (e: "update:location", val: string): void;
}>();

const displayCategorySummary = computed(() => {
  if (!props.form.category) return "";
  if (props.form.subCategory) {
    return `${props.form.category} · ${props.form.subCategory}`;
  }
  return props.form.category;
});

const formattedDisplayDate = computed(() => {
  if (!props.form.eventDate) return "";
  const parts = props.form.eventDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return props.form.eventDate;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays === 0) return `Today (${dateStr})`;
  if (diffDays === 1) return `Yesterday (${dateStr})`;
  if (diffDays > 1 && diffDays <= 30) return `${diffDays}d ago (${dateStr})`;
  
  // Clean exact date for older historical dates
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
});
</script>

<style scoped>
.composer-main-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.composer-author-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name {
  font-size: 14.5px;
  font-weight: 650;
  color: var(--app-text-primary);
}

.author-handle {
  font-size: 12px;
  color: var(--app-text-tertiary);
}

.type-chips-row {
  display: flex;
  gap: 8px;
}

.type-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  background: var(--app-surface-secondary);
  border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  color: var(--app-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.type-chip .chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.type-chip.lost-chip.active {
  background: rgba(239, 68, 68, 0.10);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-weight: 650;
}

.type-chip.found-chip.active {
  background: rgba(16, 185, 129, 0.10);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
  font-weight: 650;
}

.title-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.composer-title-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  padding: 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-primary);
  outline: none;
}

.composer-title-input::placeholder {
  color: var(--app-text-tertiary);
  font-weight: 500;
}

.desc-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.composer-desc-input {
  width: 100%;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1.5;
  color: var(--app-text-primary);
  resize: none;
  outline: none;
  font-family: inherit;
}

.composer-desc-input::placeholder {
  color: var(--app-text-tertiary);
}

.photo-preview-wrap {
  position: relative;
  width: 100%;
  max-height: 220px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--app-surface-secondary);
}

.preview-img {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  display: block;
}

.photo-overlay-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
}

.overlay-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  backdrop-filter: blur(4px);
}

.overlay-action-btn:hover {
  background: rgba(0, 0, 0, 0.85);
}

.photo-add-section {
  display: flex;
}

.add-photo-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--app-surface-secondary);
  border: 1px dashed var(--app-border, rgba(20, 25, 30, 0.15));
  color: var(--app-text-secondary);
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-photo-btn:hover {
  background: var(--app-surface-tertiary);
  color: var(--app-text-primary);
  border-style: solid;
}

.attachment-rows-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
}

.attachment-row-btn,
.attachment-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 2px;
  border: none;
  border-bottom: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  background: transparent;
  width: 100%;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.attachment-row {
  cursor: default;
}

.row-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--app-text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.row-icon {
  color: var(--app-text-tertiary);
}

.row-icon.has-cat-icon {
  color: var(--app-primary, #2640DB);
}

.row-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.row-right.input-right {
  flex: 1;
  justify-content: flex-end;
  margin-left: 12px;
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
}

.row-input {
  width: 100%;
  text-align: right;
  background: transparent;
  border: none;
  font-size: 13.5px;
  color: var(--app-text-primary);
  outline: none;
}

.row-input::placeholder {
  color: var(--app-text-tertiary);
}

.row-error {
  margin-top: 2px;
  margin-bottom: 6px;
}

.field-error-text {
  font-size: 12px;
  color: #ef4444;
}

.post-visibility-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--app-text-tertiary);
  padding: 4px 0;
}

.globe-icon {
  flex-shrink: 0;
}
</style>
