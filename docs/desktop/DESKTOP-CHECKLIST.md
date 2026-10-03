# Retrv Desktop Engineering Checklist

## 1. Before Modifying the Desktop Shell or Routed Views

- [ ] Read [DESKTOP-SHELL.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-SHELL.md).
- [ ] Read [DESKTOP-ROUTES.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-ROUTES.md).
- [ ] Check `git status` and `git diff` to ensure you do not overwrite uncommitted work.
- [ ] Ask: *Can this feature or bug fix be implemented inside a page-local component rather than modifying `DesktopWebShell.vue` or `TabsPage.vue`?*
- [ ] If modifying `DesktopWebShell.vue`, verify that all Boolean props define an explicit default (e.g., `showSidebar: true`).
- [ ] Verify that top-level route views retain `<ion-page>` as their outermost root tag for root `IonRouterOutlet` coordination.

---

## 2. When Creating a New Desktop Page

- [ ] Check if the route is a child of the root `IonRouterOutlet`. If yes, ensure `<ion-page>` wraps the template.
- [ ] Select an approved layout pattern from [DESKTOP-PAGES.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-PAGES.md).
- [ ] Register canonical clean route in `src/router/index.ts` with typed name.
- [ ] Use pure Vue 3 markup (`src/views/desktop/Desktop<Name>Page.vue`) with standard HTML (no `IonContent`).
- [ ] Connect existing shared composables from `src/composables/`.
- [ ] Preserve or implement the `< 1200px` mobile Ionic presentation separately in `src/views/`.

---

## 3. Mandatory Pre-Completion Verification Matrix

Run manual or DOM check across all 4 primary desktop routes (`>= 1200px`):

| Route Path | DesktopHeader | DesktopNavSidebar | ContextRail | Page Rail | Validation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`/` (Home)** | **Visible** | **Visible** (`240px`) | **Visible** (`280px`) | None | [ ] PASS |
| **`/messages`** | **Visible** | *Hidden* | *Hidden* | None | [ ] PASS |
| **`/profile`** | **Visible** | *Hidden* | *Hidden* | **Visible** (320px) | [ ] PASS |
| **`/notifications`** | **Visible** | **Visible** (`240px`) | *Hidden* | None | [ ] PASS |

---

## 4. Routed Page & Transition Smoke Check

- [ ] **Root Outlet Wrappers:** Every top-level routed page has `<ion-page>` at its template root.
- [ ] **Single Navigation per Action:** Verified `PageHeader` handles Back internally without competing parent `@back="router.replace(...)"` handlers.
- [ ] **URL Synchronization:** Navigating from Settings/NotificationSettings back to Home/Profile visibly renders the destination view and updates the URL simultaneously.
- [ ] **Inactive View Hiding:** Previous routed `.ion-page` receives `.ion-page-hidden` class and does not remain visually pinned over new routes.
- [ ] **No `/tabs/` Navigations:** Verified no `router.push("/tabs/...")` or hardcoded `/tabs` links were added.
- [ ] **Single Canonical Sidebar:** Verified only [DesktopNavSidebar.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopNavSidebar.vue) exists.
- [ ] **No Layout Hacks:** Verified no compensatory `margin-left` or fake column CSS hacks were introduced.
- [ ] **Typecheck & Build:** `npx vue-tsc --noEmit` and `npm run build` exit with code 0.

---

## 5. Quick DOM Debugging Guide

### If a Route Change Updates the URL but Old Page Remains Visible:
1. Check if the destination page component has `<ion-page>` at its root.
2. Check if the previous page component has `<ion-page>` at its root so Ionic can attach `.ion-page-hidden`.
3. Check if multiple navigation actions fired concurrently (e.g., duplicate `@back` listeners).

### If DesktopNavSidebar is Missing at Runtime:
1. Run in browser console:
   ```js
   const sidebar = document.querySelector(".desktop-nav-sidebar-root");
   console.log({ exists: !!sidebar, rect: sidebar?.getBoundingClientRect() });
   ```
2. **If `exists === false` (null):**
   - Inspect `showNavSidebar` condition in [DesktopWebShell.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopWebShell.vue).
   - Check if a prop (like `showSidebar`) defaulted to `false`.
3. **If `exists === true` but not visible:**
   - Check `window.getComputedStyle(sidebar).display` (expected: `flex`).
   - Check computed width (expected: `240px`).
