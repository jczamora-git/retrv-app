# Retrv Desktop Page Patterns & Guidelines

## 1. Approved Desktop Page Patterns

Retrv desktop views must align with one of four established layout patterns:

---

### Pattern A: Standard Discovery Feed (Home Pattern)
- **Use Case:** Browsing feeds, item discovery, category browsing, community forums.
- **Chrome Configuration:**
  - `DesktopHeader`: **Visible**
  - `DesktopNavSidebar`: **Visible** (`240px`)
  - `DesktopContextRail`: **Visible** (`280px`, collapses `< 1360px`)
- **Center Feed Width:** Max `680px` (`var(--desktop-feed-width)`).
- **Scroll Model:** Outer document scroll.
- **Reference Implementation:** [src/views/desktop/DesktopHomePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/desktop/DesktopHomePage.vue).

---

### Pattern B: Full-Bleed Workspace (Messages Pattern)
- **Use Case:** High-density interaction tools, split-pane chat workspaces, interactive map exploration.
- **Chrome Configuration:**
  - `DesktopHeader`: **Visible**
  - `DesktopNavSidebar`: *Hidden*
  - `DesktopContextRail`: *Hidden*
- **Workspace Width:** `100%` full viewport width.
- **Scroll Model:** Fixed shell container (`height: calc(100vh - 64px)`), internal dual-pane scrolling.
- **Reference Implementation:** [src/views/desktop/DesktopMessagesPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/desktop/DesktopMessagesPage.vue).

---

### Pattern C: Community Content + Dedicated Domain Rail (Profile Pattern)
- **Use Case:** User profiles, organization hub, detailed member summaries.
- **Chrome Configuration:**
  - `DesktopHeader`: **Visible**
  - `DesktopNavSidebar`: *Hidden*
  - `DesktopContextRail`: *Hidden* (Generic rail hidden)
  - `Page-Owned Right Rail`: **Visible** (e.g., Community Merit, Achievements, Member Stats)
- **Layout:** Two-column grid (`1fr 310px` or `1fr 320px`, max-width `1180px`).
- **Scroll Model:** Outer document scroll.
- **Reference Implementation:** [src/views/desktop/DesktopProfilePage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/desktop/DesktopProfilePage.vue).

---

### Pattern D: Activity & Notification Feed (Notifications Pattern)
- **Use Case:** Inbox, notification feeds, audit trails, activity history.
- **Chrome Configuration:**
  - `DesktopHeader`: **Visible**
  - `DesktopNavSidebar`: **Visible**
  - `DesktopContextRail`: *Hidden*
- **Content Width:** Max `760px` to `800px` centered.
- **Scroll Model:** Outer document scroll.
- **Reference Implementation:** [src/views/desktop/DesktopNotificationsPage.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/views/desktop/DesktopNotificationsPage.vue).

---

## 2. Layout Tokens & Sizing Reference

| Token / Property | Canonical Value | Usage |
| :--- | :--- | :--- |
| `--desktop-header-height` | `64px` | Global sticky header |
| `--desktop-nav-width` | `240px` | Fixed left navigation sidebar |
| `--desktop-feed-width` | `680px` | Center feed viewport max-width (Home) |
| `--desktop-right-rail-width` | `280px` | Generic context rail width |
| Profile Rail Width | `310px` – `320px` | Dedicated community identity rail |
| Notifications Feed Width | `760px` | Dedicated notifications card container |

---

## 3. Page Component Responsibilities

### Desktop Page Components MUST:
1. Handle route-specific data binding, filtering, tabs, and actions.
2. Render explicit loading skeletons, empty state placeholders, and error recovery states.
3. Reuse existing shared composables (`useAuth`, `usePosts`, `useNotifications`, `useChat`).
4. Support clean standard HTML and CSS variable tokens.

### Desktop Page Components MUST NOT:
1. Duplicate global chrome (`DesktopHeader`, `DesktopNavSidebar`, `AppDock`).
2. Wrap content in Ionic containers (`IonPage`, `IonContent`, `IonTabs`).
3. Maintain private, duplicated fetching logic when a shared composable exists.

---

## 4. Shared Business Logic Invariant

> [!IMPORTANT]
> **No Duplicate Business Composables:**
> Desktop views and mobile Ionic views must consume the exact same composables from `src/composables/`.
> 
> - **DO NOT create:** `useDesktopPosts.ts`, `useDesktopNotifications.ts`, `useDesktopChat.ts`.
> - **DO use:** [usePosts.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/composables/usePosts.ts), [useNotifications.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/composables/useNotifications.ts), [useChat.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/composables/useChat.ts).

---

## 5. Desktop Route Creation Recipe

When creating a new desktop route:
1. **Define Canonical Route:** Register clean path (e.g., `/explore`) in [src/router/index.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/router/index.ts).
2. **Select Approved Pattern:** Choose Pattern A, B, C, or D.
3. **Configure Shell Policy:** Determine visibility for Header, Sidebar, and Context Rail.
4. **Create Pure Vue Component:** Create `src/views/desktop/Desktop<Name>Page.vue` without Ionic wrappers.
5. **Connect Shared Composables:** Import data hooks from `src/composables/`.
6. **Preserve Mobile Route:** Keep or implement the `< 1200px` mobile Ionic view cleanly separated.
7. **Verify Route Table:** Update [DESKTOP-ROUTES.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-ROUTES.md).
8. **Verify Shell Regression Safety:** Ensure Home (`/`) retains its `240px` sidebar and context rail.

---

## 6. New Desktop Page Planning Template

```markdown
### New Desktop Page Definition
- **Feature Name:** [e.g., Explore Map]
- **Canonical Route:** `/explore`
- **Route Name:** `Explore`
- **Layout Pattern:** [Pattern A / B / C / D]
- **DesktopHeader:** [VISIBLE / HIDDEN]
- **DesktopNavSidebar:** [VISIBLE / HIDDEN]
- **DesktopContextRail:** [VISIBLE / HIDDEN]
- **Page-Owned Rail:** [YES / NO]
- **Scroll Ownership:** [OUTER DOCUMENT / INTERNAL WORKSPACE]
- **Mobile Counterpart:** [Dedicated mobile view in src/views/ or modal]
- **Shared Composables Used:** [e.g., usePosts, useCategories]
- **Desktop Component Path:** `src/views/desktop/DesktopExplorePage.vue`
```
