---
name: retrv-realtime
description: Governs Supabase Realtime WebSocket channels, live chat messaging, optimistic updates, unread counters, and channel lifecycle management in Retrv.
---

# Retrv Realtime Skill

> **Target:** Realtime subscriptions, WebSocket channels, optimistic state synchronization, and unread counters.

---

## 1. Realtime Subscriptions in Retrv

Retrv utilizes Supabase Realtime channels across five primary domains:
1. **Chat Messages:** `conversation:{id}` channel in `src/services/chatService.ts` & `src/composables/useChat.ts`.
2. **User Conversations:** Global conversation updates channel in `src/composables/useMessageUnread.ts`.
3. **Public Posts Feed:** `public:posts` channel in `src/composables/usePosts.ts`.
4. **Post Comments:** `public:comments:{postId}` channel in `src/composables/useComments.ts`.
5. **In-App Notifications:** `notifications:{uid}` channel in `src/composables/useNotifications.ts`.

---

## 2. Inviolable Realtime Rules

1. **No Client-Only Privacy Filters:**
   - Realtime channels must not stream unauthorized database events to clients with the expectation that Vue code will filter them out via `if (msg.sender_id === me)`.
   - Security filtering for Realtime must be enforced by PostgreSQL RLS.
2. **Strict Lifecycle Cleanup:**
   - Every subscription initiated in a component or composable MUST implement an unmount hook (`onUnmounted` or explicit `cleanup()` function) that invokes `supabase.removeChannel(channel)`.
   - Never allow orphan subscriptions to persist across page navigations.
3. **Optimistic Updates & Reconciliation:**
   - When updating local state optimistically (e.g., in chat messaging or comments), use client-generated idempotency keys (`client_request_id` UUIDs) to reconcile server responses with pending client records without creating duplicates.
4. **Resumption & Reconnection:**
   - Account for mobile app backgrounding and foregrounding (`visibilitychange` listener in `App.vue`). On app resume, refresh authoritative state from the database to capture missed events during disconnects.
5. **Atomic Unread Synchronization:**
   - Avoid read-modify-write races on `conversations.unread_counts`. Ensure unread resets are isolated and predictable across concurrent device sessions.
