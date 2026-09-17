<template>
  <ion-page class="notification-settings-page">
    <!-- Sticky Header with Explicit Return to Settings -->
    <PageHeader
      title="Notifications"
      :show-back="true"
      default-back-url="/settings"
      @back="router.replace('/settings')"
    />

    <ion-content :fullscreen="false" :force-overscroll="false" class="notification-settings-content">
      <div class="settings-container">
          
          <!-- 1. MASTER NOTIFICATIONS CONTROL -->
          <section class="settings-group-section">
            <h2 class="group-label">NOTIFICATIONS</h2>
            <div class="group-surface">
              <div class="setting-toggle-row master-row">
                <div class="row-text-column">
                  <span class="row-title">Notifications</span>
                  <span class="row-subtitle">Receive notifications from Retrv</span>
                </div>
                <label class="switch" :class="{ loading: saving }">
                  <input
                    type="checkbox"
                    :checked="preferences.enabled"
                    @change="onMasterToggleChange"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="group-divider"></div>

              <!-- Device Permission Status -->
              <div class="device-perm-row">
                <div class="row-text-column">
                  <span class="row-title">Device Permission</span>
                  <div class="perm-status-indicator">
                    <span
                      class="perm-badge"
                      :class="isDevicePermissionGranted ? 'perm-badge-granted' : 'perm-badge-denied'"
                    >
                      {{ isDevicePermissionGranted ? 'Allowed' : 'Not allowed' }}
                    </span>
                  </div>
                </div>

                <button
                  v-if="!isDevicePermissionGranted"
                  type="button"
                  class="enable-perm-btn"
                  @click="handleRequestPermission"
                >
                  Enable Notifications
                </button>
              </div>
            </div>
          </section>

          <!-- 2. ACTIVITY CATEGORIES -->
          <section class="settings-group-section" :class="{ 'section-disabled': !preferences.enabled }">
            <h2 class="group-label">ACTIVITY</h2>
            <div class="group-surface">
              <!-- Messages -->
              <div class="setting-toggle-row">
                <div class="row-text-column">
                  <span class="row-title">Messages</span>
                  <span class="row-subtitle">New private messages</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :disabled="!preferences.enabled"
                    :checked="preferences.messages"
                    @change="onCategoryToggleChange('messages', $event)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="group-divider"></div>

              <!-- Comments -->
              <div class="setting-toggle-row">
                <div class="row-text-column">
                  <span class="row-title">Comments</span>
                  <span class="row-subtitle">Comments on your posts</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :disabled="!preferences.enabled"
                    :checked="preferences.comments"
                    @change="onCategoryToggleChange('comments', $event)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="group-divider"></div>

              <!-- Replies -->
              <div class="setting-toggle-row">
                <div class="row-text-column">
                  <span class="row-title">Replies</span>
                  <span class="row-subtitle">Replies to your comments</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :disabled="!preferences.enabled"
                    :checked="preferences.replies"
                    @change="onCategoryToggleChange('replies', $event)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="group-divider"></div>

              <!-- New Posts -->
              <div class="setting-toggle-row">
                <div class="row-text-column">
                  <span class="row-title">New Posts</span>
                  <span class="row-subtitle">When new Lost or Found posts are created</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :disabled="!preferences.enabled"
                    :checked="preferences.newPosts"
                    @change="onCategoryToggleChange('newPosts', $event)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </section>

          <!-- 3. COMMUNITY CATEGORIES -->
          <section class="settings-group-section" :class="{ 'section-disabled': !preferences.enabled }">
            <h2 class="group-label">COMMUNITY</h2>
            <div class="group-surface">
              <!-- Community Merits -->
              <div class="setting-toggle-row">
                <div class="row-text-column">
                  <span class="row-title">Community Merits</span>
                  <span class="row-subtitle">Notify me when I receive a verified merit</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :disabled="!preferences.enabled"
                    :checked="preferences.merits"
                    @change="onCategoryToggleChange('merits', $event)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="group-divider"></div>

              <!-- Resolved Posts -->
              <div class="setting-toggle-row">
                <div class="row-text-column">
                  <span class="row-title">Resolved Posts</span>
                  <span class="row-subtitle">Notify me when a post I interacted with is resolved</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :disabled="!preferences.enabled"
                    :checked="preferences.resolvedPosts"
                    @change="onCategoryToggleChange('resolvedPosts', $event)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="group-divider"></div>

              <!-- Post Updates -->
              <div class="setting-toggle-row">
                <div class="row-text-column">
                  <span class="row-title">Post Updates</span>
                  <span class="row-subtitle">Important updates to posts you follow</span>
                </div>
                <label class="switch">
                  <input
                    type="checkbox"
                    :disabled="!preferences.enabled"
                    :checked="preferences.postUpdates"
                    @change="onCategoryToggleChange('postUpdates', $event)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>
            </div>
          </section>
        </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, toastController } from '@ionic/vue';
import PageHeader from '../components/PageHeader.vue';
import { useNotificationPreferences, NotificationPreferences } from '../composables/useNotificationPreferences';

const router = useRouter();
const {
  preferences,
  saving,
  devicePermission,
  loadPreferences,
  updatePreference,
  setMasterEnabled,
  requestDevicePermission,
  checkDevicePermission
} = useNotificationPreferences();

const isDevicePermissionGranted = computed(() => {
  return devicePermission.value === 'granted';
});

onMounted(async () => {
  await loadPreferences();
  await checkDevicePermission();
});

const onMasterToggleChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const isChecked = target.checked;
  await setMasterEnabled(isChecked);
};

const onCategoryToggleChange = async (
  key: keyof Omit<NotificationPreferences, 'enabled'>,
  event: Event
) => {
  const target = event.target as HTMLInputElement;
  await updatePreference(key, target.checked);
};

const handleRequestPermission = async () => {
  const granted = await requestDevicePermission();
  await checkDevicePermission();
  if (granted) {
    const toast = await toastController.create({
      message: 'Notifications enabled for this device.',
      duration: 2500,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }
};
</script>

<style scoped>
.notification-settings-page {
  --background: var(--app-bg, #0B0D13);
}

.notification-settings-content {
  --background: var(--app-bg, #0B0D13);
}

.settings-container {
  max-width: var(--max-content-width, 600px);
  width: 100%;
  margin: 0 auto;
  padding: 18px 16px 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
}

/* Group Section */
.settings-group-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.2s ease;
}

.section-disabled {
  opacity: 0.55;
}

.group-label {
  margin: 0;
  padding: 0 4px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--app-text-tertiary, #64748B);
}

/* Group Surface */
.group-surface {
  background: var(--app-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
  border-radius: 18px;
  overflow: hidden;
}

/* Row Layout */
.setting-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  min-height: 56px;
  box-sizing: border-box;
  gap: 12px;
}

.row-text-column {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.row-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary, #FFFFFF);
  letter-spacing: -0.01em;
}

.row-subtitle {
  font-size: 12.5px;
  color: var(--app-text-secondary, #94A3B8);
  line-height: 1.35;
}

/* Device Permission Row */
.device-perm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  min-height: 54px;
  gap: 12px;
}

.perm-status-indicator {
  margin-top: 2px;
}

.perm-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.perm-badge-granted {
  background: rgba(34, 181, 115, 0.15);
  color: #22B573;
}

.perm-badge-denied {
  background: rgba(100, 116, 139, 0.15);
  color: var(--app-text-secondary, #94A3B8);
}

.enable-perm-btn {
  background: var(--retrv-primary, #2640DB);
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.enable-perm-btn:hover {
  opacity: 0.92;
}

.enable-perm-btn:active {
  transform: scale(0.97);
}

.group-divider {
  height: 1px;
  background: var(--app-card-border, rgba(255, 255, 255, 0.06));
  margin: 0 16px;
}

/* Toggle Switch Styling */
.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 26px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--app-surface-tertiary, #334155);
  transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: #FFFFFF;
  transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--retrv-primary, #2640DB);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--retrv-primary, #2640DB);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

input:disabled + .slider {
  cursor: not-allowed;
}

.slider.round {
  border-radius: 26px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
