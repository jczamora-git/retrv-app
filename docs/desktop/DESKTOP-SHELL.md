# Retrv Desktop Shell Architecture

## 1. Purpose & Separation of Concerns

Retrv employs a dual-presentation architecture unified by shared business logic:

- **Desktop Presentation (`>= 1200px`)**: Pure Vue 3 / standard semantic HTML desktop web shell. Designed for wide displays, high-density workspaces, and natural browser document scrolling without mobile framework encapsulation.
- **Mobile & Tablet Presentation (`< 1200px`)**: Native-styled Ionic Vue framework shell (`IonPage`, `IonTabs`, `IonRouterOutlet`, `AppDock`, touch gestures, pull-to-refresh).

### Shared Foundation
Both presentation layers consume the exact same underlying:
- Composables (`src/composables/` — `useAuth`, `usePosts`, `useConversations`, `useNotifications`, etc.)
- Realtime WebSocket channels & event listeners
- Database schemas & RPC queries (Supabase)
- Domain types & validation (`src/types/`)

---

## 2. Core Desktop Hierarchy

```text
DesktopWebShell (src/components/desktop/DesktopWebShell.vue)
├── DesktopHeader (Sticky Global Navigation & Actions)
└── Desktop Content Area
    ├── DesktopNavSidebar (Fixed Left Primary Nav & Category Filters)
    ├── DesktopVerticalDivider (Structural Separator)
    ├── DesktopMainColumn (Center Routed Page Viewport)
    └── DesktopContextRail (Sticky Right Supporting Intelligence)
```

The shell coordinates global layout, fixed lateral chrome, and route-dependent column visibility while keeping content slots decoupled.

---

## 3. Desktop Breakpoint Invariant

- **Desktop Web Threshold:** `min-width: 1200px`
- **Condition:** Evaluated via `window.matchMedia("(min-width: 1200px)")` in [TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue).
- **Responsive Gateway:** [TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue) conditionally renders `DesktopWebShell` for desktop viewports and the Ionic `ion-tabs` container for mobile/tablet viewports. Both branches must never mount simultaneously.

---

## 4. Shell Component Responsibilities

### DesktopHeader ([src/components/desktop/DesktopHeader.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopHeader.vue))
- **Responsibilities:**
  - Retrv brand wordmark (navigates to Home)
  - Global real-time item search input
  - Primary "Create Report" composer trigger
  - Notification bell with unread badge counter (navigates to `/notifications`)
  - User avatar dropdown / profile shortcut (navigates to `/profile`)
- **Invariant:** Shell-owned. Desktop pages MUST NOT create local duplicates of the top header.

### DesktopNavSidebar ([src/components/desktop/DesktopNavSidebar.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopNavSidebar.vue))
- **Responsibilities:**
  - Primary navigation links: Home (`/`), Messages (`/messages`), Profile (`/profile`), Explore Maps (placeholder)
  - Unread message counter badge
  - Vertical category filter list and filter clearing
- **Invariant:** Exactly ONE canonical `DesktopNavSidebar.vue` exists. Never create `DesktopNavSidebarV2`, `HomeSidebar`, or page-local sidebars.

### DesktopContextRail ([src/components/desktop/DesktopContextRail.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopContextRail.vue))
- **Responsibilities:**
  - Supporting context: Posts Near You, Recovery Tips, Community Merit highlights.
  - Collapses gracefully on compact desktop (`1200px` to `1359.98px`).
- **Invariant:** This is supporting contextual information, NOT navigation. Routes like Profile or Messages may hide it or provide a page-owned domain rail.

---

## 5. CRITICAL — Sidebar Visibility Invariant

> [!CAUTION]
> **Vue Boolean Prop Gotcha & Visibility Rule:**
> In Vue 3, defining a prop like `showSidebar?: boolean` causes Vue's prop-casting mechanism to cast omitted/undefined prop values to `false` unless explicitly given `default: true` in `withDefaults`.
> 
> When `DesktopWebShell.vue` introduced `showSidebar?: boolean` without an explicit `true` default, desktop Home lost its sidebar because `props.showSidebar` silently evaluated to `false`.

### Guard Rules for DesktopNavSidebar Visibility
1. **Visible by Default:** `DesktopNavSidebar` MUST remain visible by default across all desktop routes.
2. **Explicit Opt-Out Only:** Hide the sidebar only for routes that explicitly mandate a full-bleed workspace (Messages) or own their distinct community identity layout (Profile).
3. **No Default-Hidden Meta Logic:** Never write `showNavSidebar = route.meta.desktopNav === true` unless every single route in `router/index.ts` is strictly guaranteed to supply that meta property.
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

## 6. Never Fix Missing Sidebar With Layout Hacks

If the sidebar disappears:
1. **Inspect DOM:** Check if `document.querySelector(".desktop-nav-sidebar-root")` exists in the DOM.
2. **If Null:** Check the shell's mount condition (`v-if="showNavSidebar"`) or route computed logic. Do NOT add CSS margin hacks.
3. **If Present:** Inspect parent grid/flex layout, `display`, `width`, and z-index.

**DO NOT:**
- Add artificial `margin-left` or padding to page components to simulate missing sidebar width.
- Create duplicate sidebars inside page views.
- Use `window.location.reload()` or forced remount keys to mask lifecycle/route issues.

---

## 7. Pure-Vue Desktop Architecture Rule

Desktop page components (`src/views/desktop/`):
- **MUST** use standard Vue 3 / HTML semantic elements (`<div>`, `<section>`, `<main>`, `<aside>`, `<button>`).
- **MUST NOT** use Ionic layout containers (`IonPage`, `IonContent`, `IonTabs`, `IonRouterOutlet`, `IonHeader`, `IonFooter`) on desktop viewports.
- **Rationale:** Ionic's internal page-stack management, fixed-height viewport encapsulation, and transform layers conflict with standard desktop window scrolling, sticky sidebars, and desktop grid layouts.

---

## 8. Desktop Scroll Ownership

- **Document/Window Scroll:** Normal desktop pages (Home, Profile, Notifications) participate in standard window/shell scrolling (`.desktop-web-shell { overflow-y: auto; }`). Lateral chrome elements (`DesktopHeader`, `DesktopNavSidebar`, `DesktopContextRail`) use `position: fixed` or `position: sticky`.
- **Internal Workspace Scroll:** Dense workspaces like Messages (`/messages`) set `.desktop-web-shell.is-messages-route { overflow: hidden; }` and manage internal dual-pane scrolling locally.
- **Rule:** Never add arbitrary nested `overflow-y: auto` wrappers around feed lists.

---

## 9. Protected Architecture Files

Treat the following files as high-impact system core:
- [src/components/desktop/DesktopWebShell.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopWebShell.vue)
- [src/components/desktop/DesktopHeader.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopHeader.vue)
- [src/components/desktop/DesktopNavSidebar.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopNavSidebar.vue)
- [src/components/desktop/DesktopContextRail.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopContextRail.vue)
- [src/views/TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue)
- [src/router/index.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/router/index.ts)
- [src/components/AppDock.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/AppDock.vue)

*Before modifying any of these files, ensure the requirement cannot be fulfilled within a page-local component.*

---

## 10. Lessons Learned (2026 Sidebar Incident)

- **Root Cause:** A batch refactoring combined canonical route cleanups with desktop Notifications modal replacement. The introduction of `showSidebar?: boolean` with Vue 3's false-by-default boolean prop casting caused Home's sidebar to unmount.
- **Mitigation:**
  1. Default shell regions to visible.
  2. Separate route-cleanup tasks from visual feature development.
  3. Validate runtime DOM dimensions (`getBoundingClientRect().width === 240px`) across multiple routes before concluding a task.

### Recovering a Known-Good Shell from Git History
If the shell regresses in future work:
1. Inspect pre-regression commits (historical reference: `48f2330`).
2. Run `git show <commit>:<file>` and compare structure.
3. Selectively restore/merge targeted hunks rather than doing destructive `git reset --hard`.
