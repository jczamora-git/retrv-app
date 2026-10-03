# Retrv Desktop Page Patterns & Guidelines

## 1. Approved Desktop Page Patterns

Retrv desktop views must align with one of four established layout patterns:

---

### Pattern A: Standard Discovery Feed (Home Pattern)
- **Use Case:** Browsing feeds, item discovery, category browsing, community forums.
- **Chrome Configuration:**
  - `DesktopHeader`: **Visible**
  - `DesktopNavSidebar`: **Visible** (`240px`)
  - `DesktopContextRail`: **Visible** (`280px`, collapses `< 1360px`)
- **Center Feed Width:** Max `680px` (`var(--desktop-feed-width)`).
- **Scroll Model:** Outer document scroll.
- **Reference Implementation:** [src/views/desktop/DesktopHomePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/desktop/DesktopHomePage.vue).

---

### Pattern B: Full-Bleed Workspace (Messages Pattern)
- **Use Case:** High-density interaction tools, split-pane chat workspaces, interactive map exploration.
- **Chrome Configuration:**
  - `DesktopHeader`: **Visible**
  - `DesktopNavSidebar`: *Hidden*
  - `DesktopContextRail`: *Hidden*
- **Workspace Width:** `100%` full viewport width.
- **Scroll Model:** Fixed shell container (`height: calc(100vh - 64px)`), internal dual-pane scrolling.
- **Reference Implementation:** [src/views/desktop/DesktopMessagesPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/desktop/DesktopMessagesPage.vue).

---

### Pattern C: Community Content + Dedicated Domain Rail (Profile Pattern)
- **Use Case:** User profiles, organization hub, detailed member summaries.
- **Chrome Configuration:**
  - `DesktopHeader`: **Visible**
  - `DesktopNavSidebar`: *Hidden*
  - `DesktopContextRail`: *Hidden* (Generic rail hidden)
  - `Page-Owned Right Rail`: **Visible** (e.g., Community Merit, Achievements, Member Stats)
- **Layout:** Two-column grid (`1fr 310px` or `1fr 320px`, max-width `1180px`).
- **Scroll Model:** Outer document scroll.
- **Reference Implementation:** [src/views/desktop/DesktopProfilePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/desktop/DesktopProfilePage.vue).

---

### Pattern D: Activity & Notification Feed (Notifications Pattern)
- **Use Case:** Inbox, notification feeds, audit trails, activity history.
- **Chrome Configuration:**
  - `DesktopHeader`: **Visible**
  - `DesktopNavSidebar`: **Visible**
  - `DesktopContextRail`: *Hidden*
- **Content Width:** Max `760px` to `800px` centered.
- **Scroll Model:** Outer document scroll.
- **Reference Implementation:** [src/views/desktop/DesktopNotificationsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/desktop/DesktopNotificationsPage.vue).

---

## 2. Layout Tokens & Sizing Reference

| Token / Property | Canonical Value | Usage |
| :--- | :--- | :--- |
| `--desktop-header-height` | `64px` | Global sticky header |
| `--desktop-nav-width` | `240px` | Fixed left navigation sidebar |
| `--desktop-feed-width` | `680px` | Center feed viewport max-width (Home) |
| `--desktop-right-rail-width` | `280px` | Generic context rail width |
| Profile Rail Width | `310px` – `320px` | Dedicated community identity rail |
| Notifications Feed Width | `760px` | Dedicated notifications card container |

---

## 3. Page Component Responsibilities

### Top-Level Route Component (e.g., `TabsPage.vue`, `PublicProfilePage.vue`)
- **Root Element:** `<ion-page>` (mandatory for root `IonRouterOutlet` lifecycle management).
- **Responsive Branching:** Evaluates `isDesktop (>= 1200px)`:
  - `v-if="isDesktop"` -> mounts `DesktopWebShell` containing the desktop view.
  - `v-else` -> mounts the mobile Ionic presentation (`IonTabs` or `IonContent`).

### Desktop Page Components (`src/views/desktop/Desktop*Page.vue`)
- **MUST:**
  1. Handle route-specific data binding, filtering, tabs, and actions.
  2. Render explicit loading skeletons, empty state placeholders, and error recovery states.
  3. Reuse existing shared composables (`useAuth`, `usePosts`, `useNotifications`, `useChat`).
  4. Use pure standard HTML and CSS variable tokens.
- **MUST NOT:**
  1. Duplicate global chrome (`DesktopHeader`, `DesktopNavSidebar`, `AppDock`).
  2. Wrap desktop layout content in Ionic layout primitives (`IonPage`, `IonContent`, `IonTabs`).
  3. Maintain private, duplicated fetching logic when a shared composable exists.

---

## 4. Shared Business Logic Invariant

> [!IMPORTANT]
> **No Duplicate Business Composables:**
> Desktop views and mobile Ionic views must consume the exact same composables from `src/composables/`.
> 
> - **DO NOT create:** `useDesktopPosts.ts`, `useDesktopNotifications.ts`, `useDesktopChat.ts`.
> - **DO use:** [usePosts.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/composables/usePosts.ts), [useNotifications.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/composables/useNotifications.ts), [useChat.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/composables/useChat.ts).

---

## 5. Desktop Route Creation Recipe

When creating a new desktop route:
1. **Determine Outlet Parentage:** Does this route render under Ionic's root `IonRouterOutlet`? If yes, keep `<ion-page>` at the top-level route boundary.
2. **Define Canonical Route:** Register clean path (e.g., `/explore`) in [src/router/index.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/router/index.ts).
3. **Select Approved Pattern:** Choose Pattern A, B, C, or D.
4. **Configure Shell Policy:** Determine visibility for Header, Sidebar, and Context Rail in `DesktopWebShell.vue`.
5. **Create Pure Desktop Component:** Create `src/views/desktop/Desktop<Name>Page.vue` using pure Vue markup (no `IonContent`).
6. **Connect Shared Composables:** Import data hooks from `src/composables/`.
7. **Preserve Mobile Route:** Keep or implement the `< 1200px` mobile Ionic view cleanly separated.
8. **Verify Route Table:** Update [DESKTOP-ROUTES.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-ROUTES.md).
9. **Verify Shell Regression Safety:** Ensure Home (`/`) retains its `240px` sidebar and context rail.

---

## 6. Routed Desktop Page Template

```vue
<!-- Example Top-Level Route View (src/views/ExplorePage.vue) -->
<template>
  <ion-page class="explore-root-page">
    <!-- DESKTOP WEB SHELL (>= 1200px) -->
    <DesktopWebShell
      v-if="isDesktop"
      current-tab="home"
      @open-create="openComposer"
    >
      <DesktopExplorePage />
    </DesktopWebShell>

    <!-- MOBILE / TABLET IONIC SHELL (< 1200px) -->
    <div v-else class="mobile-explore-shell">
      <PageHeader title="Explore" :show-back="true" default-back-url="/" />
      <ion-content>
        <!-- Mobile Content -->
      </ion-content>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { IonPage, IonContent } from "@ionic/vue";
import DesktopWebShell from "../components/desktop/DesktopWebShell.vue";
import DesktopExplorePage from "./desktop/DesktopExplorePage.vue";
import PageHeader from "../components/PageHeader.vue";

const isDesktop = ref(typeof window !== "undefined" ? window.matchMedia("(min-width: 1200px)").matches : false);
// MediaQuery listener setup...
</script>

<style scoped>
.explore-root-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
  contain: none !important;
  background: var(--app-bg);
}
</style>
```
