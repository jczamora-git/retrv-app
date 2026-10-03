<template>
  <ion-page class="app-shell-page">
    <!-- Desktop Top Header (>= 1200px, Full-Bleed Sticky Header) -->
    <DesktopHeader
      class="desktop-only-header"
      :unread-count="unreadCount"
      @open-create="openCreateComposer"
      @open-notifications="showNotificationsModal = true"
    />

    <!-- Desktop Left-Anchored Shell Layout -->
    <div class="desktop-shell-layout">
      <!-- Left Navigation Pane (Anchored Left) -->
      <aside class="desktop-sidebar-pane">
        <DesktopSidebar
          class="desktop-only-sidebar"
          :current-tab="currentTab"
          @select-tab="handleSelectTab"
        />
      </aside>

      <!-- Visible Structural Vertical Splitter / Divider -->
      <div
        class="desktop-vertical-divider"
        role="separator"
        aria-orientation="vertical"
        aria-hidden="true"
      ></div>

      <!-- Main Content Region -->
      <div class="desktop-content-pane">
        <!-- Center Feed Column -->
        <main class="outlet-viewport">
          <ion-tabs class="app-tabs-container">
            <ion-router-outlet />

            <!-- Mobile & Tablet Bottom Navigation Dock (< 1200px) -->
            <AppDock
              class="mobile-only-dock"
              :current-tab="currentTab"
              @select-tab="handleSelectTab"
              @open-create="openCreateComposer"
            />
          </ion-tabs>
        </main>

        <!-- Right Supporting Rail Pane -->
        <aside
          v-if="currentTab === 'home'"
          class="desktop-right-pane"
        >
          <DesktopRightRail class="desktop-only-rail" />
        </aside>
      </div>
    </div>

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
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonPage,
  IonRouterOutlet,
  IonTabs
} from "@ionic/vue";
import AppDock from "../components/AppDock.vue";
import PostComposerModal from "../components/PostComposerModal.vue";
import NotificationsModal from "../components/NotificationsModal.vue";
import DesktopHeader from "../components/desktop/DesktopHeader.vue";
import DesktopSidebar from "../components/desktop/DesktopSidebar.vue";
import DesktopRightRail from "../components/desktop/DesktopRightRail.vue";
import { useNotifications } from "../composables/useNotifications";
import type { PostType } from "../types/post";

const route = useRoute();
const router = useRouter();
const { unreadCount } = useNotifications();

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
.app-shell-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--app-bg);
}

.app-tabs-container {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* ========================================================
   MODE A: MOBILE & TABLET (< 1200px)
   ======================================================== */
@media (max-width: 1199.98px) {
  .desktop-only-header,
  .desktop-sidebar-pane,
  .desktop-vertical-divider,
  .desktop-right-pane {
    display: none !important;
  }

  .mobile-only-dock {
    display: flex !important;
  }

  .desktop-shell-layout {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
    padding: 0;
    margin: 0;
  }

  .desktop-content-pane {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
  }

  .outlet-viewport {
    display: block;
    width: 100%;
    height: 100%;
    max-width: 100%;
    position: relative;
  }
}

/* ========================================================
   MODE B: DEDICATED DESKTOP (>= 1200px) — LEFT-ANCHORED
   ======================================================== */
@media (min-width: 1200px) {
  .mobile-only-dock {
    display: none !important;
  }

  .desktop-only-header {
    display: block !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 120 !important;
    width: 100% !important;
    flex-shrink: 0 !important;
  }

  /* Single desktop vertical scroll owner - far right scrollbar */
  .app-shell-page {
    position: relative !important;
    width: 100% !important;
    height: 100vh !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    background: var(--app-bg) !important;
  }

  /* Left-anchored full-bleed shell layout */
  .desktop-shell-layout {
    display: flex !important;
    width: 100% !important;
    min-height: calc(100vh - 64px) !important;
    padding: 0 24px 60px 20px !important;
    box-sizing: border-box !important;
    align-items: stretch !important;
  }

  /* Left Navigation Pane (Anchored left, 240px wide) */
  .desktop-sidebar-pane {
    width: 240px !important;
    flex-shrink: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .desktop-only-sidebar {
    display: flex !important;
    position: sticky !important;
    top: 84px !important;
    align-self: start !important;
    width: 100% !important;
  }

  /* Visible Structural Vertical Splitter / Divider */
  .desktop-vertical-divider {
    display: block !important;
    width: 1px !important;
    background-color: var(--app-border, rgba(20, 25, 30, 0.08)) !important;
    flex-shrink: 0 !important;
    align-self: stretch !important;
    min-height: calc(100vh - 64px) !important;
    margin: 0 28px 0 20px !important;
  }

  /* Main Content Region */
  .desktop-content-pane {
    flex: 1 !important;
    display: flex !important;
    justify-content: center !important;
    align-items: flex-start !important;
    gap: 36px !important;
    min-width: 0 !important;
    padding-top: 4px !important;
  }

  /* Center Feed Viewport */
  .outlet-viewport {
    width: 100% !important;
    max-width: var(--desktop-feed-width, 680px) !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 100% !important;
    position: static !important;
    overflow: visible !important;
    background: transparent !important;
  }

  .app-tabs-container {
    position: static !important;
    height: auto !important;
    min-height: 100% !important;
    overflow: visible !important;
  }

  /* Right Supporting Rail Pane */
  .desktop-right-pane {
    width: var(--desktop-right-rail-width, 280px) !important;
    flex-shrink: 0 !important;
    display: flex !important;
  }

  .desktop-only-rail {
    display: flex !important;
    position: sticky !important;
    top: 84px !important;
    align-self: start !important;
    width: 100% !important;
  }
}

/* Compact Desktop (1200px to 1359.98px): Collapse right rail so feed stays spacious */
@media (min-width: 1200px) and (max-width: 1359.98px) {
  .desktop-right-pane {
    display: none !important;
  }
}
</style>
