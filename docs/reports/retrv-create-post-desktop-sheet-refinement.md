# Retrv — Create Post Desktop Sheet Refinement

## Objective

Refine the presentation of the shared Create Post experience (`PostComposerModal.vue`) on desktop viewports (`>= 1200px`) so that it no longer appears as a small, short, low-anchored popup dialog ("ang baba"), but instead delivers a tall, immersive, near full-height modal sheet that matches Retrv's clean visual identity while preserving 100% of the existing mobile and tablet modal behavior and create-post business logic.

---

## Previous Desktop Composer Problem

Prior to this refinement:
1. **Low-Height Collapse ("Ang Baba"):** Under generic tablet/desktop modal styles (`@media (min-width: 768px)`), `ion-modal` had `--height: auto; --max-height: 85vh;`. Because `--height` was `auto`, the sheet wrapper shrank down to the minimum initial height of its child inputs (~579px).
2. **Bottom-Anchored Void:** In Ionic sheet modal mode (`breakpoints="[0, 0.95, 1]"`), the modal anchored to `bottom: 0`. On a 945px or 1080px desktop screen, a 579px modal left a massive 366px to 500px empty void above it, making the modal feel unnaturally squished down at the bottom of the monitor.
3. **Narrow Dialog Sizing:** The modal width was constrained to `540px`, making it feel more like a tiny dialog box rather than an immersive, focused content creation sheet.

---

## Shared Composer Reuse

Strict architectural reuse was maintained:
- **Zero Forked Components:** Exactly **ONE** authoritative composer component exists: [src/components/PostComposerModal.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/PostComposerModal.vue).
- **Zero Duplicate Business Logic:** Authentication profile resolution, form state, input validation, image upload pipeline, category binding, date formatting, idempotency key generation (`generateClientRequestId`), and Supabase submission (`usePosts().createPost`) remain unified across all platforms.
- **Entry Point Continuity:** Mobile dock ("Create" action in `AppDock.vue`), mobile FAB (`HomePage.vue`), profile page trigger (`ProfilePage.vue`), and desktop header action ("+ Create Report" in `DesktopHeader.vue`) all open the exact same shared `PostComposerModal.vue`.

---

## Desktop Presentation Changes

1. **Dedicated Modal Selector:** Assigned `class="post-composer-modal"` to `<ion-modal>` in `PostComposerModal.vue` to allow targeted styling without altering utility dialogs (such as filter sheets or notification modals).
2. **Responsive Breakpoints:**
   - On Desktop (`>= 1200px`): Breakpoints reactively set to `[0, 1]` with `initialBreakpoint: 1`. This instructs Ionic to open the modal immediately at 100% of its desktop height (`88vh`) without shifting down 5%.
   - On Mobile / Tablet (`< 1200px`): Retains `[0, 0.95, 1]` with `initialBreakpoint: 0.95`, preserving the standard swipeable mobile bottom sheet.
3. **Elevated Immersion Backdrop:** Injected `--backdrop-opacity: 0.45;` on desktop to provide a deep, focused dimming of the background feed and rails, directing user focus entirely to post creation.
4. **Desktop Sheet Header & Body Spacing:**
   - `.composer-sheet` inherits `border-radius: 24px;`.
   - `.composer-header` expands padding to `16px 24px;` with a distinct `17px` title and prominent action buttons.
   - `.composer-body` increases spacing to `padding: 20px 24px 36px; gap: 18px;` and `.composer-title-input` scales to `20px` font size for fluid, desktop-optimized writing.

---

## Height / Width Strategy

- **Width:**
  - Desktop: `--width: 640px; --max-width: 90vw;`
  - Perfectly aligns with the reading column width of the desktop feed (`680px`), providing ample horizontal breathing room for the title, multiline description, and horizontal attachment pickers without stretching out like a dashboard.
- **Height:**
  - Desktop: `--height: 88vh; --max-height: 92vh;`
  - Reaches ~830px on 945px viewports (and ~950px on 1080px viewports), capturing ~88% of vertical screen real estate.
  - Combines with `margin-bottom: 24px;` on `ion-modal.post-composer-modal::part(content)` to provide:
    - Small top offset: ~50px to 80px (comfortably below the 64px sticky desktop header).
    - Small bottom offset: 24px off the viewport bottom.
    - Full `24px` rounded corners all around and deep elevation shadow (`box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25)`).

---

## Mobile / Tablet Behavior

- **Mobile Viewports (< 768px):**
  - Breakpoints: `[0, 0.95, 1]`, initial: `0.95`.
  - Default full-bleed mobile bottom sheet with drag handle, sliding up from `bottom: 0`.
  - Zero behavioral or styling regressions.
- **Tablet Viewports (768px – 1199.98px):**
  - Media query `@media (min-width: 768px) and (max-width: 1199.98px)` safely isolates tablet sizing:
    `--width: 540px; --height: auto; --max-height: 85vh; --border-radius: 20px;`
  - Breakpoints: `[0, 0.95, 1]`, initial: `0.95`.
  - Tablet continues to operate with its existing mobile-widened presentation.

---

## Modal Scroll Behavior

- **Fixed Header:** The modal top bar (`Cancel`, `Create Post` title, `Post` button) remains locked at the top of the modal via `.composer-sheet` flexbox column layout.
- **Internal Content Scrolling:** `.composer-body` has `flex: 1; overflow-y: auto;`. When attachments, image previews, or extensive descriptions exceed the 88vh modal height, content scrolls smoothly inside `.composer-body`.
- **Page Isolation:** The desktop page behind the modal remains scroll-locked and inactive while post creation is underway.

---

## Files Changed

1. [src/components/PostComposerModal.vue](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/components/PostComposerModal.vue):
   - Added `class="post-composer-modal"` to `<ion-modal>`.
   - Implemented reactive `isDesktop`, `modalBreakpoints`, and `modalInitialBreakpoint` logic with window resize listeners and lifecycle cleanup.
   - Updated template bindings to use `:breakpoints="modalBreakpoints"` and `:initial-breakpoint="modalInitialBreakpoint"`.
   - Added scoped desktop styles for `.composer-sheet`, `.composer-header`, `.composer-body`, and `.composer-title-input`.
2. [src/theme/variables.css](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/theme/variables.css):
   - Scoped tablet modal styling to `@media (min-width: 768px) and (max-width: 1199.98px)`.
   - Added `@media (min-width: 1200px)` rules specifically for `ion-modal.post-composer-modal` (`--width: 640px; --height: 88vh; --max-height: 92vh; --border-radius: 24px; --backdrop-opacity: 0.45;`).
   - Configured `::part(content)` on desktop to apply `margin-bottom: 24px; border-radius: 24px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);`.

---

## Viewports Tested

| Viewport | Device Profile | Modal Class | Height Behavior | Width Behavior | Breakpoint | Result |
|---|---|---|---|---|---|---|
| **390 × 844** | Mobile Phone | `.post-composer-modal` | 95% Bottom Sheet | 100vw | `0.95` | PASS |
| **768 × 1024** | Tablet Portrait | `.post-composer-modal` | Auto (max 85vh) | 540px | `0.95` | PASS |
| **1024 × 768** | Tablet Landscape | `.post-composer-modal` | Auto (max 85vh) | 540px | `0.95` | PASS |
| **1200 × 800** | Small Desktop | `.post-composer-modal` | 88vh (~704px) | 640px | `1.0` | PASS |
| **1280 × 800** | 13" Laptop | `.post-composer-modal` | 88vh (~704px) | 640px | `1.0` | PASS |
| **1366 × 768** | Standard Laptop | `.post-composer-modal` | 88vh (~675px) | 640px | `1.0` | PASS |
| **1440 × 900** | 15" Laptop | `.post-composer-modal` | 88vh (~792px) | 640px | `1.0` | PASS |
| **1536 × 864** | FHD Display | `.post-composer-modal` | 88vh (~760px) | 640px | `1.0` | PASS |
| **1920 × 1080** | FHD Desktop | `.post-composer-modal` | 88vh (~950px) | 640px | `1.0` | PASS |

---

## Validation

- **Typecheck & Production Build (`npm run build`):**
  - Command: `vue-tsc && vite build`
  - Exit Code: `0` (PASS in 12.99s)
- **Component Lint (`npx eslint src/components/PostComposerModal.vue`):**
  - Exit Code: `0` (PASS — zero warnings, zero errors)
- **Syntax / Diff Check (`git diff --check`):**
  - Exit Code: `0` (PASS — zero whitespace or syntax errors)

---

## Known Limitations

- Sub-modals launched from within the composer (e.g., date picker modal, category select modal) remain centered utility dialogs with auto-height rather than cascading full-height sheets.

---

## Deferred Improvements

- Rich text markdown editing toolbar for the post description on desktop.
- Drag-and-drop zone support for attaching photos directly from desktop OS file explorers.
