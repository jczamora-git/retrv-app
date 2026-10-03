# Retrv Desktop Engineering Checklist

## 1. Before Modifying the Desktop Shell

- [ ] Read [DESKTOP-SHELL.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-SHELL.md).
- [ ] Read [DESKTOP-ROUTES.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-ROUTES.md).
- [ ] Check `git status` and `git diff` to ensure you do not overwrite uncommitted work.
- [ ] Ask: *Can this feature or bug fix be implemented inside a page-local component rather than modifying `DesktopWebShell.vue` or `TabsPage.vue`?*
- [ ] If modifying `DesktopWebShell.vue`, verify that all Boolean props define an explicit default (e.g., `showSidebar: true`).

---

## 2. When Creating a New Desktop Page

- [ ] Select an approved layout pattern from [DESKTOP-PAGES.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-PAGES.md).
- [ ] Register canonical clean route in `src/router/index.ts` with typed name.
- [ ] Use pure Vue 3 markup (`src/views/desktop/Desktop<Name>Page.vue`) with standard HTML.
- [ ] Ensure **NO** Ionic layout tags (`IonPage`, `IonContent`, `IonTabs`) are used in the desktop view.
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

## 4. Architectural Invariants Sign-Off

- [ ] **No `/tabs/` Navigations:** Verified no `router.push("/tabs/...")` or hardcoded `/tabs` links were added.
- [ ] **Single Canonical Sidebar:** Verified only [DesktopNavSidebar.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopNavSidebar.vue) exists.
- [ ] **No Layout Hacks:** Verified no compensatory `margin-left` or fake column CSS hacks were introduced.
- [ ] **Responsive Integrity:** Mobile viewport (`< 1200px`) still loads `AppDock` and `IonTabs` cleanly.
- [ ] **Typecheck:** `npx vue-tsc --noEmit` exits with code 0.
- [ ] **Build:** `npm run build` exits with code 0.

---

## 5. Quick DOM Debugging Guide

### If DesktopNavSidebar is Missing at Runtime:
1. Run in browser console:
   ```js
   const sidebar = document.querySelector(".desktop-nav-sidebar-root");
   console.log({ exists: !!sidebar, rect: sidebar?.getBoundingClientRect() });
   ```
2. **If `exists === false` (null):**
   - Inspect `showNavSidebar` condition in [DesktopWebShell.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopWebShell.vue).
   - Check if a prop (like `showSidebar`) defaulted to `false`.
   - Check if `route.name` or `route.path` matches `hideDesktopNav` exclusions unexpectedly.
3. **If `exists === true` but not visible:**
   - Check `window.getComputedStyle(sidebar).display` (expected: `flex`).
   - Check computed width (expected: `240px`).
   - Check parent `.desktop-nav-column` positioning (`position: fixed`, `left: 20px`, `top: 64px`, `z-index: 100`).
