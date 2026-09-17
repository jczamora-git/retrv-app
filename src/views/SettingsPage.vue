<template>
  <ion-page class="settings-page">
    <!-- Sticky Header with Explicit Return to Profile -->
    <PageHeader
      title="Settings"
      :show-back="true"
      default-back-url="/tabs/profile"
      @back="router.replace('/tabs/profile')"
    />

    <ion-content :fullscreen="false" :force-overscroll="false" class="settings-content">
      <div class="settings-container">
        <!-- 1. GENERAL -->
        <section class="settings-group-section">
          <h2 class="group-label">GENERAL</h2>
          <div class="group-surface">
            <!-- Notifications -->
            <button
              type="button"
              class="settings-row-btn"
              @click="router.push('/settings/notifications')"
            >
              <div class="row-left">
                <Bell :size="21" class="standalone-icon" />
                <div class="row-text-column">
                  <span class="row-title">Notifications</span>
                  <span class="row-subtitle">Manage what Retrv notifies you about</span>
                </div>
              </div>
              <ChevronRight :size="18" class="row-chevron" />
            </button>

            <div class="group-divider"></div>

            <!-- Appearance (Collapsible inline 3-option control) -->
            <div class="appearance-expandable-wrap">
              <button
                type="button"
                class="settings-row-btn"
                @click="isAppearanceExpanded = !isAppearanceExpanded"
              >
                <div class="row-left">
                  <component :is="currentThemeIcon" :size="21" class="standalone-icon" />
                  <div class="row-text-column">
                    <span class="row-title">Appearance</span>
                    <span class="row-subtitle">Choose how Retrv looks</span>
                  </div>
                </div>
                <div class="row-right">
                  <span class="row-badge-value">{{ currentThemeLabel }}</span>
                  <ChevronRight
                    :size="18"
                    class="row-chevron appearance-chevron"
                    :class="{ 'chevron-expanded': isAppearanceExpanded }"
                  />
                </div>
              </button>

              <!-- Inline Segmented Theme Selector -->
              <div v-if="isAppearanceExpanded" class="appearance-inline-panel">
                <div class="theme-segmented-control">
                  <button
                    type="button"
                    class="theme-segment-btn"
                    :class="{ active: themePreference === 'light' }"
                    @click="setTheme('light')"
                  >
                    <Sun :size="16" class="segment-icon" />
                    <span>Light</span>
                  </button>

                  <button
                    type="button"
                    class="theme-segment-btn"
                    :class="{ active: themePreference === 'dark' }"
                    @click="setTheme('dark')"
                  >
                    <Moon :size="16" class="segment-icon" />
                    <span>Dark</span>
                  </button>

                  <button
                    type="button"
                    class="theme-segment-btn"
                    :class="{ active: themePreference === 'system' }"
                    @click="setTheme('system')"
                  >
                    <Monitor :size="16" class="segment-icon" />
                    <span>System</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. SECURITY -->
        <section class="settings-group-section">
          <h2 class="group-label">SECURITY</h2>
          <div class="group-surface">
            <button
              type="button"
              class="settings-row-btn"
              @click="router.push('/settings/security')"
            >
              <div class="row-left">
                <LockKeyhole :size="21" class="standalone-icon" />
                <div class="row-text-column">
                  <span class="row-title">Password &amp; Security</span>
                  <span class="row-subtitle">Manage your account security</span>
                </div>
              </div>
              <ChevronRight :size="18" class="row-chevron" />
            </button>
          </div>
        </section>

        <!-- 3. SUPPORT -->
        <section class="settings-group-section">
          <h2 class="group-label">SUPPORT</h2>
          <div class="group-surface">
            <button
              type="button"
              class="settings-row-btn"
              @click="router.push('/settings/help')"
            >
              <div class="row-left">
                <CircleHelp :size="21" class="standalone-icon" />
                <div class="row-text-column">
                  <span class="row-title">Help Center</span>
                  <span class="row-subtitle">Get help using Retrv</span>
                </div>
              </div>
              <ChevronRight :size="18" class="row-chevron" />
            </button>
          </div>
        </section>

        <!-- 4. LEGAL -->
        <section class="settings-group-section">
          <h2 class="group-label">LEGAL</h2>
          <div class="group-surface">
            <!-- Privacy Policy -->
            <button
              type="button"
              class="settings-row-btn"
              @click="router.push('/legal/privacy')"
            >
              <div class="row-left">
                <ShieldCheck :size="21" class="standalone-icon" />
                <span class="row-title">Privacy Policy</span>
              </div>
              <ChevronRight :size="18" class="row-chevron" />
            </button>

            <div class="group-divider"></div>

            <!-- Terms of Use -->
            <button
              type="button"
              class="settings-row-btn"
              @click="router.push('/legal/terms')"
            >
              <div class="row-left">
                <FileText :size="21" class="standalone-icon" />
                <span class="row-title">Terms of Use</span>
              </div>
              <ChevronRight :size="18" class="row-chevron" />
            </button>

            <div class="group-divider"></div>

            <!-- Community Guidelines -->
            <button
              type="button"
              class="settings-row-btn"
              @click="router.push('/legal/community-guidelines')"
            >
              <div class="row-left">
                <UsersRound :size="21" class="standalone-icon" />
                <span class="row-title">Community Guidelines</span>
              </div>
              <ChevronRight :size="18" class="row-chevron" />
            </button>
          </div>
        </section>

        <!-- 5. ACCOUNT -->
        <section class="settings-group-section">
          <h2 class="group-label">ACCOUNT</h2>
          <div class="group-surface">
            <button
              type="button"
              class="settings-row-btn row-destructive"
              @click="showDeleteModal = true"
            >
              <div class="row-left">
                <Trash2 :size="21" class="standalone-icon icon-danger" />
                <div class="row-text-column">
                  <span class="row-title text-destructive">Delete Account</span>
                  <span class="row-subtitle text-destructive-sub">Permanently remove your Retrv account</span>
                </div>
              </div>
              <ChevronRight :size="18" class="row-chevron icon-danger-chevron" />
            </button>
          </div>
        </section>

        <!-- 6. ABOUT -->
        <section class="settings-group-section">
          <h2 class="group-label">ABOUT</h2>
          <div class="group-surface about-surface">
            <div class="about-data-row">
              <span class="about-field-name">Application</span>
              <span class="about-field-value">Retrv</span>
            </div>

            <div class="about-row-divider"></div>

            <div class="about-data-row">
              <span class="about-field-name">Version</span>
              <span class="about-field-value">1.0.0 (Build 1)</span>
            </div>

            <div class="about-row-divider"></div>

            <div class="about-data-row">
              <span class="about-field-name">Tagline</span>
              <span class="about-field-value tagline-value">Your way back to what matters.</span>
            </div>
          </div>
        </section>
      </div>
    </ion-content>

    <!-- Fixed IonFooter for Sign Out -->
    <ion-footer class="ion-no-border settings-footer">
      <div class="settings-footer-inner">
        <button
          type="button"
          class="sticky-signout-btn"
          @click="handleSignOut"
        >
          <LogOut :size="19" class="signout-icon" />
          <span>Sign Out</span>
        </button>
      </div>
    </ion-footer>

    <!-- DELETE ACCOUNT CONFIRMATION MODAL -->
    <ion-modal
      :is-open="showDeleteModal"
      class="compact-settings-submodal"
      aria-label="Delete Account"
      @did-dismiss="showDeleteModal = false"
    >
      <div class="submodal-content">
        <header class="submodal-header">
          <h3 class="submodal-title text-destructive">Delete Account</h3>
          <button
            type="button"
            class="submodal-close-btn"
            aria-label="Close delete account dialog"
            @click="showDeleteModal = false"
          >
            <X :size="20" />
          </button>
        </header>

        <div class="submodal-body delete-body">
          <p class="delete-warning-text">
            Account deletion is not yet available in this demo build.
          </p>
          <p class="delete-info-text">
            For early data removal or assistance, please refer to our account deletion policy in our legal documentation or contact support.
          </p>

          <div class="delete-action-row">
            <button
              type="button"
              class="delete-learn-btn"
              @click="openDeleteAccountPolicy"
            >
              View Deletion Policy
            </button>
            <button
              type="button"
              class="delete-dismiss-btn"
              @click="showDeleteModal = false"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  IonContent,
  IonFooter,
  IonModal,
  IonPage,
  actionSheetController,
  toastController
} from "@ionic/vue";
import PageHeader from "../components/PageHeader.vue";
import {
  Bell,
  Sun,
  Moon,
  Monitor,
  LockKeyhole,
  CircleHelp,
  ShieldCheck,
  FileText,
  UsersRound,
  Trash2,
  LogOut,
  ChevronRight,
  X
} from "lucide-vue-next";
import { useAuth } from "../composables/useAuth";
import { useTheme } from "../composables/useTheme";

const router = useRouter();
const { signOutUser } = useAuth();
const { themePreference, setTheme } = useTheme();

// Expandable Appearance state (Inline segmented control)
const isAppearanceExpanded = ref(false);

// Delete Account Modal State
const showDeleteModal = ref(false);

const currentThemeLabel = computed(() => {
  if (themePreference.value === "light") return "Light";
  if (themePreference.value === "dark") return "Dark";
  return "System";
});

const currentThemeIcon = computed(() => {
  if (themePreference.value === "light") return Sun;
  if (themePreference.value === "dark") return Moon;
  return Monitor;
});

const openDeleteAccountPolicy = () => {
  showDeleteModal.value = false;
  router.push("/legal/delete-account");
};

const handleSignOut = async () => {
  const actionSheet = await actionSheetController.create({
    header: "Sign Out",
    subHeader: "Are you sure you want to sign out of your account?",
    buttons: [
      {
        text: "Sign Out",
        role: "destructive",
        handler: async () => {
          await signOutUser();
          const toast = await toastController.create({
            message: "Signed out successfully.",
            duration: 2000,
            position: "top",
            color: "medium"
          });
          await toast.present();
          router.replace("/auth");
        }
      },
      {
        text: "Cancel",
        role: "cancel"
      }
    ]
  });
  await actionSheet.present();
};
</script>

<style scoped>
.settings-page {
  --background: var(--app-bg, #0B0D13);
}

.settings-content {
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

/* Section Group */
.settings-group-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

/* Group Surface Container */
.group-surface {
  background: var(--app-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
  border-radius: 18px;
  overflow: hidden;
}

/* Settings Row Button */
.settings-row-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  min-height: 56px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
  touch-action: manipulation;
}

.settings-row-btn:active {
  background: var(--app-surface-secondary, rgba(255, 255, 255, 0.06));
}

.row-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.row-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 10px;
}

/* Standalone Icon */
.standalone-icon {
  color: var(--app-text-secondary, #94A3B8);
  flex-shrink: 0;
}

.icon-danger {
  color: var(--app-lost, #EF4444) !important;
}

.icon-danger-chevron {
  color: rgba(239, 68, 68, 0.6) !important;
}

/* Text Column */
.row-text-column {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary, #FFFFFF);
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.row-subtitle {
  font-size: 12px;
  color: var(--app-text-secondary, #94A3B8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-badge-value {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--app-text-secondary, #94A3B8);
}

.row-chevron {
  color: var(--app-text-tertiary, #64748B);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.appearance-chevron.chevron-expanded {
  transform: rotate(90deg);
}

.group-divider {
  height: 1px;
  background: var(--app-card-border, rgba(255, 255, 255, 0.06));
  margin: 0 14px 0 49px;
}

/* Appearance Inline Segmented Control */
.appearance-expandable-wrap {
  display: flex;
  flex-direction: column;
}

.appearance-inline-panel {
  padding: 2px 14px 14px;
}

.theme-segmented-control {
  display: flex;
  background: var(--app-surface-secondary, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 3px;
  gap: 3px;
  height: 40px;
  box-sizing: border-box;
}

.theme-segment-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--app-text-secondary, #94A3B8);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0 4px;
  white-space: nowrap;
  touch-action: manipulation;
}

.theme-segment-btn:hover {
  color: var(--app-text-primary, #FFFFFF);
}

.theme-segment-btn.active {
  background: var(--retrv-primary, #2640DB);
  color: #FFFFFF;
  box-shadow: 0 2px 6px rgba(38, 64, 219, 0.3);
}

.segment-icon {
  flex-shrink: 0;
}

/* Destructive Row */
.text-destructive {
  color: var(--app-lost, #EF4444) !important;
}

.text-destructive-sub {
  color: rgba(239, 68, 68, 0.8) !important;
}

/* About Surface */
.about-surface {
  padding: 2px 16px;
}

.about-data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 0;
  gap: 12px;
}

.about-field-name {
  font-size: 13.5px;
  color: var(--app-text-secondary, #94A3B8);
  font-weight: 500;
  flex-shrink: 0;
}

.about-field-value {
  font-size: 13.5px;
  color: var(--app-text-primary, #FFFFFF);
  font-weight: 600;
  text-align: right;
  min-width: 0;
}

.tagline-value {
  font-size: 13px;
  color: var(--app-text-secondary, #94A3B8);
  line-height: 1.35;
  max-width: 220px;
}

.about-row-divider {
  height: 1px;
  background: var(--app-card-border, rgba(255, 255, 255, 0.06));
}

/* Settings Footer / Fixed Sign Out */
.settings-footer {
  background: var(--app-bg, #0B0D13);
  --background: var(--app-bg, #0B0D13);
}

.settings-footer-inner {
  max-width: var(--max-content-width, 600px);
  width: 100%;
  margin: 0 auto;
  padding: 10px 16px calc(14px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.sticky-signout-btn {
  width: 100%;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  background: var(--app-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.1));
  color: var(--app-lost, #EF4444);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.sticky-signout-btn:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
}

.sticky-signout-btn:active {
  transform: scale(0.985);
}

.signout-icon {
  color: var(--app-lost, #EF4444);
}

/* Compact Submodal (Delete Account only) */
.compact-settings-submodal {
  --width: calc(100% - 32px);
  --max-width: 400px;
  --height: auto;
  --max-height: 80vh;
  --border-radius: 20px;
  --box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
}

.compact-settings-submodal::part(content) {
  border-radius: 20px;
  overflow: hidden;
  background: var(--app-surface, #141820);
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
}

.submodal-content {
  display: flex;
  flex-direction: column;
  background: var(--app-surface);
  color: var(--app-text-primary);
  box-sizing: border-box;
}

.submodal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--app-card-border);
}

.submodal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--app-text-primary);
}

.submodal-close-btn {
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
}

.submodal-close-btn:active {
  background: var(--app-surface-secondary);
}

.submodal-body {
  padding: 12px 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 60vh;
}

/* Delete Body */
.delete-body {
  gap: 14px;
  padding: 16px 18px 20px;
}

.delete-warning-text {
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--app-text-primary);
  line-height: 1.4;
}

.delete-info-text {
  margin: 0;
  font-size: 13px;
  color: var(--app-text-secondary);
  line-height: 1.45;
}

.delete-action-row {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.delete-learn-btn {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  background: var(--app-primary, #2640DB);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.delete-dismiss-btn {
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid var(--app-card-border);
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
