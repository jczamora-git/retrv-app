---
name: retrv-notifications
description: Guides in-app notification inbox handling, user notification preferences, device push token management, and FCM delivery via Supabase Edge Functions in Retrv.
---

# Retrv Notifications Skill

> **Target:** Dual-pipeline notification management (In-App Inbox and FCM Push Notifications).

---

## 1. Dual Notification Architecture

Retrv implements two distinct notification mechanisms that work together:

```text
Application Event (e.g., Comment, Message, Merit)
    ↓
1. IN-APP PIPELINE
   ├── Insert row into 'notifications' table (user_id, type, data, is_read)
   └── Broadcast via Supabase Realtime channel 'notifications:{uid}'
    ↓
2. PUSH NOTIFICATION PIPELINE
   ├── Check user category preferences in 'notification_preferences'
   ├── Retrieve active FCM device tokens from 'push_tokens' table
   ├── Invoke Supabase Edge Function 'send-push-notification'
   ├── Dispatch payload via Firebase Cloud Messaging (FCM HTTP v1 / legacy)
   └── Deliver push alert with deep link payload to mobile device
```

---

## 2. Inviolable Notification Rules

1. **Verify Token Ownership:**
   - A client may only register or update push tokens for their authenticated `auth.uid()`.
   - Never allow User A to insert or view push tokens belonging to User B.
2. **Strict Category Preference Enforcement:**
   - Before dispatching a push notification, the system MUST inspect `notification_preferences` for the recipient. If the recipient has disabled `comments`, `messages`, or `community_updates`, push dispatch must be suppressed.
3. **Dead Token Cleanup:**
   - When FCM returns `UNREGISTERED` or `INVALID_ARGUMENT` errors, the Edge Function or backend MUST delete the offending token from `push_tokens` to prevent wasteful retries.
4. **Deep-Link Reliability:**
   - All notifications (in-app and push) must provide consistent deep-link metadata (e.g., `postId`, `conversationId`, `route`) so tapping an alert opens the exact target view.
5. **Separation of Test Proof:**
   - Proof that a database row exists in `notifications` is NOT proof that an FCM push reached a physical device. Always verify push delivery independently.
