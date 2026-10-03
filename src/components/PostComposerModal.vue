<template>
  <ion-modal
    class="post-composer-modal"
    :is-open="isOpen"
    :breakpoints="modalBreakpoints"
    :initial-breakpoint="modalInitialBreakpoint"
    @did-dismiss="handleDismiss"
  >
    <div class="composer-sheet">
      <!-- Lightweight Header Bar (Panel-Aware) -->
      <header class="composer-header">
        <!-- COMPOSE PANEL HEADER -->
        <template v-if="currentPanel === 'compose'">
          <button type="button" class="header-cancel-btn" @click="handleCancel">
            Cancel
          </button>
          <span class="composer-header-title">Create Post</span>
          <button
            type="button"
            class="header-post-btn"
            :class="{ 'retry-btn': submissionState === 'failed' }"
            :disabled="!isValid || submissionState === 'sending' || hasPreparingMedia"
            @click="handleSubmit"
          >
            <ion-spinner v-if="submissionState === 'sending'" name="crescent" class="post-spinner" />
            <span v-else-if="submissionState === 'failed'">Retry</span>
            <span v-else>Post</span>
          </button>
        </template>

        <!-- CATEGORY PANEL HEADER -->
        <template v-else-if="currentPanel === 'category'">
          <button type="button" class="header-back-btn" @click="currentPanel = 'compose'">
            <ChevronLeft :size="18" />
            <span>Back</span>
          </button>
          <span class="composer-header-title">Select Category</span>
          <button type="button" class="header-done-btn" @click="currentPanel = 'compose'">
            Done
          </button>
        </template>

        <!-- DATE PANEL HEADER -->
        <template v-else-if="currentPanel === 'date'">
          <button type="button" class="header-back-btn" @click="handleDateBack">
            <ChevronLeft :size="18" />
            <span>Back</span>
          </button>
          <span class="composer-header-title">{{ datePanelView === 'calendar' ? 'Custom Date' : 'Select Date' }}</span>
          <button type="button" class="header-done-btn" @click="handleDateApply">
            Apply
          </button>
        </template>
      </header>

      <!-- Panel-Aware Composer Body Container -->
      <div class="composer-body">
        <input
          ref="fileInputRef"
          type="file"
          :accept="ACCEPT_FILE_INPUT_TYPES"
          multiple
          class="hidden-file-input"
          @change="onFilesSelected"
        />

        <!-- Transition Panel Content -->
        <transition name="panel-fade" mode="out-in">
          <ComposerMainPanel
            v-if="currentPanel === 'compose'"
            :form="form"
            :current-profile="currentProfile"
            :media-items="form.mediaItems"
            :preview-photo-url="form.mediaItems?.[0]?.previewUrl || null"
            :photo-error="photoError"
            :errors="errors"
            :submitting="submitting"
            @open-panel="openPanel"
            @trigger-media="triggerMediaPicker"
            @remove-media="removeMedia"
            @move-media="moveMedia"
            @update:type="(val) => form.type = val"
            @update:title="(val) => form.title = val"
            @update:description="(val) => form.description = val"
            @update:location="(val) => form.location = val"
          />

          <ComposerCategoryPanel
            v-else-if="currentPanel === 'category'"
            v-model:category="form.category"
            v-model:sub-category="form.subCategory"
            v-model:pending-subcategory="form.pendingSubcategory"
            :disabled="submitting"
            :error="errors.category"
            @select-and-close="currentPanel = 'compose'"
          />

          <ComposerDatePanel
            v-else-if="currentPanel === 'date'"
            v-model="form.eventDate"
            v-model:view="datePanelView"
            @apply="handleDateApply"
          />
        </transition>
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { IonModal, IonSpinner, toastController } from "@ionic/vue";
import { ChevronLeft } from "lucide-vue-next";
import ComposerMainPanel from "./post-composer/ComposerMainPanel.vue";
import ComposerCategoryPanel from "./post-composer/ComposerCategoryPanel.vue";
import ComposerDatePanel, { type DatePanelView } from "./post-composer/ComposerDatePanel.vue";
import { useAuth } from "../composables/useAuth";
import { usePosts } from "../composables/usePosts";
import { generateClientRequestId } from "../utils/idempotency";
import { optimizeImage } from "../utils/media/imageOptimizer";
import { extractVideoMetadata } from "../utils/media/videoMetadata";
import {
  MAX_MEDIA_ITEMS,
  MAX_VIDEO_ITEMS,
  MAX_IMAGE_ORIGINAL_SIZE_BYTES,
  MAX_VIDEO_ORIGINAL_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ACCEPT_FILE_INPUT_TYPES
} from "../config/mediaLimits";
import type { ComposerMediaItem } from "../types/media";
import {
  type PostFormData,
  type PostFormErrors,
  type PostType
} from "../types/post";

type ComposerPanel = "compose" | "category" | "date";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    initialType?: PostType;
  }>(),
  {
    initialType: "lost"
  }
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit", data: PostFormData): void;
  (e: "created", postId: string): void;
}>();

const { currentProfile } = useAuth();
const { createPost } = usePosts();

const currentPanel = ref<ComposerPanel>("compose");
const datePanelView = ref<DatePanelView>("presets");

const openPanel = (panel: ComposerPanel) => {
  if (panel === "date") {
    datePanelView.value = "presets";
  }
  currentPanel.value = panel;
};

const handleDateBack = () => {
  if (datePanelView.value === "calendar") {
    datePanelView.value = "presets";
  } else {
    currentPanel.value = "compose";
  }
};

const handleDateApply = () => {
  datePanelView.value = "presets";
  currentPanel.value = "compose";
};

// Responsive modal behavior: desktop (>= 1200px) uses full [0, 1] breakpoint opening at 1 (100% height)
const isDesktop = ref(typeof window !== "undefined" ? window.innerWidth >= 1200 : false);

const updateIsDesktop = () => {
  if (typeof window !== "undefined") {
    isDesktop.value = window.innerWidth >= 1200;
  }
};

onMounted(() => {
  updateIsDesktop();
  window.addEventListener("resize", updateIsDesktop, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("resize", updateIsDesktop);
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      updateIsDesktop();
      currentPanel.value = "compose";
      datePanelView.value = "presets";
    }
  }
);

const modalBreakpoints = computed(() => {
  return isDesktop.value ? [0, 1] : [0, 0.95, 1];
});

const modalInitialBreakpoint = computed(() => {
  return isDesktop.value ? 1 : 0.95;
});

const submissionState = ref<"idle" | "sending" | "failed" | "sent">("idle");
const activeClientRequestId = ref<string>(generateClientRequestId());
const submitting = computed(() => submissionState.value === "sending");
const fileInputRef = ref<HTMLInputElement | null>(null);
const photoError = ref("");

const form = reactive<PostFormData>({
  type: props.initialType,
  title: "",
  category: "",
  subCategory: "",
  pendingSubcategory: undefined,
  description: "",
  location: "",
  eventDate: new Date().toISOString().split("T")[0],
  imageUrl: "",
  imageKey: "",
  imagePath: "",
  imageFile: null,
  mediaItems: []
});

const errors = reactive<PostFormErrors>({});

const hasPreparingMedia = computed(() => {
  return (form.mediaItems || []).some((m) => m.status === "preparing");
});

const isValid = computed(() => {
  return (
    form.title.trim().length > 0 &&
    Boolean(form.category) &&
    form.description.trim().length > 0 &&
    form.location.trim().length > 0 &&
    Boolean(form.eventDate)
  );
});

watch(
  () => props.initialType,
  (newType) => {
    form.type = newType || "lost";
  }
);

const revokeAllMediaUrls = () => {
  if (form.mediaItems) {
    for (const item of form.mediaItems) {
      if (item.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
      if (item.thumbnailUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    }
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      revokeAllMediaUrls();
      submissionState.value = "idle";
      activeClientRequestId.value = generateClientRequestId();
      currentPanel.value = "compose";
      form.type = props.initialType;
      form.title = "";
      form.category = "";
      form.subCategory = "";
      form.pendingSubcategory = undefined;
      form.description = "";
      form.location = "";
      form.eventDate = new Date().toISOString().split("T")[0];
      form.imageUrl = "";
      form.imageKey = "";
      form.imagePath = "";
      form.imageFile = null;
      form.mediaItems = [];
      photoError.value = "";
      if (fileInputRef.value) fileInputRef.value.value = "";
      Object.keys(errors).forEach((k) => delete errors[k as keyof PostFormData]);
    }
  }
);

const handleCancel = () => {
  datePanelView.value = "presets";
  emit("close");
};

const handleDismiss = () => {
  currentPanel.value = "compose";
  datePanelView.value = "presets";
  emit("close");
};

const triggerMediaPicker = () => {
  fileInputRef.value?.click();
};

const showToast = async (message: string, color: "warning" | "danger" | "success" = "warning") => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: "top",
    color
  });
  await toast.present();
};

const onFilesSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  if (!files.length) return;

  photoError.value = "";
  if (!form.mediaItems) {
    form.mediaItems = [];
  }

  const currentTotal = form.mediaItems.length;
  const currentVideos = form.mediaItems.filter((m) => m.type === "video").length;

  const availableSlots = MAX_MEDIA_ITEMS - currentTotal;
  if (availableSlots <= 0) {
    await showToast(`Maximum ${MAX_MEDIA_ITEMS} media items allowed per post.`);
    if (fileInputRef.value) fileInputRef.value.value = "";
    return;
  }

  const filesToProcess: File[] = [];
  let videoSlotBudget = MAX_VIDEO_ITEMS - currentVideos;

  for (const file of files) {
    if (filesToProcess.length >= availableSlots) {
      await showToast(`Only first ${availableSlots} files added (max ${MAX_MEDIA_ITEMS} items).`);
      break;
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      await showToast(`Unsupported file type: ${file.name}`);
      continue;
    }

    if (isVideo) {
      if (videoSlotBudget <= 0) {
        await showToast(`Maximum ${MAX_VIDEO_ITEMS} videos allowed per post.`);
        continue;
      }
      if (file.size > MAX_VIDEO_ORIGINAL_SIZE_BYTES) {
        await showToast(`Video "${file.name}" exceeds max 100MB limit.`);
        continue;
      }
      videoSlotBudget--;
      filesToProcess.push(file);
    } else if (isImage) {
      if (file.size > MAX_IMAGE_ORIGINAL_SIZE_BYTES) {
        await showToast(`Image "${file.name}" exceeds max 20MB limit.`);
        continue;
      }
      filesToProcess.push(file);
    }
  }

  // Clear input value so same files can be re-selected if removed
  if (fileInputRef.value) fileInputRef.value.value = "";

  // Process files with concurrency 2
  for (const file of filesToProcess) {
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const tempId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const placeholderItem: ComposerMediaItem = {
      id: tempId,
      file,
      type: isVideo ? "video" : "image",
      previewUrl: URL.createObjectURL(file),
      originalSize: file.size,
      status: "preparing"
    };

    form.mediaItems.push(placeholderItem);

    // Run optimization asynchronously
    (async () => {
      const idx = form.mediaItems?.findIndex((m) => m.id === tempId);
      if (idx === undefined || idx === -1 || !form.mediaItems) return;

      try {
        if (isVideo) {
          const metadata = await extractVideoMetadata(file);
          const currentItem = form.mediaItems[idx];
          if (currentItem) {
            currentItem.duration = metadata.duration;
            currentItem.width = metadata.width;
            currentItem.height = metadata.height;
            currentItem.thumbnailUrl = metadata.posterUrl;
            currentItem.status = "ready";
          }
        } else {
          const optResult = await optimizeImage(file);
          const currentItem = form.mediaItems[idx];
          if (currentItem) {
            // Revoke raw file URL and use optimized preview
            if (currentItem.previewUrl.startsWith("blob:")) {
              URL.revokeObjectURL(currentItem.previewUrl);
            }
            currentItem.previewUrl = optResult.previewUrl;
            currentItem.optimizedFile = optResult.optimizedFile;
            currentItem.width = optResult.width;
            currentItem.height = optResult.height;
            currentItem.optimizedSize = optResult.optimizedSize;
            currentItem.status = "ready";
          }
        }
      } catch (err: any) {
        console.error(`[PostComposer] Failed to optimize ${file.name}:`, err);
        const currentItem = form.mediaItems[idx];
        if (currentItem) {
          currentItem.status = "error";
          currentItem.error = err?.message || "Optimization failed";
        }
        await showToast(err?.message || `Failed to process ${file.name}`, "danger");
      }
    })();
  }
};

const removeMedia = (id: string) => {
  if (!form.mediaItems) return;
  const idx = form.mediaItems.findIndex((m) => m.id === id);
  if (idx !== -1) {
    const item = form.mediaItems[idx];
    if (item.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(item.previewUrl);
    }
    if (item.thumbnailUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(item.thumbnailUrl);
    }
    form.mediaItems.splice(idx, 1);
  }
};

const moveMedia = (index: number, direction: number) => {
  if (!form.mediaItems) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= form.mediaItems.length) return;

  const item = form.mediaItems.splice(index, 1)[0];
  form.mediaItems.splice(targetIndex, 0, item);
};

onUnmounted(() => {
  revokeAllMediaUrls();
});

const validate = (): boolean => {
  let valid = true;
  Object.keys(errors).forEach((k) => delete errors[k as keyof PostFormData]);

  if (!form.title.trim()) {
    errors.title = "Title is required.";
    valid = false;
  }
  if (!form.category) {
    errors.category = "Choose a category.";
    valid = false;
  }
  if (!form.description.trim()) {
    errors.description = "Description is required.";
    valid = false;
  }
  if (!form.location.trim()) {
    errors.location = "Location is required.";
    valid = false;
  }
  if (!form.eventDate) {
    errors.eventDate = "Date is required.";
    valid = false;
  }

  return valid;
};

const handleSubmit = async () => {
  if (submissionState.value === "sending" || hasPreparingMedia.value || !validate()) return;
  submissionState.value = "sending";

  try {
    const validRemoteImageUrl =
      form.imageUrl && !form.imageUrl.startsWith("blob:") ? form.imageUrl.trim() : null;

    const payload: PostFormData = {
      ...form,
      imageUrl: validRemoteImageUrl,
      imageFile: form.imageFile || null,
      mediaItems: form.mediaItems || [],
      clientRequestId: activeClientRequestId.value
    };

    const newPostId = await createPost(payload);
    submissionState.value = "sent";

    const toast = await toastController.create({
      message: `${form.type === "found" ? "Found" : "Lost"} report posted successfully!`,
      duration: 2500,
      position: "top",
      color: "success"
    });
    await toast.present();

    emit("submit", payload);
    emit("created", newPostId);
    emit("close");
  } catch (err: any) {
    console.error("[PostComposerModal] Post creation failed:", err);
    submissionState.value = "failed";
    const toast = await toastController.create({
      message: err?.message || "Failed to publish post. Tap Retry to try again.",
      duration: 3500,
      position: "top",
      color: "danger"
    });
    await toast.present();
  }
};
</script>

<style scoped>
/* Hidden inputs */
.hidden-file-input {
  display: none;
}

/* Modal Styling */
.post-composer-modal {
  --background: var(--app-surface);
  --border-radius: 20px 20px 0 0;
  --max-height: 92vh;
}

@media (min-width: 1200px) {
  .post-composer-modal {
    --width: 580px;
    --height: 82vh;
    --max-height: 820px;
    --border-radius: 20px;
    --box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
  }

  .post-composer-modal::part(content) {
    border-radius: 20px;
    overflow: hidden;
    background: var(--app-surface);
    border: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
    position: relative;
    margin: auto;
  }
}

.composer-sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--app-surface);
  color: var(--app-text-primary);
  box-sizing: border-box;
}

/* Header Bar */
.composer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--app-border, rgba(20, 25, 30, 0.08));
  flex-shrink: 0;
  min-height: 54px;
}

.header-cancel-btn {
  background: transparent;
  border: none;
  font-size: 15px;
  color: var(--app-text-secondary);
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
}

.header-cancel-btn:hover {
  color: var(--app-text-primary);
}

.header-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 550;
  color: var(--app-primary, #2640DB);
  cursor: pointer;
  padding: 4px 8px 4px 0;
}

.header-back-btn:hover {
  opacity: 0.85;
}

.composer-header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text-primary);
  letter-spacing: -0.01em;
}

.header-done-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 6px 16px;
  font-size: 13.5px;
  font-weight: 650;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.header-done-btn:hover {
  opacity: 0.9;
}

.header-post-btn {
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  border: none;
  font-size: 14px;
  font-weight: 600;
  border-radius: 18px;
  padding: 6px 18px;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
  min-width: 60px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.header-post-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.header-post-btn:active:not(:disabled) {
  background: var(--app-primary-deep, #0019B7);
  transform: scale(0.96);
}

.post-spinner {
  width: 14px;
  height: 14px;
  --color: #ffffff;
}

/* Composer Body */
.composer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 40px;
  display: flex;
  flex-direction: column;
  background: var(--app-surface);
}

/* Panel Fade Transitions */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.panel-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.panel-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
