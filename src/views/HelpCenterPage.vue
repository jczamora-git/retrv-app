<template>
  <ion-page class="help-center-page">
    <PageHeader
      title="Help Center"
      :show-back="true"
      default-back-url="/settings"
      @back="router.replace('/settings')"
    />

    <ion-content :fullscreen="false" :force-overscroll="false" class="help-center-content">
      <div class="settings-container">
        <!-- QUICK GUIDE -->
        <section class="settings-group-section">
          <h2 class="group-label">COMMUNITY FAQ &amp; GUIDES</h2>
          <div class="group-surface help-surface">
            <div class="help-article-item">
              <h3 class="help-question">Reporting a Lost Item</h3>
              <p class="help-answer">
                Tap the "+" button in the center of the bottom navigation bar to create a Lost report with item details, category, location, and photos.
              </p>
            </div>

            <div class="group-divider"></div>

            <div class="help-article-item">
              <h3 class="help-question">Reporting a Found Item</h3>
              <p class="help-answer">
                Select "Found" when creating a report. Share identifying details to help the owner recognize their item without disclosing confidential proof (such as lock codes or exact serial numbers).
              </p>
            </div>

            <div class="group-divider"></div>

            <div class="help-article-item">
              <h3 class="help-question">Messaging Another Member</h3>
              <p class="help-answer">
                Open any post and tap "Message Finder" or "Message Owner" to start a direct private conversation to safely coordinate item return.
              </p>
            </div>

            <div class="group-divider"></div>

            <div class="help-article-item">
              <h3 class="help-question">Community Merits</h3>
              <p class="help-answer">
                When an item is returned, the post creator can mark the report as resolved and award a Community Merit to recognize the member who helped.
              </p>
            </div>

            <div class="group-divider"></div>

            <div class="help-article-item">
              <h3 class="help-question">Privacy &amp; Notification Settings</h3>
              <p class="help-answer">
                Manage your notification preferences, theme appearance, and account information directly inside your Retrv Settings page.
              </p>
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
.help-center-page {
  --background: var(--app-bg, #0B0D13);
}

.help-center-content {
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

.help-surface {
  padding: 4px 0;
}

.help-article-item {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.help-question {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary, #FFFFFF);
  letter-spacing: -0.01em;
}

.help-answer {
  margin: 0;
  font-size: 13.5px;
  color: var(--app-text-secondary, #94A3B8);
  line-height: 1.5;
}

.group-divider {
  height: 1px;
  background: var(--app-card-border, rgba(255, 255, 255, 0.06));
  margin: 0 16px;
}
</style>
