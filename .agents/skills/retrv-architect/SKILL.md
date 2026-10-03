---
name: retrv-architect
description: Guides cross-domain system architecture, dependency tracing, subsystem boundaries, and phase discipline across the Retrv platform.
---

# Retrv Architect Skill

> **Target:** System-wide structural integrity, dependency tracing, and cross-cutting domain coordination in Retrv.

---

## 1. Domain Responsibility & Current Architecture

Retrv is an Ionic Vue 3 SPA backed by Supabase, Vercel serverless APIs, UploadThing, and Capacitor Android. The current architecture uses a **composable-centric pattern** where Vue components call stateful composables that communicate directly with Supabase.

```text
Presentation: Views (src/views/) & Components (src/components/)
    ↓
State & Domain Logic: Composables (src/composables/)
    ↓
Data Access: Services (src/services/) & Supabase Client (src/utils/supabase.ts)
    ↓
Storage & Compute: Supabase PostgreSQL, Edge Functions, UploadThing, FCM
```

---

## 2. Cross-Cutting Event Tracing (Mandatory)

Any architectural change that triggers cross-domain mutations must be comprehensively traced across all affected subsystems before implementation.

### Example: Post Resolution Flow
```text
Resolve Action (ResolvePostModal.vue)
    ├── 1. Posts Subsystem (usePosts.ts)
    │      └── Update posts.status = 'resolved' | 'returned', resolved_at, resolved_to
    ├── 2. Merit Subsystem (useAchievements.ts)
    │      └── Check for existing badge; insert into achievements table
    ├── 3. Notification Subsystem (useNotifications.ts)
    │      └── Generate in-app notification record for recipient
    ├── 4. Push Subsystem (supabase/functions/send-push-notification)
    │      └── Dispatch FCM push to helper's device
    ├── 5. Realtime Subsystem (Supabase channels)
    │      └── Broadcast post update and notification to active clients
    ├── 6. Profile Counters (useAuth.ts, useProfiles.ts)
    │      └── Invalidate cached post counts and merit badge counts
    └── 7. Database RLS & Integrity (supabase-schema.sql)
           └── Validate user permission to resolve post and insert merit
```

---

## 3. Architecture Decision Rules

1. **Explicit Domain Boundaries:** Keep composables focused on their domain. Avoid calling foreign database tables directly from unrelated composables.
2. **Atomic Workflows:** Multi-table mutations (such as Resolution + Achievement Awarding) should be transitioned toward transactional PostgreSQL RPC functions rather than sequential client-side HTTP calls.
3. **Phase Discipline:** Never leak future phase requirements into the current task. Always consult `docs/development/phase-roadmap.md`.
4. **Legacy System Coexistence:** Respect the boundary between active Supabase systems and legacy Express/Firebase code. Do not remove legacy endpoints without explicit authorization.

---

## 4. Pre-Implementation Checklist

- [ ] Identified all caller views and components.
- [ ] Identified all affected database tables and columns.
- [ ] Traced all realtime channel events triggered by this change.
- [ ] Checked for optimistic UI reconciliation impacts.
- [ ] Verified that change adheres strictly to the active Phase scope.
