# Retrv — Desktop Shell Implementation

## Objective

Establish a dedicated desktop web composition (`>= 1200px`) for the Retrv application while strictly maintaining and protecting the baseline mobile-first application shell for mobile and tablet devices (`< 1200px`). The goal is not to replace the existing mobile UI, but to provide a responsive, community-oriented 3-column desktop experience without duplicating application state, routing, database subscriptions, or business logic.

---

## Responsive Strategy

Retrv enforces two distinct layout modes driven purely by CSS media queries without device or user-agent sniffing:

1. **Mode A — Mobile & Tablet (`< 1200px`)**:
   - Preserves the mobile-first shell.
   - Fixed top header per view with brand wordmark, notifications bell, search, and filter triggers.
   - Floating bottom dock (`AppDock.vue`) providing main navigation (Home, Create, Messages, Profile).
   - Desktop sidebar, desktop header, and desktop right rail are strictly suppressed (`display: none !important`).
   - Tablet viewports (768px, 820px, 1024px) use the exact same mobile shell with widened container constraints (`--max-content-width: 720px`) for comfortable reading without excessive stretching. Bottom navigation and mobile header remain fully active on tablet.
2. **Mode B — Dedicated Desktop (`>= 1200px`)**:
   - Activates a centered 3-column composition (`max-width: 1380px`):
     - **Left Navigation Rail / Sidebar** (~230px): Primary route navigation and category filters.
     - **Center Content Area** (~660px): Feed and routed views hosted within `ion-tabs` / `ion-router-outlet`.
     - **Right Supporting Rail** (~280px): "Posts Near You" placeholder card and recovery guidance.
   - Sticky top bar (`DesktopHeader.vue`): Brand wordmark, dedicated search field, "+ Create Report" action, notifications bell with unread badge, and profile avatar link.
   - Mobile floating dock (`AppDock.vue`) is suppressed (`display: none !important`).
   - Narrow desktop (`1200px` – `1359.98px`): The right rail collapses cleanly (`display: none !important`), giving the center feed and left navigation comfortable breathing room. Full 3-column layout engages at `>= 1360px`.

---

## Breakpoints

| Breakpoint Range | Shell Mode | Layout Composition | Navigation Mechanism | Content Max Width |
|---|---|---|---|---|
| `< 768px` (Mobile) | Mobile Shell | 1 Column (Full width minus 16px gutters) | Mobile floating dock (`AppDock.vue`) | `600px` (or 100%) |
| `768px` – `1199.98px` (Tablet) | Mobile/Tablet Shell | 1 Column (Wider centered card) | Mobile floating dock (`AppDock.vue`) | `720px` |
| `1200px` – `1359.98px` (Compact Desktop) | Desktop Shell | 2 Columns: Left Sidebar + Center Feed | Desktop Top Header + Left Sidebar | `1380px` outer, `660px` center |
| `>= 1360px` (Full Desktop) | Desktop Shell | 3 Columns: Left Sidebar + Center Feed + Right Rail | Desktop Top Header + Left Sidebar | `1380px` outer, `660px` center |

---

## Desktop Architecture

The desktop shell is architected inside `src/views/TabsPage.vue` to wrap routed content seamlessly:

```text
TabsPage.vue
  ├── DesktopHeader (>= 1200px, sticky top)
  │     ├── Brand Wordmark (home link)
  │     ├── Global Search Input (synced to useFeedFilter)
  │     ├── + Create Report Button (opens shared PostComposerModal)
  │     ├── Notifications Bell (opens shared NotificationsModal)
  │     └── Profile Avatar (profile link)
  │
  ├── desktop-main-wrapper (max-width: 1380px, centered)
  │     ├── DesktopSidebar (>= 1200px, sticky left ~230px)
  │     │     ├── Navigation (Home, Messages, Profile, Explore Maps)
  │     │     └── Category Filters (reusing MAIN_CATEGORIES)
  │     │
  │     ├── outlet-viewport (Center ~660px)
  │     │     └── ion-tabs (hosts IonRouterOutlet directly)
  │     │           ├── ion-router-outlet (renders HomePage, MessagesPage, ProfilePage)
  │     │           └── AppDock (< 1200px, hidden on desktop)
  │     │
  │     └── DesktopRightRail (>= 1360px, sticky right ~280px)
  │           ├── Posts Near You (honest placeholder)
  │           └── Community Recovery Tips
  │
  ├── PostComposerModal (Single shared instance for mobile dock & desktop header)
  └── NotificationsModal (Single shared instance for mobile & desktop triggers)
```

Direct child hierarchy of `IonTabs`: `<ion-router-outlet />` and `<AppDock />` remain direct descendants within `<ion-tabs>`, preventing Ionic runtime routing errors while allowing desktop sidebars to frame the active tab.

---

## Components Added

1. **`src/components/desktop/DesktopHeader.vue`**:
   - Sticky top bar with Retrv logo wordmark, search field with debounce and clear functionality, "+ Create Report" primary CTA, notification bell with unread count badge, and user avatar.
2. **`src/components/desktop/DesktopSidebar.vue`**:
   - Sticky left sidebar with navigation routes, unread messages indicator, Explore Maps placeholder with "Soon" badge, and category filters with "Show more" expansion.
3. **`src/components/desktop/DesktopRightRail.vue`**:
   - Supporting right rail with an honest "Posts Near You" placeholder card and 3 community recovery tips.
4. **`src/composables/useFeedFilter.ts`**:
   - Shared reactive singleton composable synchronizing search query, debouncing, category selections, status filters (`All`, `Lost`, `Found`, `Resolved`), and filter reset methods across header, sidebar, and feed.

---

## Components Reused

- **`PostComposerModal.vue`**: Authoritative create-post sheet used for both mobile dock "+" button and desktop header "+ Create Report" button.
- **`NotificationsModal.vue`**: Sheet modal reused for both mobile header bell and desktop top bar bell.
- **`PostCard.vue`**: Unaltered post card with responsive desktop hover enhancement and metadata spacing.
- **`PostCardSkeleton.vue`**: Feed loading skeleton.
- **`UserAvatar.vue`**: Profile representation in header and sidebar.
- **`AppDock.vue`**: Mobile bottom navigation dock preserved for `< 1200px`.
- **`FilterSheetModal.vue`**: Mobile filter sheet interacting with the shared filter state.

---

## Home / Feed Changes

1. **Header Adaptation**:
   - `.home-ion-header` is hidden on desktop (`@media (min-width: 1200px) { display: none !important; }`), as `DesktopHeader` supplies the brand, search, and notification controls.
   - On mobile/tablet (`< 1200px`), `.home-ion-header` remains active.
2. **Status Filter Pills**:
   - `[ All ] [ Lost ] [ Found ] [ Resolved ]` rendered at the top of the feed with hover states and active indicators.
3. **Center Feed Width**:
   - Constrained to `max-width: 660px` on desktop for social readability, balanced media presentation, and prevention of stretched post cards.
4. **Dock Spacer**:
   - Suppressed on desktop (`display: none !important`), restoring appropriate 24px bottom margins.
5. **State Synchronization**:
   - Powered by `useFeedFilter()`, ensuring typing in the desktop search bar or toggling categories in the sidebar instantly updates the feed via `getFilteredPosts` with zero duplicate database fetches.

---

## Desktop Navigation

- **Home**: Routes to `/tabs/home` with active indicator.
- **Messages**: Routes to `/tabs/messages` with active indicator and unread message count dot/pill.
- **Profile**: Routes to `/tabs/profile` with active indicator.
- **Explore Maps**: Visually marked as upcoming with a "Soon" pill; clicking displays an informative toast notification explaining map discovery is slated for a future release. Real mapping libraries (Mapbox, Leaflet, Google Maps) were explicitly not added.

---

## Search / Filters

- Single source of truth managed via `useFeedFilter()`.
- Search query has a 250ms debounce and escape-key clearing.
- Category filters in `DesktopSidebar` source directly from `MAIN_CATEGORIES` in `src/config/categories.ts`.
- Selecting a category in the sidebar updates `appliedFilters.categories`, triggers removable chip pills above the feed, and provides a "Clear" shortcut when active.

---

## Create Post Reuse

- Existing `PostComposerModal.vue` remains the single authoritative create-post flow.
- No separate desktop post composer was created.
- Form validation, category selection, image upload logic, and Supabase insertion logic remain 100% shared.
- Responsive modal presentation rules in `src/theme/variables.css` constrain the sheet on desktop to `--width: 540px; --max-height: 85vh; --border-radius: 20px;`.

---

## Nearby Placeholder

- In `DesktopRightRail.vue`, "Posts Near You" displays an honest placeholder state:
  > "Nearby discovery will appear here once location-based search is available. Community reports are currently sorted by latest submissions."
- Zero fake GPS distances or simulated radar queries were introduced.

---

## Explore Maps Placeholder

- In `DesktopSidebar.vue`, "Explore Maps" is explicitly labeled with a "Soon" badge.
- Clicking triggers a non-destructive toast notification: *"Explore Maps is coming soon in a future update."*
- No geospatial APIs, Leaflet, Mapbox, or location permission requests were added.

---

## Tablet Behavior

- Viewports between `768px` and `1199.98px` (e.g. iPad Mini 768px, iPad Air 820px, iPad Pro 1024px) remain strictly on the mobile application shell.
- Tablet displays:
  - Mobile top header with Retrv logo wordmark and search icon.
  - Floating bottom dock (`AppDock.vue`).
  - No desktop sidebars, no desktop top header, no desktop right rail.
  - Widened content width (`--max-content-width: 720px`) for balanced tablet ergonomics.

---

## Mobile Regression Review

- Mobile viewports (`360px`, `390px`, `412px`):
  - Bottom dock displays and handles Home, Create, Messages, and Profile tabs.
  - Search toggle opens expanded search input within mobile toolbar.
  - Filter button opens `FilterSheetModal.vue`.
  - Zero layout overlap or unexpected scrollbars.

---

## Routes Verified

- `/tabs/home`: Verified across Mobile (390px), Tablet (768px, 1024px), Compact Desktop (1280px), and Full Desktop (1440px).
- `/tabs/messages`: Renders in center viewport with active sidebar state on desktop and mobile dock on tablet.
- `/tabs/profile`: Renders hero card, stats, and post lists centered on desktop.
- `/post/:id`: Retains centered post details layout (`max-content-width: 760px`).
- `/chat/:conversationId`: Retains message thread layout and safe header navigation.
- `/settings`: Retains centered settings menu.

---

## Accessibility

- Semantic HTML tags utilized: `<header>`, `<nav>`, `<aside>`, `<main>`, `<article>`, `<footer>`.
- ARIA landmarks and attributes: `role="list"`, `role="listitem"`, `aria-label`, `aria-current="page"`, `aria-pressed`, `aria-disabled="true"`.
- Keyboard navigation: Visible `:focus-visible` outline rings (2px solid `--app-primary` with offset) on buttons, links, search input, and category filters.
- Escape key dismisses desktop search input.

---

## Validation Results

| Check | Target / Command | Status | Evidence |
|---|---|---|---|
| **Typecheck & Build** | `npm run build` (`vue-tsc && vite build`) | **PASS** | Exit code 0, 0 type errors, production bundles emitted |
| **Lint** | `npm run lint` | **PASS** | Touch files free of unused variables; no new lint errors introduced |
| **Git Diff Check** | `git diff --check` | **PASS** | Exit code 0, clean whitespace and syntax |
| **Runtime Architecture** | `IonTabs` slot validation | **PASS** | Direct child relationship resolved; zero runtime outlet errors |
| **Mobile Layout (< 1200px)** | 390 × 844 | **PASS** | Mobile header + AppDock visible; desktop elements hidden |
| **Tablet Layout (768px, 820px, 1024px)** | 768 × 1024, 1024 × 1366 | **PASS** | Mobile shell preserved; widened content width (720px); desktop rails hidden |
| **Desktop Layout (>= 1200px)** | 1280 × 800, 1440 × 900, 1920 × 1080 | **PASS** | Dedicated 3-column shell active; AppDock hidden |

---

## Known Limitations

- Realtime chat currently uses the mobile conversation list view; split-pane desktop messaging (threads list on left, active chat on right) is deferred to a future phase.
- Map-based item discovery and GPS distance calculations remain placeholders pending geospatial backend infrastructure.

---

## Deferred Desktop Features

- Actual Explore Maps integration (Leaflet/Mapbox/Google Maps).
- GPS device permission flow and PostGIS geospatial queries.
- Desktop messaging split view (master-detail layout).
- Advanced desktop profile layout redesign.
