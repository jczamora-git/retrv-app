<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import { useAuth, currentAppUserId } from "./composables/useAuth";
import { useConversations } from "./composables/useConversations";
import { useNotifications } from "./composables/useNotifications";
import { useMessageUnread } from "./composables/useMessageUnread";
import { initPushNotifications } from "./services/pushNotificationService";

const router = useRouter();
const { hasValidSession, initializeAuthSession } = useAuth();
const { subscribeToConversations } = useConversations();
const { subscribeToNotifications, unsubscribeFromNotifications } = useNotifications();
const { setupConversationsRealtime, cleanupConversationsRealtime } = useMessageUnread();

const handleResume = () => {
  if (document.visibilityState === 'visible' && hasValidSession.value) {
    subscribeToConversations();
    subscribeToNotifications();
    setupConversationsRealtime();
  }
};

onMounted(async () => {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleResume);
  }
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
</style>
