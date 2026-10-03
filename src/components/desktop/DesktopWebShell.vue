<template>
  <div
    class="desktop-web-shell"
    :class="{ 'is-messages-route': currentTab === 'messages' }"
  >
    <!-- Sticky Desktop Header (Visible on all routes) -->
    <header class="desktop-header-wrap">
      <DesktopHeader
        :unread-count="unreadCount"
        @open-create="emit('open-create')"
        @open-notifications="emit('open-notifications')"
      />
    </header>

    <!-- Fixed Left Navigation Column (Hidden on Messages and Profile) -->
    <aside
      v-if="showNavSidebar"
      class="desktop-nav-column"
      aria-label="Desktop Navigation"
    >
      <DesktopNavSidebar
        :current-tab="currentTab"
        @select-tab="(tab) => emit('select-tab', tab)"
      />
    </aside>

    <!-- Structural Fixed Vertical Divider (Hidden on Messages and Profile) -->
    <div
      v-if="showNavSidebar"
      class="desktop-vertical-divider"
      role="separator"
      aria-orientation="vertical"
      aria-hidden="true"
    ></div>

    <!-- Desktop Content Area (Offset past left nav when sidebar is visible; Full-width when no sidebar) -->
    <div
      class="desktop-content-area"
      :class="{
        'is-messages-tab': currentTab === 'messages',
        'no-sidebar': !showNavSidebar
      }"
    >
      <!-- Center Main Column -->
      <main
        class="desktop-main-column"
        :class="{ 'full-width': currentTab === 'messages' || !showNavSidebar || !showContextRail }"
      >
        <div
          class="desktop-main-viewport"
          :class="{ 'full-width': currentTab === 'messages' || !showNavSidebar || !showContextRail }"
        >
          <slot />
        </div>
      </main>

      <!-- Right Supporting Context Rail (Sticky, Hidden on Messages & Profile) -->
      <aside
        v-if="showContextRail && currentTab !== 'messages' && currentTab !== 'profile'"
        class="desktop-context-column"
      >
        <slot name="context-rail">
          <DesktopContextRail />
        </slot>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DesktopHeader from "./DesktopHeader.vue";
import DesktopNavSidebar from "./DesktopNavSidebar.vue";
import DesktopContextRail from "./DesktopContextRail.vue";

const props = withDefaults(
  defineProps<{
    currentTab?: "home" | "messages" | "profile" | "notifications";
    unreadCount?: number;
    showContextRail?: boolean;
    showSidebar?: boolean;
  }>(),
  {
    currentTab: "home",
    unreadCount: 0,
    showContextRail: true
  }
);

const emit = defineEmits<{
  "select-tab": [tab: "home" | "messages" | "profile"];
  "open-create": [];
  "open-notifications": [];
}>();

const showNavSidebar = computed(() => {
  if (props.showSidebar !== undefined) return props.showSidebar;
  return props.currentTab !== "messages" && props.currentTab !== "profile";
});
</script>

<style scoped>
.desktop-web-shell {
  position: relative;
  width: 100%;
  min-height: 100vh;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--app-bg);
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
}

.desktop-web-shell.is-messages-route {
  overflow: hidden;
  height: 100vh;
}

.desktop-header-wrap {
  display: block;
  position: sticky;
  top: 0;
  z-index: 120;
  width: 100%;
  flex-shrink: 0;
}

/* Fixed Left Navigation Column */
.desktop-nav-column {
  position: fixed;
  top: var(--desktop-header-height, 64px);
  left: 20px;
  bottom: 0;
  width: var(--desktop-nav-width, 240px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

/* Fixed Structural Vertical Divider */
.desktop-vertical-divider {
  position: fixed;
  top: var(--desktop-header-height, 64px);
  left: calc(20px + var(--desktop-nav-width, 240px) + 20px);
  bottom: 0;
  width: 1px;
  background-color: var(--app-border, rgba(20, 25, 30, 0.08));
  z-index: 90;
}

/* Desktop Content Area (Offset past fixed left nav + divider) */
.desktop-content-area {
  display: flex;
  margin-left: calc(20px + var(--desktop-nav-width, 240px) + 20px + 1px);
  width: calc(100% - (20px + var(--desktop-nav-width, 240px) + 20px + 1px));
  min-height: calc(100vh - var(--desktop-header-height, 64px));
  height: auto;
  padding: 0 24px 0 28px;
  box-sizing: border-box;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
}

/* Full Width when Sidebar is Hidden (Profile & Messages) */
.desktop-content-area.no-sidebar {
  margin-left: 0;
  width: 100%;
  padding: 0 24px;
}

/* Messages Route: Expand to full width with zero left offset */
.desktop-content-area.is-messages-tab {
  margin-left: 0;
  width: 100%;
  padding: 0;
  height: calc(100vh - var(--desktop-header-height, 64px));
  overflow: hidden;
}

.desktop-main-column {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 36px;
  min-width: 0;
  padding-top: 4px;
}

.desktop-main-column.full-width {
  width: 100%;
  max-width: 100%;
  gap: 0;
  padding-top: 0;
  height: 100%;
}

.desktop-main-viewport {
  width: 100%;
  max-width: var(--desktop-feed-width, 680px);
  min-width: 0;
}

.desktop-main-viewport.full-width {
  max-width: 100%;
  width: 100%;
  height: 100%;
}

.desktop-context-column {
  width: var(--desktop-right-rail-width, 280px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: var(--desktop-header-height, 64px);
  align-self: flex-start;
}

/* Compact Desktop (1200px to 1359.98px): Collapse context rail */
@media (min-width: 1200px) and (max-width: 1359.98px) {
  .desktop-context-column {
    display: none !important;
  }
}
</style>
