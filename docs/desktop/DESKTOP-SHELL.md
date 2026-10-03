# Retrv Desktop Shell Architecture

## 1. Purpose & Separation of Concerns

Retrv employs a dual-presentation architecture unified by shared business logic:

- **Root Routing Infrastructure**: Managed by Ionic's root `<ion-router-outlet>` in [App.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/App.vue). Every top-level routed component participates in Ionic's view-stack coordination via an `<ion-page>` root boundary.
- **Desktop Presentation (`>= 1200px`)**: Pure Vue 3 / standard semantic HTML desktop web shell inside the route's `<ion-page>`. Designed for wide displays, high-density workspaces, and natural browser document scrolling without nested mobile framework encapsulation.
- **Mobile & Tablet Presentation (`< 1200px`)**: Native-styled Ionic Vue framework shell (`IonHeader`, `IonContent`, `IonTabs`, `AppDock`, touch gestures, pull-to-refresh).

### Shared Foundation
Both presentation layers consume the exact same underlying:
- Composables (`src/composables/` — `useAuth`, `usePosts`, `useConversations`, `useNotifications`, etc.)
- Realtime WebSocket channels & event listeners
- Database schemas & RPC queries (Supabase)
- Domain types & validation (`src/types/`)

---

## 2. Core Desktop Hierarchy & Routing Architecture

```text
App.vue
└── IonRouterOutlet
    ├── TabsPage (Canonical Application Gateway: '/', '/messages', '/profile', '/notifications')
    │   └── IonPage (Required Root Route Boundary)
    │       ├── Desktop (>= 1200px): DesktopWebShell
    │       │   ├── DesktopHeader (Sticky Global Navigation & Actions)
    │       │   └── Desktop Content Area
    │       │       ├── DesktopNavSidebar (Fixed Left Primary Nav & Category Filters)
    │       │       ├── DesktopVerticalDivider (Structural Separator)
    │       │       ├── DesktopMainColumn (Center Routed Page Viewport)
    │       │       └── DesktopContextRail (Sticky Right Supporting Intelligence)
    │       └── Mobile (< 1200px): IonTabs + AppDock + Sub-Views
    │
    ├── SettingsPage ('/settings')
    │   └── IonPage
    │
    ├── NotificationSettingsPage ('/settings/notifications')
    │   └── IonPage
    │
    ├── SecuritySettingsPage ('/settings/security')
    │   └── IonPage
    │
    ├── HelpCenterPage ('/settings/help')
    │   └── IonPage
    │
    └── PublicProfilePage ('/profile/:userId')
        └── IonPage
            ├── Desktop (>= 1200px): DesktopWebShell -> DesktopProfilePage
            └── Mobile (< 1200px): PageHeader + IonContent
```

---

## 3. CRITICAL — Ionic Route Wrapper Invariant

> [!CRITICAL]
> **IonPage is Required at the Root Outlet Boundary:**
> Any top-level route component rendered by the root Ionic `<ion-router-outlet>` in `App.vue` **MUST** maintain a valid `<ion-page>` root wrapper.
>
> This remains true even when `isDesktop (>= 1200px)` renders `DesktopWebShell`.
>
> **DO NOT** replace the top-level routed root with `<div>`, `<main>`, or `<DesktopWebShell>` directly.

### Why IonPage is Architecturally Mandatory:
Ionic Vue uses `IonPage` DOM nodes to manage its internal view-stack lifecycle, including:
1. **Active Page Tracking:** Ensuring only the active route is visible and focused.
2. **Hidden Page Class (`.ion-page-hidden`):** Automatically hiding previous routes when navigating to a new route.
3. **Z-Index & Stacking:** Managing transition layers during route transitions.
4. **Lifecycle Hooks:** Driving `ionViewWillEnter`, `ionViewDidEnter`, `ionViewWillLeave`, and `ionViewDidLeave`.

**Failure Consequence:** If `IonPage` is removed from a top-level route component, navigating to standalone routes (e.g., `/settings`, `/settings/notifications`) and returning Home can cause the previous Ionic page to remain visibly active on top of the Home view, even though Vue Router's URL successfully changed.

### Do Not "Clean Up" IonPage:
Agents seeing `<ion-page>` wrapping `<DesktopWebShell>` might assume it is redundant. **It is NOT redundant.** It is essential routing infrastructure for Ionic's view controller.

---

## 4. What "Pure Vue Desktop" Means

To prevent confusion between routing infrastructure and presentation layout:

### ALLOWED & REQUIRED:
- `<ion-page>` at the top-level routed boundary to satisfy root `IonRouterOutlet` lifecycle coordination.
- `<DesktopWebShell>` inside the desktop responsive branch (`v-if="isDesktop"`).
- Standard Vue 3 / HTML semantic markup (`<div>`, `<section>`, `<main>`, `<aside>`, `<button>`) for all desktop view content.

### AVOID Inside Desktop Presentation Content:
- `<ion-content>`
- Nested `<ion-router-outlet>`
- `<ion-tabs>`
- `<ion-header>` / `<ion-footer>`
- Ionic touch/scroll containers

*The `IonPage` wrapper is routing infrastructure; desktop layout presentation remains pure Vue.*

---

## 5. Known Failure Mode — URL Changes But Old Page Remains Visible

### Symptoms:
- The browser URL updates to the destination route (e.g., `/` or `/profile`).
- The previous route (e.g., `/settings` or `/settings/notifications`) remains visibly rendered on screen.
- Navigation appears "stuck" or frozen despite correct router history.

### Diagnostic Flow:
1. **Check Outlet Parentage:** Does this route component render under Ionic's root `<ion-router-outlet>`?
2. **Check Root Element:** Does the routed component have `<ion-page>` as its outermost template root?
3. **Inspect DOM:** Check if the old page's `.ion-page` element received the `.ion-page-hidden` class or `aria-hidden="true"`.
4. **Check Navigation Operations:** Did a single button click trigger multiple competing navigation calls (e.g., `PageHeader` calling `router.back()` while a parent `@back` handler called `router.replace()`)?

### Anti-Pattern Rule:
**DO NOT** solve stale page regressions with:
- Arbitrary CSS `display: none` / `z-index: 99999` hacks.
- `window.location.reload()` or full-page forced reloads.
- Artificial component remount keys (`:key="$route.fullPath"` on root containers).

---

## 6. PageHeader Navigation & Back Ownership

### Single Navigation Action Rule:
A single user interaction MUST produce exactly ONE router navigation.

In [src/components/PageHeader.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/PageHeader.vue):
- `PageHeader` handles its own back navigation internally:
  ```ts
  const handleBack = () => {
    emit('back');
    if (window.history.state?.back) {
      router.back();
    } else if (props.defaultBackUrl) {
      router.push(props.defaultBackUrl);
    } else {
      router.push({ name: 'Home' });
    }
  };
  ```
- **Invariant:** Parent pages MUST NOT attach `@back="router.replace(...)"` or secondary navigation calls if `PageHeader` is already navigating. Doing so triggers race conditions in Ionic's view controller.

---

## 7. Desktop Breakpoint & Responsive Gateway

- **Desktop Threshold:** `min-width: 1200px` (evaluated via `window.matchMedia("(min-width: 1200px)")`).
- **Responsive Gateway:** [TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue) and [PublicProfilePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/PublicProfilePage.vue) act as responsive gateways inside their `<ion-page>` roots, rendering `DesktopWebShell` for desktop viewports and the Ionic presentation for mobile/tablet viewports. Both branches must never mount simultaneously.

---

## 8. Shell Component Responsibilities

### DesktopHeader ([src/components/desktop/DesktopHeader.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopHeader.vue))
- **Responsibilities:** Brand wordmark, global item search, "Create Report" composer button, notification bell (unread badge), user profile avatar.
- **Invariant:** Shell-owned. Desktop pages MUST NOT create local duplicates of the top header.

### DesktopNavSidebar ([src/components/desktop/DesktopNavSidebar.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopNavSidebar.vue))
- **Responsibilities:** Primary navigation links (Home, Messages, Profile, Explore Maps placeholder), unread message count badge, vertical category filter list.
- **Invariant:** Exactly ONE canonical `DesktopNavSidebar.vue` exists. Never create `DesktopNavSidebarV2` or page-local duplicates.

### DesktopContextRail ([src/components/desktop/DesktopContextRail.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopContextRail.vue))
- **Responsibilities:** Supporting context (Posts Near You, Recovery Tips). Collapses on compact desktop (`1200px` to `1359.98px`).
- **Invariant:** Supporting contextual information, NOT navigation. Routes like Profile or Messages hide it or provide a page-owned domain rail.

---

## 9. CRITICAL — Sidebar Visibility Invariant

> [!CAUTION]
> **Vue Boolean Prop Gotcha:**
> In Vue 3, defining a prop like `showSidebar?: boolean` causes Vue's prop-casting mechanism to cast omitted/undefined prop values to `false` unless explicitly given `default: true` in `withDefaults`.

### Guard Rules for DesktopNavSidebar Visibility
1. **Visible by Default:** `DesktopNavSidebar` MUST remain visible by default across all desktop routes.
2. **Explicit Opt-Out Only:** Hide the sidebar only for routes that explicitly mandate a full-bleed workspace (Messages) or own their distinct community identity layout (Profile).
3. **No Default-Hidden Meta Logic:** Never write `showNavSidebar = route.meta.desktopNav === true` unless every single route in `router/index.ts` is strictly guaranteed to supply that metadata.
4. **Current Invariant Implementation:**
   ```ts
   const hideDesktopNav = computed(() => {
     return isMessagesRoute.value || isProfileRoute.value;
   });
   const showNavSidebar = computed(() => {
     if (!props.showSidebar) return false;
     return !hideDesktopNav.value;
   });
   ```

---

## 10. Desktop Scroll Ownership

- **Document/Window Scroll:** Normal desktop pages (Home, Profile, Notifications) participate in standard window/shell scrolling (`.desktop-web-shell { overflow-y: auto; }`). Lateral chrome elements (`DesktopHeader`, `DesktopNavSidebar`, `DesktopContextRail`) use `position: fixed` or `position: sticky`.
- **Internal Workspace Scroll:** Dense workspaces like Messages (`/messages`) set `.desktop-web-shell.is-messages-route { overflow: hidden; }` and manage internal dual-pane scrolling locally.
- **Rule:** Never add arbitrary nested `overflow-y: auto` wrappers around feed lists.

---

## 11. Protected Architecture Files

Treat the following files as high-impact system core:
- [src/App.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/App.vue)
- [src/components/desktop/DesktopWebShell.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopWebShell.vue)
- [src/components/desktop/DesktopHeader.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopHeader.vue)
- [src/components/desktop/DesktopNavSidebar.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopNavSidebar.vue)
- [src/components/desktop/DesktopContextRail.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopContextRail.vue)
- [src/views/TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue)
- [src/router/index.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/router/index.ts)
- [src/components/PageHeader.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/PageHeader.vue)
- [src/components/AppDock.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/AppDock.vue)

---

## 12. Lessons Learned (2026 Settings & Sidebar Regressions)

1. **Sidebar Regression:** Caused by `showSidebar?: boolean` defaulting to `false` in Vue 3 prop casting. Resolved by adding `showSidebar: true` default in `withDefaults` and defaulting sidebar visibility to `true`.
2. **Settings Navigation Stale-Page Regression:** Caused by removing `<ion-page>` from top-level routes and duplicate `@back` navigation handlers. Resolved by restoring `<ion-page>` on top-level routed views and standardizing single-operation Back behavior in `PageHeader`.
