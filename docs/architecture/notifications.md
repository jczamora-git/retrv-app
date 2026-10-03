# Retrv — In-App & Push Notification Architecture

> **Purpose:** Detailed architectural specification of Retrv's dual notification pipeline: In-App inbox notifications and native Push Notifications via Firebase Cloud Messaging.

---

## 1. Dual Pipeline Architecture Overview

```text
Domain Event (Comment Added / Direct Message Sent / Merit Awarded)
  │
  ├──► [Pipeline A: In-App Inbox]
  │      ├── Client inserts record into 'notifications' table
  │      ├── Database emits event on 'notifications:{recipient_id}' channel
  │      └── Recipient client receives realtime payload & updates badge
  │
  └──► [Pipeline B: Native Push Notifications]
         ├── Check 'notification_preferences' for recipient
         ├── Query 'push_tokens' for active FCM tokens
         ├── Trigger Supabase Edge Function 'send-push-notification'
         ├── Dispatch FCM HTTP v1 API call to Google
         ├── Google FCM forwards alert to Android device
         └── Native tap executes deep link to target view
```

---

## 2. In-App Notification System

### Storage & Schema (`notifications` table)
- `id` (TEXT, PK): Auto-generated.
- `user_id` (TEXT): Recipient user ID.
- `type` (TEXT): Notification category:
  - `'comment'` — New comment on user's post.
  - `'reply'` — Reply to user's comment.
  - `'message'` — New private message.
  - `'merit'` / `'merit_awarded'` — Helper awarded Community Merit.
  - `'resolved_post'` — Post marked as resolved.
- `title` (TEXT) & `body` (TEXT): Human-readable message content.
- `data` (JSONB): Navigation routing parameters (e.g., `{ postId, commentId, conversationId }`).
- `is_read` (BOOLEAN): Read/unread toggle.

### Creation & Realtime Streaming
- **Current Behavior:** In-app notifications are created via client-side inserts in `useNotifications.ts` (`createNotification()`).
- **Subscription:** Subscribed in `App.vue` on session initialization:
  `supabase.channel('notifications:' + myUid).on('postgres_changes', { filter: 'user_id=eq.' + myUid })`.

---

## 3. Push Notification Pipeline (FCM + Edge Functions)

### Components
1. **Device Registration (`pushNotificationService.ts`):**
   - Capacitor `@capacitor/push-notifications` registers with FCM and obtains a device registration token.
   - Token is upserted to `push_tokens` table with `user_id`, `platform: 'android'`, and `updated_at`.
2. **Notification Preferences (`useNotificationPreferences.ts`):**
   - Stores user preferences in `notification_preferences`: `comments`, `replies`, `messages`, `merits`, `community_updates`.
3. **Supabase Edge Function (`supabase/functions/send-push-notification/index.ts`):**
   - Implements both FCM HTTP v1 (`https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`) and legacy FCM HTTP fallback.
   - Evaluates recipient preferences before sending.
   - Catches dead tokens (`UNREGISTERED`, `INVALID_ARGUMENT`) and automatically deletes them from `push_tokens`.

> [!IMPORTANT]
> **Runtime Verification Needed:** The automated trigger linking a new `notifications` table insert to the `send-push-notification` Edge Function is not explicitly codified in repository SQL migrations. It may be configured via a Supabase Dashboard Database Webhook. This trigger requires live runtime verification during Phase 5.
