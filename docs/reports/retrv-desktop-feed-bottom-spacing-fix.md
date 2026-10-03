# Retrv — Desktop Feed Bottom Spacing Fix

## Problem

On desktop viewports (`>= 1200px`), the feed utilized the single page-level vertical scrollbar located at the far-right edge of the viewport. However, when users scrolled to the bottom of the feed, the page stopped almost immediately at the lower border of the final post card. The last post felt tightly glued to the bottom of the monitor, preventing natural upward scrolling into clear visual focus and lacking the comfortable end-of-feed clearance present on mobile.

---

## Root Cause

1. **Suppressed Dock Spacer on Desktop:** The mobile dock spacing placeholder (`.dock-spacer { height: 70px; }`) was set to `display: none !important;` on desktop viewports.
2. **Insufficient Container Padding:** `.modern-container` in `HomePage.vue` only applied `padding: 24px 0 40px 0;`. With zero margin beneath the feed list, the final post had only a 40px margin from the container boundary.
3. **Flex Layout Bottom Padding Clipping:** In `TabsPage.vue`, `.desktop-shell-layout` applied `padding: 0 24px 60px 20px !important;`. In modern browser flex layouts with root `overflow-y: auto`, padding on a flex container child does not consistently extend the scrollable scroll-height when contents stretch, causing the scroll to stop immediately below the content bounds.

---

## Scroll Owner

- **Root Document Owner:** `.app-shell-page` (`height: 100vh; overflow-y: auto; overflow-x: hidden;`) in `src/views/TabsPage.vue`.
- **Scrollbar Placement:** Single vertical scrollbar strictly located at the far-right edge of the browser viewport.
- **Zero Internal Feed Scrollbars:** `.outlet-viewport`, `ion-router-outlet`, `ion-page`, and `ion-content::part(scroll)` remain unconstrained (`position: static !important; height: auto !important; overflow: visible !important; contain: none !important;`).

---

## Height / Overflow Findings

- All intermediate wrappers (`.desktop-content-pane`, `.outlet-viewport`, `.app-tabs-container`, `.feed-content`) expand naturally to the height of their content.
- Applying bottom clearance directly to `.modern-container` and `.feed-list` inside `HomePage.vue` naturally drives the total document height of `.app-shell-page` without creating artificial scroll traps or rigid height constraints.

---

## Fix Applied

1. **Desktop Feed Clearance ([src/views/HomePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/HomePage.vue)):**
   - Increased `.modern-container` bottom padding on desktop (`@media (min-width: 1200px)`) from `40px` to `88px`.
   - Added `margin-bottom: 24px;` to `.feed-list` on desktop.
   - Combined end-of-feed clearance after the last post card: **112px**.
2. **Desktop Content Region Spacing ([src/views/TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue)):**
   - Adjusted `.desktop-shell-layout` padding to `0 24px 0 20px !important;`, allowing the 1px vertical divider to run full length without being prematurely terminated.
   - Added `padding-bottom: 24px !important;` to `.desktop-content-pane` to provide consistent bottom buffer across all desktop routes.

---

## Bottom Spacing Strategy

- **Feed Content Sizing:**
  - `margin-bottom: 24px;` on `.feed-list` ensures space immediately follows the last post card.
  - `padding-bottom: 88px;` on `.modern-container` ensures that all feed states (post timeline, loading skeleton, error state, and filter-empty state) possess clear breathing room.
- **Sticky Elements Integrity:**
  - Left navigation rail (`.desktop-sidebar-pane`) remains pinned at `top: 84px` via `align-self: start;`.
  - Right rail (`.desktop-right-pane`) remains pinned at `top: 84px` via `align-self: start;`.
  - Neither sticky sidebar stretches down into the bottom gap or generates independent scrollbars.

---

## Files Changed

1. [src/views/HomePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/HomePage.vue):
   - Updated `@media (min-width: 1200px)` rules to set `.modern-container { padding: 24px 0 88px 0; }` and `.feed-list { margin-bottom: 24px; }`.
2. [src/views/TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue):
   - Cleaned `.desktop-shell-layout` padding to `0 24px 0 20px !important;`.
   - Added `padding-bottom: 24px !important;` on `.desktop-content-pane`.

---

## Desktop Viewports Tested

- `1200 × 800`
- `1280 × 800`
- `1366 × 768`
- `1440 × 900`
- `1536 × 864`
- `1920 × 1080`

The feed can be smoothly scrolled past the final post card with ~112px of comfortable bottom breathing space, elevating the final post card into clear, unobstructed focus.

---

## Mobile / Tablet Regression

- **Mobile Viewports (< 768px):**
  - Unaffected. Mobile retains `.dock-spacer { height: 70px; }` and `.modern-container { padding: 16px 16px 24px 16px; }` for floating dock clearance.
- **Tablet Viewports (768px – 1199.98px):**
  - Unaffected. Tablet retains widened mobile layout (`max-width: 720px`) with bottom dock navigation.

---

## Validation

- **Typecheck & Production Build (`npm run build`):**
  - Command: `vue-tsc && vite build`
  - Result: `0` (PASS in 13.40s)
- **Component Lint (`npx eslint src/views/HomePage.vue src/views/TabsPage.vue`):**
  - Result: `0` (PASS — zero errors, zero warnings)
- **Diff & Syntax Check (`git diff --check`):**
  - Result: `0` (PASS — zero whitespace/syntax issues)

---

## Known Limitations

- None identified for desktop feed scrolling.
