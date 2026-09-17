<template>
  <ion-page class="security-settings-page">
    <PageHeader
      title="Password &amp; Security"
      :show-back="true"
      default-back-url="/settings"
      @back="router.replace('/settings')"
    />

    <ion-content :fullscreen="false" :force-overscroll="false" class="security-settings-content">
      <div class="settings-container">
        <!-- SECURITY OPTIONS -->
        <section class="settings-group-section">
          <h2 class="group-label">SECURITY CONTROLS</h2>
          <div class="group-surface">
            <!-- Change Password -->
            <div class="setting-item-row disabled-row">
              <div class="row-text-column">
                <span class="row-title">Change Password</span>
                <span class="row-subtitle">Update your login credentials</span>
              </div>
              <span class="status-badge badge-neutral">Coming soon</span>
            </div>

            <div class="group-divider"></div>

            <!-- Two-Factor Authentication -->
            <div class="setting-item-row disabled-row">
              <div class="row-text-column">
                <span class="row-title">Two-Factor Authentication</span>
                <span class="row-subtitle">Additional layer of account protection</span>
              </div>
              <span class="status-badge badge-neutral">Coming soon</span>
            </div>

            <div class="group-divider"></div>

            <!-- Active Sessions -->
            <div class="setting-item-row">
              <div class="row-text-column">
                <span class="row-title">Active Sessions</span>
                <span class="row-subtitle">1 active session &bull; This device</span>
              </div>
              <span class="status-badge badge-active">Active</span>
            </div>
          </div>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import PageHeader from '../components/PageHeader.vue';

const router = useRouter();
</script>

<style scoped>
.security-settings-page {
  --background: var(--app-bg, #0B0D13);
}

.security-settings-content {
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

.group-surface {
  background: var(--app-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
  border-radius: 18px;
  overflow: hidden;
}

.setting-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  min-height: 56px;
  box-sizing: border-box;
  gap: 12px;
}

.disabled-row {
  opacity: 0.72;
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

.status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  flex-shrink: 0;
}

.badge-neutral {
  background: var(--app-surface-secondary, rgba(255, 255, 255, 0.07));
  color: var(--app-text-secondary, #94A3B8);
}

.badge-active {
  background: rgba(34, 181, 115, 0.15);
  color: #22B573;
}

.group-divider {
  height: 1px;
  background: var(--app-card-border, rgba(255, 255, 255, 0.06));
  margin: 0 16px;
}
</style>
