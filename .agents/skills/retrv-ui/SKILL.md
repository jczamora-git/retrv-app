---
name: retrv-ui
description: Governs Ionic Vue presentation, view/component architecture, design consistency, Ionic lifecycle hooks, and mobile UX patterns in Retrv.
---

# Retrv UI Skill

> **Target:** Ionic Vue views, shared components, mobile layout patterns, theming, and user interaction states.

---

## 1. UI Presentation Architecture

- **UI Framework:** Ionic Vue 9 (`@ionic/vue: ^9.0.0`, `@ionic/vue-router: ^9.0.0`) + Vue 3 (`vue: ^3.5.0`).
- **Icons:** Ionicons (`ionicons: ^8.1.0`) & Lucide Vue Next (`lucide-vue-next: ^1.0.0`).
- **Theming:** CSS variables in `src/theme/variables.css` and system dark/light mode detection in `src/composables/useTheme.ts`.
- **View Hierarchy:**
  - `src/views/` (19 top-level screen views, including `HomePage.vue`, `PostDetailsPage.vue`, `ChatPage.vue`, `MessagesPage.vue`, `ProfilePage.vue`).
  - `src/components/` (30 reusable UI widgets, modals, cards, and input composers).

---

## 2. Inviolable UI Presentation Rules

1. **UI Is Not Security:**
   - Never place authorization checks solely in UI templates (`v-if="user.id === authorId"`). UI controls only affordances; backends and RLS must enforce permissions.
2. **Reuse Existing Components & Composables:**
   - Do not duplicate data fetching or mutation logic across page views. Consume authoritative composables from `src/composables/`.
3. **Respect Ionic Page Lifecycle:**
   - Ionic views can remain cached in the DOM when navigating between tabs.
   - Use Ionic lifecycle hooks (`ionViewWillEnter`, `ionViewDidEnter`, `ionViewWillLeave`, `ionViewDidLeave`) appropriately alongside Vue's standard `onMounted` / `onUnmounted`.
4. **Mobile-First Touch & Responsive UX:**
   - Ensure touch targets are at least 44x44px.
   - Test layout boundaries within `ion-content`, accounting for Android navigation bars and safe area insets.
5. **Loading, Empty, and Error States:**
   - Every data-fetching screen must explicitly render:
     1. Skeleton / loading spinners during initial fetch.
     2. Empty state illustration/copy when no records exist.
     3. User-friendly error message with retry affordance when requests fail.
6. **No Gratuitous Redesigns:**
   - When fixing bugs or wiring up backend logic, preserve existing styling and layout unless a visual redesign was explicitly requested.
