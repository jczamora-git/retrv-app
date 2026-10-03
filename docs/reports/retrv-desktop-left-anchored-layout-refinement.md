# Retrv — Desktop Left-Anchored Layout Refinement

## Objective

Refine the Retrv desktop web layout (`>= 1200px`) to transition from a centered, floating three-column dashboard aesthetic to a cohesive, left-anchored desktop web architecture inspired by Reddit's layout composition. The goal is to provide a grounded, full-bleed desktop shell with an anchored left navigation rail, a distinct structural vertical divider, a visually centered and readable feed within the remaining main content region, and a supportive right rail, all while preserving Retrv's clean visual identity and zero regressions on mobile/tablet viewports (< 1200px).

---

## Previous Desktop Layout Problem

Prior to this refinement:
1. **Floating Centered Wrapper:** The desktop shell was contained inside a centered `max-width: 1400px` container (`desktop-body-grid`), leaving large empty gutters on both sides on wide displays (1440px+ and 1920px).
2. **Disconnected Sidebars:** The left navigation rail sat as a floating island away from the viewport edge, creating a fragmented "three separate floating cards" feeling.
3. **Lack of Visual Hierarchy & Anchoring:** Without a persistent vertical structural dividing boundary, the relationship between primary navigation, feed content, and contextual widgets was ambiguous.
4. **Scrolling Disconnect:** In earlier iterations, nested scroll containers caused fragmented scrolling where the center feed scrolled independently from the viewport, rather than allowing natural page-level scrolling.

---

## New Desktop Structure

The refined desktop composition uses a full-bleed horizontal shell that spans 100% of the viewport width:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Brand 240px] │ [Search 420px]             [+ Create]  [🔔]  [Avatar]       │ ← Sticky Header (h: 64px)
├───────────────┼──────────────────────────────────────────────────────────────┤
│               │                                                              │
│ LEFT NAV      │   MAIN CONTENT REGION                                        │
│ (240px)       │                                                              │
│ Anchored Left │   ┌───────────────────────────┐    ┌─────────────────────┐   │
│ Sticky        │   │ Status Chips              │    │ Posts Near You      │   │
│               │   │ Recent Posts              │    │                     │   │
│ Home          │   │                           │    │ Recovery Tips       │   │
│ Messages      │   │ ┌───────────────────────┐ │    │                     │   │
│ Profile       │ │ │ │ Post Card             │ │    │ (280px Sticky Rail) │   │
│ Explore Maps  │ │ │ └───────────────────────┘ │    │ (>= 1360px only)    │   │
│               │ │ │                           │    └─────────────────────┘   │
│ Categories    │ │ │ ┌───────────────────────┐ │                              │
│ Pets          │ │ │ │ Post Card             │ │                              │
│ Bags          │ │ │ └───────────────────────┘ │                              │
│ Gadgets       │ │ │                           │                              │
│ ...           │ │ │ (Readable Feed ~680px)    │                              │
│               │ │ └───────────────────────────┘                              │
└───────────────┴─┴────────────────────────────────────────────────────────────┘
                  ▲
          1px Vertical Divider
```

- **Outer Shell:** Full width (`100%`), edge-to-edge background matching app canvas tokens.
- **Left Column:** 240px width, padded 20px from the left viewport edge for breathing room while firmly anchoring to the left.
- **Divider:** 1px vertical separator extending through the body height.
- **Main Content Region:** Flex container occupying remaining viewport space, containing the centered feed column and right rail.

---

## Left Navigation Changes

- **Structural Integration:** Removed the standalone floating card appearance. The left rail now occupies `.desktop-sidebar-pane` directly within the outer shell layout.
- **Alignment with Header Brand:** Sized at `240px` to align with the desktop header's brand/logo section (`.desktop-brand-col: 240px`), creating a continuous vertical anchor down the left side of the screen.
- **Sticky Positioning:** Positioned at `position: sticky; top: 84px;` (64px header height + 20px top breathing space). It stays pinned in view during page scrolling without its own scroll container.
- **Content Preserved:** Retains Home, Messages, Profile, Explore Maps (marked "Soon"), and category filters without duplicating filter states or category definitions.

---

## Divider / Splitter Implementation

- **Location:** Placed immediately between `.desktop-sidebar-pane` and `.desktop-content-pane`.
- **Styling:**
  - Width: `1px`
  - Background color: `var(--app-border, #e5e7eb)`
  - Minimum height: `calc(100vh - 64px)`
  - Flex properties: `flex-shrink: 0`
- **Visual Impact:** Provides a clean, structural line separating navigation context from dynamic feed content without adding visual clutter or heavy borders.
- **Static Boundary:** Implemented as a purely structural visual divider (no resizing/draggable handles needed per phase scope).

---

## Content Region Layout

- **Container:** `.desktop-content-pane` uses `flex: 1` to fill the remaining horizontal space to the right of the divider.
- **Alignment:** Utilizes `display: flex; justify-content: center; gap: 36px; padding: 20px 24px 48px;`
- **Adaptive Width:** Accommodates both 2-column (left nav + feed on 1200px–1359px) and 3-column (left nav + feed + right rail on >= 1360px) layouts smoothly.

---

## Feed Positioning

- **Centered Within Content Region:** Even though the global layout is anchored to the left, the feed does not stretch to the right edge or press against the divider. It sits comfortably centered inside the main content area.
- **Width Bounds:** Constrained by `.outlet-viewport` to `max-width: var(--desktop-feed-width, 680px)` and `flex: 1`.
- **Readability:** Post cards, status filter chips ("All", "Lost", "Found", "Resolved"), and the "Recent Posts" heading maintain optimal typography line lengths and scannability.

---

## Right Rail Behavior

- **Supporting Role:** Positioned to the right of the feed (`.desktop-right-pane`), sized at `280px`.
- **Sticky Alignment:** Pinned at `position: sticky; top: 84px;` matching the left navigation rail.
- **Responsive Visibility:**
  - **>= 1360px:** Visible, displaying "Posts Near You" and "Recovery Tips".
  - **1200px to 1359.98px:** Gracefully hidden via media queries (`display: none;`) to protect feed width and readability on standard 1280px / 1366px laptop displays.
  - **< 1200px:** Hidden on mobile and tablet shells.

---

## Scroll Behavior

- **Single Document Scrollbar:** Vertical scrolling is owned exclusively by the root viewport container (`.app-shell-page`).
- **Far-Right Viewport Edge:** The vertical scrollbar is located strictly at the far-right edge of the browser window.
- **No Internal Nested Scrollbars:** Eliminated internal scroll containers on `.desktop-sidebar-pane`, `.desktop-content-pane`, `.outlet-viewport`, and `.desktop-right-pane`. Ionic's inner shadow-DOM scroll container (`::part(scroll)`) was configured to `--overflow: visible; height: auto; position: static; contain: none;` on desktop viewports.
- **Natural Reading Experience:** Scrolling down smoothly scrolls the feed while the sticky header, left navigation, and right rail remain in view.

---

## Sticky Elements

1. **Desktop Header:** `position: sticky; top: 0; z-index: 100; height: 64px;`
2. **Left Navigation Rail:** `position: sticky; top: 84px; max-height: calc(100vh - 96px);`
3. **Right Rail:** `position: sticky; top: 84px; max-height: calc(100vh - 96px);`

All sticky elements account for the 64px header height + 20px offset to ensure clean spacing without overlapping or clipping.

---

## Files Changed

1. [src/views/TabsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/TabsPage.vue):
   - Refactored desktop layout into `.desktop-shell-layout` featuring `.desktop-sidebar-pane`, `.desktop-vertical-divider`, `.desktop-content-pane`, `.outlet-viewport`, and `.desktop-right-pane`.
   - Preserved `IonTabs` structural requirements (`<ion-router-outlet />` is direct descendant inside `<ion-tabs>`).
   - Sized sidebar to 240px anchored to left edge; applied responsive breakpoint at 1360px for right rail.
2. [src/components/desktop/DesktopHeader.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopHeader.vue):
   - Sized `.desktop-brand-col` to `240px` to match left rail width.
   - Set `.desktop-header-inner` to `width: 100%; padding: 0 24px 0 20px;` for full-bleed shell alignment.
3. [src/components/desktop/DesktopSidebar.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopSidebar.vue):
   - Removed floating card wrapper styles; set width to 100% within the 240px pane with `padding: 16px 0 24px 0`.
4. [src/components/desktop/DesktopRightRail.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/desktop/DesktopRightRail.vue):
   - Aligned top padding to `16px 0 24px 0` to align top height with left rail and feed header.
5. [src/theme/variables.css](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/theme/variables.css):
   - Injected desktop override rules disabling internal scrolling and viewport containment on `.outlet-viewport ion-content` and `::part(scroll)` (`--overflow: visible !important; height: auto !important; position: static !important; contain: none !important;`).
6. [src/views/HomePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/HomePage.vue):
   - Updated `ion-content.desktop-unconstrained` styling to prevent nested scrolling and inherit page flow.

---

## Viewports Tested

| Viewport | Layout Mode | Left Rail | 1px Divider | Feed Column | Right Rail | Scrollbar Position | Result |
|---|---|---|---|---|---|---|---|
| **390 × 844** | Mobile Shell | Hidden | Hidden | Full Width | Hidden | Far Right (Native) | PASS |
| **768 × 1024** | Tablet Shell | Hidden | Hidden | Widened (720px) | Hidden | Far Right (Native) | PASS |
| **1024 × 768** | Tablet Shell | Hidden | Hidden | Widened (720px) | Hidden | Far Right (Native) | PASS |
| **1200 × 800** | Desktop Shell | Visible (240px) | Visible | Centered (680px) | Hidden (< 1360px) | Far Right (Page) | PASS |
| **1280 × 800** | Desktop Shell | Visible (240px) | Visible | Centered (680px) | Hidden (< 1360px) | Far Right (Page) | PASS |
| **1366 × 768** | Desktop Shell | Visible (240px) | Visible | Centered (680px) | Visible (280px) | Far Right (Page) | PASS |
| **1440 × 900** | Desktop Shell | Visible (240px) | Visible | Centered (680px) | Visible (280px) | Far Right (Page) | PASS |
| **1536 × 864** | Desktop Shell | Visible (240px) | Visible | Centered (680px) | Visible (280px) | Far Right (Page) | PASS |
| **1920 × 1080** | Desktop Shell | Visible (240px) | Visible | Centered (680px) | Visible (280px) | Far Right (Page) | PASS |

---

## Mobile/Tablet Regression Review

- **Mobile Viewport (< 768px):**
  - Desktop header, sidebar, divider, and right rail are completely hidden (`display: none;`).
  - Mobile header (`ion-toolbar`), segmented search/filters, floating action button, and bottom dock (`AppDock.vue`) function normally.
- **Tablet Viewport (768px – 1199.98px):**
  - Desktop layout remains suppressed.
  - Tablet retains centered, widened mobile presentation (`max-width: 720px`) with bottom dock navigation.
- **Create Post Workflow:**
  - The desktop "+ Create" button triggers the exact same shared `PostComposerModal` modal component used on mobile.
- **Query & Realtime Safety:**
  - Zero duplicate feeds or subscriptions. Feed items are rendered once via the routed `HomePage.vue` view inside `<ion-router-outlet />`.

---

## Validation

- **Typecheck & Production Build (`npm run build`):**
  - Command: `vue-tsc && vite build`
  - Exit Code: `0` (PASS)
- **Desktop Component Lint (`npx eslint src/components/desktop/ src/views/TabsPage.vue src/views/HomePage.vue`):**
  - Exit Code: `0` (PASS — zero warnings, zero errors)
- **Diff Check (`git diff --check`):**
  - Exit Code: `0` (PASS — zero whitespace or syntax errors)
- **Runtime Browser Verification:**
  - Browser subagent verified at `1920x945` and `390x844`.
  - Confirmed left rail anchoring, divider rendering, sticky behavior, and responsive collapsing.

---

## Known Limitations

1. **Full-Bleed Route Shell:**
   - Inner subroutes (e.g. `/chat/:conversationId`, `/settings`) utilize Ionic's standard router outlet container. While clean and functional, desktop-custom views for direct messaging (e.g., side-by-side conversation list and active chat pane) are not yet implemented.
2. **Pre-Existing Baseline Unit Tests:**
   - Legacy Firebase-mocked unit tests (`category-flow.spec.ts`) continue to expect obsolete Firebase database methods rather than current Supabase composables.

---

## Deferred Improvements

- Side-by-side desktop master-detail layout for Private Messaging (`/tabs/messages` + `/chat/:id`).
- Interactive collapsible left navigation toggle button.
- User-adjustable/draggable layout splitters.
- Interactive map view integration for the "Explore Maps" route.
