# Retrv Desktop Routes & Layout Matrix

## 1. Canonical Desktop Route & Layout Matrix

The desktop shell (`DesktopWebShell`) coordinates global chrome elements based on the active canonical route:

| Route Path | Route Name | Purpose | Desktop Header | DesktopNav Sidebar | Generic ContextRail | Page-Owned Right Rail |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `/` | `Home` | Community Feed & Filtering | **Visible** | **Visible** | **Visible** | None |
| `/messages` | `Messages` | Direct Messaging Split-View | **Visible** | *Hidden* | *Hidden* | None |
| `/profile` | `Profile` | Community Identity & Merit | **Visible** | *Hidden* | *Hidden* | **Visible** (Profile Rail) |
| `/notifications` | `Notifications` | Dedicated Notification Feed | **Visible** | **Visible** | *Hidden* | None |
| `/profile/:userId` | `PublicProfile` | Member Public Profile | **Visible** | *Hidden* | *Hidden* | **Visible** (Member Rail) |
| `/chat/:conversationId`| `Chat` | Direct Chat Workspace | *Hidden* | *Hidden* | *Hidden* | None |
| `/post/:id` | `PostDetails` | Detailed Post View | Via Page | *Hidden* | *Hidden* | None |
| `/settings` | `Settings` | Account Settings | Via Page | *Hidden* | *Hidden* | None |
| `/settings/notifications`| `NotificationSettings`| Push & In-App Prefs | Via Page | *Hidden* | *Hidden* | None |
| `/settings/security` | `SecuritySettings`| Password & Session | Via Page | *Hidden* | *Hidden* | None |
| `/settings/help` | `HelpCenter` | FAQs & Support | Via Page | *Hidden* | *Hidden* | None |

---

## 2. Route Transition Smoke Test Matrix

When changing routing, shell mounting, or navigation headers, run through the following smoke test matrix to verify that the visible view and URL stay synchronized:

| Transition Flow | Expected URL | Expected Visible View | Prior Page Status |
| :--- | :--- | :--- | :--- |
| `Home` → `Settings` | `/settings` | SettingsPage | Home hidden |
| `Settings` → `Home` | `/` | DesktopHomePage | Settings hidden (`.ion-page-hidden`) |
| `Profile` → `Settings` | `/settings` | SettingsPage | Profile hidden |
| `Settings` → `NotificationSettings` | `/settings/notifications`| NotificationSettingsPage | Settings hidden |
| `NotificationSettings` → Click `Back` | `/settings` | SettingsPage | NotificationSettings hidden |
| `Settings` → `Security` → Click `Back` | `/settings` | SettingsPage | Security hidden |
| `Settings` → `Help` → Click `Back` | `/settings` | SettingsPage | Help hidden |
| `NotificationSettings` → Click `Home` | `/` | DesktopHomePage | NotificationSettings hidden |

*At all times, `window.location.pathname === current active route`.*

---

## 3. Legacy Route Compatibility & Redirect Invariant

> [!IMPORTANT]
> **No Active `/tabs` URLs:**
> All user-facing navigation in code must target canonical clean URLs. `/tabs/...` paths exist solely in [src/router/index.ts](file:///c:/Users/JC%20Zamora/Documents/retrv-app/src/router/index.ts) as backwards-compatible HTTP/browser redirects.

### Canonical Redirect Mappings in Router
```ts
{ path: '/tabs/home', redirect: '/' },
{ path: '/tabs/messages', redirect: '/messages' },
{ path: '/tabs/profile', redirect: '/profile' },
{ path: '/tabs/notifications', redirect: '/notifications' },
{ path: '/tabs', redirect: '/' },
{ path: '/tabs/:pathMatch(.*)*', redirect: '/' },
{ path: '/items', redirect: '/' },
{ path: '/home', redirect: '/' },
{ path: '/activity', redirect: '/profile' }
```

**Rule:** Never push or navigate to `/tabs/...` in application components or composables.

---

## 4. Named Route Invariant

Always prefer typed named routes when navigating within components:

| Destination | Preferred Named Navigation | Avoid |
| :--- | :--- | :--- |
| **Home Feed** | `router.push({ name: "Home" })` | `router.push("/")`, `router.push("/tabs/home")` |
| **Messages** | `router.push({ name: "Messages" })` | `router.push("/messages")`, `router.push("/tabs/messages")` |
| **Profile** | `router.push({ name: "Profile" })` | `router.push("/profile")`, `router.push("/tabs/profile")` |
| **Notifications** | `router.push({ name: "Notifications" })` | `router.push("/notifications")`, `router.push("/tabs/notifications")` |
| **Settings** | `router.push({ name: "Settings" })` | `router.push("/settings")` |
| **Chat Thread** | `router.push({ name: "Chat", params: { conversationId } })` | Hardcoded string paths |
