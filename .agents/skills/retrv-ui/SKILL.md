---
name: retrv-ui
description: Governs Ionic Vue presentation, view/component architecture, design consistency, Ionic lifecycle hooks, and mobile UX patterns in Retrv.
---

# Retrv UI Skill

> **Target:** Ionic Vue views, shared components, mobile layout patterns, theming, and user interaction states.

---

## 1. UI Presentation Architecture

- **Desktop Web Shell (`>= 1200px`):** Pure Vue 3 / standard HTML shell (`src/components/desktop/DesktopWebShell.vue`) with dedicated desktop views (`src/views/desktop/`).
- **Mobile & Tablet Shell (`< 1200px`):** Ionic Vue 9 (`@ionic/vue: ^9.0.0`, `@ionic/vue-router: ^9.0.0`) + Vue 3 (`vue: ^3.5.0`) with `AppDock` navigation.
- **Documentation Reference:** All desktop UI tasks must consult [docs/desktop/DESKTOP-SHELL.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-SHELL.md) and [docs/desktop/DESKTOP-CHECKLIST.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-CHECKLIST.md).
- **Icons:** Ionicons (`ionicons: ^8.1.0`) & Lucide Vue Next (`lucide-vue-next: ^1.0.0`).
- **Theming:** CSS variables in `src/theme/variables.css` and system dark/light mode detection in `src/composables/useTheme.ts`.
- **View Hierarchy:**
  - `src/views/` (top-level screen views, including responsive gateway `TabsPage.vue`).
  - `src/views/desktop/` (pure Vue desktop views: `DesktopHomePage`, `DesktopMessagesPage`, `DesktopProfilePage`, `DesktopNotificationsPage`).
  - `src/components/` (reusable UI widgets, modals, cards, composers, and `desktop/` shell chrome).

---

## 2. Inviolable UI Presentation Rules

1. **UI Is Not Security:**
   - Never place authorization checks solely in UI templates (`v-if="user.id === authorId"`). UI controls only affordances; backends and RLS must enforce permissions.
2. **Reuse Existing Components & Composables:**
   - Do not duplicate data fetching or mutation logic across page views. Consume authoritative composables from `src/composables/`.
3. **Desktop vs Mobile Separation:**
   - Top-level route components under root `IonRouterOutlet` MUST maintain `<ion-page>` at their template root for view-stack coordination.
   - Inside the desktop branch (`v-if="isDesktop"`), desktop views (`src/views/desktop/`) MUST NOT use Ionic layout primitives (`IonContent`, `IonTabs`, nested `IonRouterOutlet`).
   - DesktopNavSidebar MUST remain visible by default across desktop routes; only Messages and Profile explicitly opt out.
   - Do not add compensatory `margin-left` or fake column layout hacks to compensate for missing shell elements.
4. **Respect Ionic Page Lifecycle on Mobile:**
   - Ionic views can remain cached in the DOM when navigating between tabs on mobile.
   - Use Ionic lifecycle hooks (`ionViewWillEnter`, `ionViewDidEnter`, `ionViewWillLeave`, `ionViewDidLeave`) appropriately alongside Vue's standard `onMounted` / `onUnmounted`.
5. **Mobile-First Touch & Responsive UX:**
   - Ensure touch targets are at least 44x44px on mobile viewports.
   - Test layout boundaries within `ion-content`, accounting for Android navigation bars and safe area insets.
6. **Loading, Empty, and Error States:**
   - Every data-fetching screen must explicitly render:
     1. Skeleton / loading spinners during initial fetch.
     2. Empty state illustration/copy when no records exist.
     3. User-friendly error message with retry affordance when requests fail.
7. **No Gratuitous Redesigns:**
   - When fixing bugs or wiring up backend logic, preserve existing styling and layout unless a visual redesign was explicitly requested.
