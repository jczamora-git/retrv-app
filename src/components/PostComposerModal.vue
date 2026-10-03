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
            :disabled="!isValid || submissionState === 'sending'"
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
          accept="image/jpeg,image/png,image/webp"
          class="hidden-file-input"
          @change="onPhotoSelected"
        />

        <!-- Transition Panel Content -->
        <transition name="panel-fade" mode="out-in">
          <ComposerMainPanel
            v-if="currentPanel === 'compose'"
            :form="form"
            :current-profile="currentProfile"
            :preview-photo-url="previewPhotoUrl"
            :photo-error="photoError"
            :errors="errors"
            :submitting="submitting"
            @open-panel="openPanel"
            @trigger-photo="triggerPhotoPicker"
            @remove-photo="removePhoto"
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
import { validateImageFile } from "../utils/fileValidation";
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
const previewPhotoUrl = ref("");
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
  imageFile: null
});

const errors = reactive<PostFormErrors>({});

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

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (previewPhotoUrl.value?.startsWith("blob:")) {
        URL.revokeObjectURL(previewPhotoUrl.value);
      }
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
      previewPhotoUrl.value = "";
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

const triggerPhotoPicker = () => {
  fileInputRef.value?.click();
};

const onPhotoSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const validation = validateImageFile(file);
  if (!validation.valid) {
    photoError.value = validation.error || "Please select a valid image.";
    if (fileInputRef.value) fileInputRef.value.value = "";
    return;
  }

  if (previewPhotoUrl.value?.startsWith("blob:")) {
    URL.revokeObjectURL(previewPhotoUrl.value);
  }

  form.imageFile = file;
  form.imageUrl = "";
  previewPhotoUrl.value = URL.createObjectURL(file);
  photoError.value = "";
};

const removePhoto = () => {
  if (previewPhotoUrl.value?.startsWith("blob:")) {
    URL.revokeObjectURL(previewPhotoUrl.value);
  }
  form.imageFile = null;
  form.imageUrl = "";
  form.imageKey = "";
  previewPhotoUrl.value = "";
  photoError.value = "";
  if (fileInputRef.value) fileInputRef.value.value = "";
};

onUnmounted(() => {
  if (previewPhotoUrl.value?.startsWith("blob:")) {
    URL.revokeObjectURL(previewPhotoUrl.value);
  }
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
  if (submissionState.value === "sending" || !validate()) return;
  submissionState.value = "sending";

  try {
    const validRemoteImageUrl =
      form.imageUrl && !form.imageUrl.startsWith("blob:") ? form.imageUrl.trim() : null;

    const payload: PostFormData = {
      ...form,
      imageUrl: validRemoteImageUrl,
      imageFile: form.imageFile || null,
      clientRequestId: activeClientRequestId.value
    };

    const newPostId = await createPost(payload);
    submissionState.value = "sent";

    // If an image was uploaded, cache it locally
    if (payload.imageUrl) {
      form.imageUrl = payload.imageUrl;
      form.imageFile = null;
    }

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
