# Retrv — System Domain Map

> **Purpose:** Authoritative inventory of all functional domains within Retrv, their file locations, data models, dependencies, and identified risks.

---

## 1. Authentication Domain

- **Responsibility:** User registration, email/password login, username resolution, dev bypass, session state tracking, logout.
- **Primary Files:** `src/composables/useAuth.ts`, `src/views/AuthPage.vue`, `src/router/index.ts`, `api/auth/resolve-username.ts`.
- **Database Tables:** `profiles`, Supabase `auth.users`.
- **External Dependencies:** Supabase Auth, Firebase Admin (legacy username resolution).
- **Important Consumers:** `App.vue`, `router.beforeEach`, all protected views.
- **Known Risks:** `useAuth.ts` is a large file (756 LOC) with multiple overlapping auth refs; `VITE_DEV_BYPASS_AUTH` is compiled into the client bundle; profile fetch errors do not halt the session.

---

## 2. Profiles Domain

- **Responsibility:** User profile display, display name, username, bio, avatar, contact info, activity counters (posts, resolved, merits).
- **Primary Files:** `src/composables/useProfiles.ts`, `src/views/ProfilePage.vue`, `src/views/PublicProfilePage.vue`, `src/views/EditProfilePage.vue`.
- **Database Tables:** `profiles`.
- **External Dependencies:** UploadThing (avatar uploads).
- **Important Consumers:** Post cards, comment lists, chat headers, public profile views.
- **Known Risks:** `profiles` table stores sensitive contact fields (`phone`, `email`) readable by all users due to permissive RLS.

---

## 3. Posts Domain (Lost & Found)

- **Responsibility:** Creating, browsing, filtering, viewing, editing, and deleting Lost and Found reports.
- **Primary Files:** `src/composables/usePosts.ts`, `src/views/HomePage.vue`, `src/views/PostDetailsPage.vue`, `src/views/EditPostPage.vue`, `src/components/PostComposerModal.vue`.
- **Database Tables:** `posts`.
- **External Dependencies:** UploadThing (post photos).
- **Important Consumers:** Feed, profile activity, search modal, comments.
- **Known Risks:** Post status CHECK mismatch in schema (`claimed` vs `returned`); global realtime channel `public:posts` is never unsubscribed; pagination is missing (hard limit of 50).

---

## 4. Categories & Search Domain

- **Responsibility:** Organizing posts into 13 top-level categories and subcategories; dynamic custom subcategory creation; in-memory post filtering.
- **Primary Files:** `src/config/categories.ts`, `src/composables/useCategories.ts`, `src/components/CategoryFilterBar.vue`, `src/components/SearchModal.vue`.
- **Database Tables:** `subcategories`.
- **External Dependencies:** None.
- **Important Consumers:** `usePosts.getFilteredPosts()`, post composer.
- **Known Risks:** Search is performed entirely client-side on the latest 50 fetched posts; no full-text search index in PostgreSQL.

---

## 5. Comments & Discussion Domain

- **Responsibility:** Public discussion on posts, threaded replies, realtime comment streaming.
- **Primary Files:** `src/composables/useComments.ts`, `src/components/CommentSection.vue`, `src/components/CommentItem.vue`.
- **Database Tables:** `comments`.
- **External Dependencies:** None.
- **Important Consumers:** `PostDetailsPage.vue`, `useNotifications.ts`.
- **Known Risks:** Comment threading (`parent_comment_id`) exists in TypeScript interfaces but is not stored in the database schema; comment deletion on post delete is client-initiated due to lack of FK cascade.

---

## 6. Private Conversations Domain

- **Responsibility:** Managing 1-on-1 private conversation rosters between users.
- **Primary Files:** `src/services/chatService.ts`, `src/composables/useConversations.ts`, `src/views/MessagesPage.vue`.
- **Database Tables:** `conversations`.
- **External Dependencies:** None.
- **Important Consumers:** `ChatPage.vue`, unread counter composables.
- **Known Risks:** Query in `chatService.ts` fetches all conversations without a participant filter; conversation IDs are deterministic (`conv_{uid1}__{uid2}`), preventing multiple conversations per post.

---

## 7. Private Messaging Domain

- **Responsibility:** Sending, receiving, and displaying real-time private messages and photo attachments within a conversation.
- **Primary Files:** `src/composables/useChat.ts`, `src/services/chatService.ts`, `src/views/ChatPage.vue`, `src/components/ChatMessageBubble.vue`.
- **Database Tables:** `messages`.
- **External Dependencies:** UploadThing (chat image attachments), Supabase Realtime (`conversation:{id}`).
- **Important Consumers:** `MessagesPage.vue`, `useMessageUnread.ts`.
- **Known Risks:** Permissive RLS allows any user to query messages from any conversation; messages table lacks foreign key to conversations.

---

## 8. Unread Message Management Domain

- **Responsibility:** Tracking unread message counts per conversation and global message unread badge.
- **Primary Files:** `src/composables/useMessageUnread.ts`, `src/components/BottomTabBar.vue`.
- **Database Tables:** `conversations.unread_counts` (JSONB), `messages.read`.
- **External Dependencies:** LocalStorage (`laf_read_{id}`).
- **Important Consumers:** Navigation tabs, message conversation cards.
- **Known Risks:** Unread counts use a read-modify-write pattern on JSONB without database-level atomic operations or row locks.

---

## 9. Resolution & Community Merit Domain

- **Responsibility:** Marking posts as resolved/returned, selecting a community helper, and awarding Community Merit achievement badges.
- **Primary Files:** `src/composables/useAchievements.ts`, `src/components/ResolvePostModal.vue`, `src/components/AchievementsSection.vue`.
- **Database Tables:** `posts`, `achievements`.
- **External Dependencies:** None.
- **Important Consumers:** `PostDetailsPage.vue`, `ProfilePage.vue`.
- **Known Risks:** Multi-table mutation (updating `posts` and inserting `achievements`) is non-atomic and executes from untrusted client code; author check is client-side only.

---

## 10. In-App Notifications Domain

- **Responsibility:** In-app notification inbox, unread counts, realtime notification badges.
- **Primary Files:** `src/composables/useNotifications.ts`, `src/components/NotificationModal.vue`.
- **Database Tables:** `notifications`.
- **External Dependencies:** Supabase Realtime (`notifications:{uid}`).
- **Important Consumers:** Top header bar, tab badges.
- **Known Risks:** Notifications are inserted directly by client composables for other users; no server-side trigger validates or restricts notification generation.

---

## 11. Push Notifications Domain

- **Responsibility:** Native push notification registration, token management, preference filtering, and FCM dispatch.
- **Primary Files:** `src/services/pushNotificationService.ts`, `src/composables/useNotificationPreferences.ts`, `supabase/functions/send-push-notification/index.ts`.
- **Database Tables:** `push_tokens`, `notification_preferences`.
- **External Dependencies:** `@capacitor/push-notifications`, Firebase Cloud Messaging (FCM HTTP v1), Supabase Edge Functions.
- **Important Consumers:** `App.vue`, `NotificationSettingsPage.vue`.
- **Known Risks:** Automatic invocation of the Edge Function from database inserts is not visible in the repository (requires webhook or trigger); push tokens lack RLS protection.

---

## 12. Media Uploads Domain

- **Responsibility:** Uploading, resizing, and deleting images for avatars, posts, and chat.
- **Primary Files:** `src/composables/useImageUpload.ts`, `api/uploadthing.ts`.
- **Database Tables:** `profiles.avatar_url`, `posts.photos`, `messages.image_url`.
- **External Dependencies:** UploadThing SDK and CDN.
- **Important Consumers:** Post composer, edit profile, chat page.
- **Known Risks:** Upload endpoints accept arbitrary client header claims without JWT verification; delete endpoint `/api/uploadthing/delete` has zero authentication.

---

## 13. Mobile Native Domain

- **Responsibility:** Android native app compilation, native push registration, status bar theming, device settings navigation.
- **Primary Files:** `capacitor.config.ts`, `android/`, `.github/workflows/build-apk.yml`.
- **Database Tables:** None.
- **External Dependencies:** Capacitor 8, Android SDK 36, Gradle.
- **Important Consumers:** Native Android users.
- **Known Risks:** Missing automated native test suite; CI build uses fallback Supabase anon credentials.
