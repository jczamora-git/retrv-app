<template>
  <!-- DESKTOP WEB SHELL (>= 1200px) -->
  <DesktopWebShell
    v-if="isDesktop"
    :current-tab="currentTab"
    :unread-count="unreadCount"
    :show-context-rail="currentTab === 'home'"
    @select-tab="handleSelectTab"
    @open-create="openCreateComposer"
    @open-notifications="showNotificationsModal = true"
  >
    <DesktopHomePage v-if="currentTab === 'home'" />
    <DesktopMessagesPage v-else-if="currentTab === 'messages'" />
    <DesktopProfilePage v-else-if="currentTab === 'profile'" />
    <DesktopNotificationsPage v-else-if="currentTab === 'notifications'" />
  </DesktopWebShell>

  <!-- MOBILE / TABLET IONIC SHELL (< 1200px) -->
  <ion-page v-else class="mobile-app-shell">
    <ion-tabs class="mobile-tabs-container">
      <ion-router-outlet />

      <!-- Mobile & Tablet Bottom Navigation Dock (< 1200px) -->
      <AppDock
        class="mobile-only-dock"
        :current-tab="currentTab"
        @select-tab="handleSelectTab"
        @open-create="openCreateComposer"
      />
    </ion-tabs>
  </ion-page>

  <!-- Shared Post Composer Modal (Used everywhere: Mobile, Tablet, Desktop) -->
  <PostComposerModal
    :is-open="showComposer"
    :initial-type="selectedType"
    @close="showComposer = false"
    @submit="handlePostSubmit"
  />

  <!-- Mobile & Tablet Notifications Sheet Modal (< 1200px only) -->
  <NotificationsModal
    v-if="!isDesktop"
    :is-open="showNotificationsModal"
    @close="showNotificationsModal = false"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonPage,
  IonRouterOutlet,
  IonTabs
} from "@ionic/vue";
import AppDock from "../components/AppDock.vue";
import PostComposerModal from "../components/PostComposerModal.vue";
import NotificationsModal from "../components/NotificationsModal.vue";
import DesktopWebShell from "../components/desktop/DesktopWebShell.vue";
import DesktopHomePage from "./desktop/DesktopHomePage.vue";
import DesktopMessagesPage from "./desktop/DesktopMessagesPage.vue";
import DesktopProfilePage from "./desktop/DesktopProfilePage.vue";
import DesktopNotificationsPage from "./desktop/DesktopNotificationsPage.vue";
import { useNotifications } from "../composables/useNotifications";
import type { PostType } from "../types/post";

const route = useRoute();
const router = useRouter();
const { unreadCount } = useNotifications();

const isDesktop = ref(
  typeof window !== "undefined" ? window.matchMedia("(min-width: 1200px)").matches : false
);

let mediaQueryList: MediaQueryList | null = null;
const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
  isDesktop.value = e.matches;
};

onMounted(() => {
  if (typeof window !== "undefined") {
    mediaQueryList = window.matchMedia("(min-width: 1200px)");
    isDesktop.value = mediaQueryList.matches;
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleMediaChange);
    } else {
      mediaQueryList.addListener(handleMediaChange);
    }
  }
});

onUnmounted(() => {
  if (mediaQueryList) {
    if (mediaQueryList.removeEventListener) {
      mediaQueryList.removeEventListener("change", handleMediaChange);
    } else {
      mediaQueryList.removeListener(handleMediaChange);
    }
    mediaQueryList = null;
  }
});

const showComposer = ref(false);
const showNotificationsModal = ref(false);
const selectedType = ref<PostType>("lost");

const currentTab = computed<"home" | "messages" | "profile" | "notifications">(() => {
  if (route.name === "Messages" || route.path.startsWith("/messages")) return "messages";
  if (route.name === "Profile" || route.path.startsWith("/profile")) return "profile";
  if (route.name === "Notifications" || route.path.startsWith("/notifications")) return "notifications";
  return "home";
});

const handleSelectTab = (tab: "home" | "messages" | "profile") => {
  if (tab === "home") {
    router.push({ name: "Home" });
  } else if (tab === "messages") {
    router.push({ name: "Messages" });
  } else {
    router.push({ name: "Profile" });
  }
};

const openCreateComposer = () => {
  selectedType.value = "lost";
  showComposer.value = true;
};

const handlePostSubmit = () => {
  showComposer.value = false;
  router.push({ name: "Home" });
};
</script>

<style scoped>
.tabs-root-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
  contain: none !important;
  background: var(--app-bg);
}

/* Mobile / Tablet Ionic App Shell (< 1200px) */
.mobile-app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--app-bg);
}

.mobile-tabs-container {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
