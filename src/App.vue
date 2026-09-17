<template>
  <ion-app>
    <!-- Branded Startup Loading Screen -->
    <transition name="fade">
      <div v-if="!isAuthReady" class="app-splash-screen">
        <img
          src="/retrv-app@300x.png"
          alt="Retrv app icon"
          class="splash-logo"
        />
        <img
          src="/retrv-text.svg"
          alt="Retrv"
          class="splash-wordmark"
        />
        <p class="splash-subtitle">Community item recovery &amp; reconnection</p>
        <ion-spinner name="crescent" class="splash-spinner" />
      </div>
    </transition>

    <ion-router-outlet v-show="isAuthReady" />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { IonApp, IonRouterOutlet, IonSpinner } from "@ionic/vue";
import { useAuth, currentAppUserId } from "./composables/useAuth";
import { useConversations } from "./composables/useConversations";
import { useNotifications } from "./composables/useNotifications";
import { useMessageUnread } from "./composables/useMessageUnread";
import { initPushNotifications } from "./services/pushNotificationService";

const router = useRouter();
const { isAuthReady, hasValidSession, initializeAuthSession } = useAuth();
const { subscribeToConversations } = useConversations();
const { subscribeToNotifications, unsubscribeFromNotifications } = useNotifications();
const { setupConversationsRealtime, cleanupConversationsRealtime } = useMessageUnread();

onMounted(async () => {
  await initializeAuthSession();
  if (hasValidSession.value) {
    subscribeToConversations();
    setupConversationsRealtime();
    subscribeToNotifications();
    const uid = currentAppUserId.value;
    if (uid) {
      initPushNotifications(uid, router);
    }
  }
});

watch(hasValidSession, (valid) => {
  if (valid) {
    subscribeToConversations();
    setupConversationsRealtime();
    subscribeToNotifications();
    const uid = currentAppUserId.value;
    if (uid) {
      initPushNotifications(uid, router);
    }
  } else {
    unsubscribeFromNotifications();
    cleanupConversationsRealtime();
  }
});
</script>

<style scoped>
.app-splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: var(--app-bg);
  color: var(--app-text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  user-select: none;
}

.splash-logo {
  width: 88px;
  height: 88px;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(22, 55, 199, 0.25);
  margin-bottom: 12px;
}

.splash-wordmark {
  height: 32px;
  width: auto;
  display: block;
  object-fit: contain;
  margin-bottom: 6px;
}

.splash-subtitle {
  margin: 0 0 18px;
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text-secondary);
}

.splash-spinner {
  color: var(--app-primary);
  width: 26px;
  height: 26px;
}

.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-leave-to {
  opacity: 0;
}
</style>
