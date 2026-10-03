# Retrv — Desktop Full-Bleed Layout & Scroll Architecture Refinement

## Problem

In the initial desktop implementation (`>= 1200px`), vertical scrolling was owned by the center column container (`HomePage.vue`'s `<ion-content>` inside `.outlet-viewport`). This produced an internal vertical scrollbar located right between the feed and the right rail, making the center feed appear as an embedded panel rather than a native desktop social feed. Furthermore, the application container had narrow outer margins rather than a full-bleed viewport presentation.

---

## Previous Scroll Architecture

- **Root Shell Container**: `.desktop-main-wrapper` in `TabsPage.vue` had a fixed height `height: calc(100vh - 64px)` with `overflow: hidden`.
- **Feed Column Container**: `.outlet-viewport` was constrained to `height: 100%` and `max-width: 660px`.
- **Scroll Container**: `HomePage.vue`'s `<ion-content class="feed-content">` operated with `--overflow: hidden auto`, trapping vertical scrolling inside the center column.
- **Scrollbar Location**: Rendered inside the center column at ~660px from the left, directly adjacent to the post cards.
- **Sidebars**: `DesktopSidebar` and `DesktopRightRail` were set to `overflow-y: auto`, creating competing independent scroll containers.

---

## New Scroll Architecture

- **Single Scroll Owner**: The entire desktop page (`.app-shell-page` in `TabsPage.vue`) spans `width: 100%` and `height: 100vh` with `overflow-y: auto` and `overflow-x: hidden`.
- **Scrollbar Location**: Located strictly at the **far-right edge** of the browser viewport (pixel 1920 on a 1080p display).
- **Feed Column**: `.outlet-viewport` is now unconstrained in height (`height: auto`, `overflow: visible`, `min-height: 100%`). The feed's post cards flow downwards naturally and dictate the total scrollable page height.
- **No Feed Scrollbar**: `HomePage.vue`'s `<ion-content>` has `--overflow: visible !important` and `contain: none !important` on desktop, eliminating any internal scrollbar.
- **Full-Bleed Presentation**: The desktop header background and the desktop body span `100vw` / `100%` full width. The feed itself remains centered and readable.

---

## Desktop Grid

A centered CSS Grid layout with controlled columns and gutters:

```css
.desktop-main-wrapper {
  width: 100%;
  display: grid;
  justify-content: center;
  align-items: start;
  gap: 32px;
  padding: 0 24px 60px 24px;
  box-sizing: border-box;
  min-height: calc(100vh - 64px);
}

/* Compact Desktop (1200px to 1359.98px) - 2 Columns */
@media (min-width: 1200px) and (max-width: 1359.98px) {
  .desktop-main-wrapper {
    grid-template-columns: minmax(210px, 240px) minmax(580px, 680px) !important;
  }
  .desktop-only-rail {
    display: none !important;
  }
}

/* Full Desktop (>= 1360px) - 3 Columns */
@media (min-width: 1360px) {
  .desktop-main-wrapper {
    grid-template-columns: minmax(210px, 240px) minmax(580px, 680px) minmax(250px, 300px) !important;
  }
}
```

---

## Sticky Elements

1. **Desktop Header**:
   - `position: sticky; top: 0; z-index: 120; width: 100%;`
   - Spans full width and remains fixed at the top while the user scrolls down the feed.
2. **Left Navigation Sidebar**:
   - `position: sticky; top: 84px; align-self: start;`
   - Sits 20px below the 64px header and remains stationary in the viewport as the feed scrolls.
3. **Right Supporting Rail**:
   - `position: sticky; top: 84px; align-self: start;`
   - Sits 20px below the 64px header and remains stationary in the viewport as the feed scrolls.

Because `.desktop-main-wrapper` uses `align-items: start;`, the sidebar and rail do not stretch to the height of the center column, allowing `position: sticky` to track cleanly over the entire scroll height of the page.

---

## Ionic Scroll Handling

On desktop (`@media (min-width: 1200px)`):
- `.outlet-viewport ion-router-outlet` and `.outlet-viewport ion-page`: Set to `position: static !important; height: auto !important; min-height: 100% !important; overflow: visible !important; contain: none !important;`.
- `.outlet-viewport ion-content`: Set to `--overflow: visible !important; overflow: visible !important; height: auto !important; contain: none !important; position: static !important;`.
- `.outlet-viewport ion-content::part(scroll)`: Set to `position: static !important; height: auto !important; overflow: visible !important; contain: none !important;`.
- `#background-content`: `display: none !important;`.
- `ion-refresher`: Suppressed on desktop (`display: none !important;`) as pull-to-refresh gestures are mobile-only.

On mobile and tablet (`< 1200px`):
- All Ionic native scroll behaviors remain completely untouched.
- `<ion-content>` retains `--overflow: hidden auto;`, momentum scrolling, and touch pull-to-refresh.

---

## Files Changed

- [TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue): Converted `.desktop-main-wrapper` to full-bleed CSS Grid; moved scroll ownership to `.app-shell-page`; set sidebar and rail to `position: sticky; top: 84px; align-self: start`.
- [variables.css](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/theme/variables.css): Configured desktop override rules for `outlet-viewport`, `ion-page`, and `ion-content` (`--overflow: visible; contain: none; height: auto; position: static`).
- [HomePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/HomePage.vue): Updated feed container for natural height expansion, removed center padding conflicts, and ensured zero internal scrollbar.

---

## Mobile/Tablet Regression

- **Mobile (`360px`, `390px`, `412px`)**: Mobile header, search bar, filter button, floating dock (`AppDock.vue`), and internal `<ion-content>` pull-to-refresh remain 100% operational.
- **Tablet (`768px`, `820px`, `1024px`)**: Retains the mobile-first application shell with bottom navigation dock and widened 720px max content width. Desktop sidebars and sticky layout are completely inactive.

---

## Viewports Tested

- **1200 × 800**: 2-column layout (Sidebar + Feed, Rail collapsed), 1 far-right scrollbar, sticky header, sticky sidebar.
- **1280 × 800**: 2-column layout (Sidebar + Feed, Rail collapsed), 1 far-right scrollbar.
- **1366 × 768**: 3-column layout (Sidebar + Feed + Rail), 1 far-right scrollbar.
- **1440 × 900**: 3-column layout (Sidebar + Feed + Rail), 1 far-right scrollbar, sticky header, sticky rails.
- **1536 × 864**: 3-column layout, centered feed, sticky rails.
- **1920 × 1080**: Full 3-column layout, 1 far-right scrollbar, zero center-column scrollbar.

---

## Validation

- **Typecheck**: `vue-tsc` completed with 0 errors.
- **Build**: `npm run build` (`vue-tsc && vite build`) passed with exit code 0.
- **Git Diff**: `git diff --check` passed with 0 whitespace or syntax errors.
- **Scroll Ownership**: Confirmed single scrollbar on far-right edge of browser viewport.
- **Internal Scrollbar**: Eliminated (`overflow: visible` on center feed).

---

## Known Limitations

- Desktop messaging retains the mobile conversation list view until the master-detail split messaging phase.
- Nearby discovery and Explore Maps remain UI placeholders.
