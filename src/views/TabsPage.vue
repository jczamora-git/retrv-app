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
    <MessagesPage v-else-if="currentTab === 'messages'" />
    <ProfilePage v-else-if="currentTab === 'profile'" />
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

  <!-- Shared Notifications Sheet Modal -->
  <NotificationsModal
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
import MessagesPage from "./MessagesPage.vue";
import ProfilePage from "./ProfilePage.vue";
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

const currentTab = computed<"home" | "messages" | "profile">(() => {
  if (route.path.includes("/messages")) return "messages";
  if (route.path.includes("/profile")) return "profile";
  return "home";
});

const handleSelectTab = (tab: "home" | "messages" | "profile") => {
  if (tab === "home") {
    router.push("/tabs/home");
  } else if (tab === "messages") {
    router.push("/tabs/messages");
  } else {
    router.push("/tabs/profile");
  }
};

const openCreateComposer = () => {
  selectedType.value = "lost";
  showComposer.value = true;
};

const handlePostSubmit = () => {
  showComposer.value = false;
  router.push("/tabs/home");
};
</script>

<style scoped>
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
