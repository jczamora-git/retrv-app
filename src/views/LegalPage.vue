<template>
  <ion-page class="legal-page">
    <PageHeader
      title="Legal & Privacy"
      :show-back="true"
      default-back-url="/tabs/profile"
    />

    <ion-content :fullscreen="false" :force-overscroll="false" class="legal-content">
      <div class="legal-container">
        <!-- Introduction note -->
        <div class="legal-intro-card">
          <div class="intro-icon-wrap">
            <ShieldCheck :size="24" class="intro-icon" />
          </div>
          <div class="intro-text">
            <h2 class="intro-title">Trust &amp; Community Safety</h2>
            <p class="intro-desc">
              Review Retrv's official policies, terms, community rules, and account deletion guidance.
            </p>
          </div>
        </div>

        <!-- Policy Navigation Menu -->
        <div class="legal-menu-card">
          <!-- Privacy Policy -->
          <button
            type="button"
            class="legal-row-btn"
            @click="navigateTo('/legal/privacy')"
          >
            <div class="row-left">
              <div class="row-icon-wrap icon-privacy">
                <Lock :size="18" />
              </div>
              <div class="row-info">
                <span class="row-title">Privacy Policy</span>
                <span class="row-subtitle">What data we collect and how it is used</span>
              </div>
            </div>
            <ChevronRight :size="18" class="row-chevron" />
          </button>

          <div class="legal-row-divider"></div>

          <!-- Terms of Use -->
          <button
            type="button"
            class="legal-row-btn"
            @click="navigateTo('/legal/terms')"
          >
            <div class="row-left">
              <div class="row-icon-wrap icon-terms">
                <FileText :size="18" />
              </div>
              <div class="row-info">
                <span class="row-title">Terms of Use</span>
                <span class="row-subtitle">Rules and conditions for using Retrv</span>
              </div>
            </div>
            <ChevronRight :size="18" class="row-chevron" />
          </button>

          <div class="legal-row-divider"></div>

          <!-- Community Guidelines -->
          <button
            type="button"
            class="legal-row-btn"
            @click="navigateTo('/legal/community-guidelines')"
          >
            <div class="row-left">
              <div class="row-icon-wrap icon-guidelines">
                <HeartHandshake :size="18" />
              </div>
              <div class="row-info">
                <span class="row-title">Community Guidelines</span>
                <span class="row-subtitle">Standards for honest and safe item recovery</span>
              </div>
            </div>
            <ChevronRight :size="18" class="row-chevron" />
          </button>

          <div class="legal-row-divider"></div>

          <!-- Delete Account -->
          <button
            type="button"
            class="legal-row-btn row-danger"
            @click="navigateTo('/legal/delete-account')"
          >
            <div class="row-left">
              <div class="row-icon-wrap icon-delete">
                <Trash2 :size="18" />
              </div>
              <div class="row-info">
                <span class="row-title">Delete Account</span>
                <span class="row-subtitle">Information &amp; data deletion requests</span>
              </div>
            </div>
            <ChevronRight :size="18" class="row-chevron" />
          </button>
        </div>

        <!-- Footer Info -->
        <div class="legal-footer">
          <p class="app-version-text">Retrv v1.0.0 (Build 1)</p>
          <p class="legal-copyright">Your way back to what matters.</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import {
  ShieldCheck,
  Lock,
  FileText,
  HeartHandshake,
  Trash2,
  ChevronRight
} from 'lucide-vue-next';
import PageHeader from '../components/PageHeader.vue';

const router = useRouter();

const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<style scoped>
.legal-page {
  --background: var(--app-bg, #0B0D13);
}

.legal-content {
  --background: var(--app-bg, #0B0D13);
}

.legal-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px 16px calc(60px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.legal-intro-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--app-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
  border-radius: 20px;
}

.intro-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(38, 64, 219, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.intro-icon {
  color: var(--app-primary, #2640DB);
}

.intro-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.intro-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text-primary, #FFFFFF);
  letter-spacing: -0.01em;
}

.intro-desc {
  margin: 0;
  font-size: 13px;
  color: var(--app-text-secondary, #94A3B8);
  line-height: 1.4;
}

.legal-menu-card {
  background: var(--app-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--app-card-border, rgba(255, 255, 255, 0.08));
  border-radius: 20px;
  overflow: hidden;
}

.legal-row-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
  touch-action: manipulation;
}

.legal-row-btn:active {
  background: var(--app-surface-secondary, rgba(255, 255, 255, 0.08));
}

.row-left {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.row-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-privacy {
  background: rgba(59, 130, 246, 0.12);
  color: #3B82F6;
}

.icon-terms {
  background: rgba(38, 64, 219, 0.12);
  color: #2640DB;
}

.icon-guidelines {
  background: rgba(16, 185, 129, 0.12);
  color: #10B981;
}

.icon-delete {
  background: rgba(239, 68, 68, 0.12);
  color: #EF4444;
}

.row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-chevron {
  color: var(--app-text-tertiary, #64748B);
  flex-shrink: 0;
  margin-left: 8px;
}

.legal-row-divider {
  height: 1px;
  background: var(--app-card-border, rgba(255, 255, 255, 0.06));
  margin: 0 16px;
}

.legal-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: 16px;
  gap: 4px;
}

.app-version-text {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-tertiary, #64748B);
}

.legal-copyright {
  margin: 0;
  font-size: 12px;
  color: var(--app-text-muted, #475569);
}
</style>
