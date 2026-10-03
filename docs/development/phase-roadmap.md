# Retrv — Engineering Phase Roadmap

> **CRITICAL DIRECTIVE:** Phases must be executed sequentially. Completing Phase N does NOT authorize beginning Phase N+1. Each phase requires an explicit user command and an authorized entry handoff.

---

## Roadmap Overview

```text
Phase 0: Agent Harness & Documentation [CURRENT]
    ↓
Phase 1: Security Foundation (RLS, Credentials, Upload Auth)
    ↓
Phase 2: Database Integrity (Foreign Keys, Status Constraints, Orphan Cleanup)
    ↓
Phase 3: Trusted Backend Workflows (Atomic Resolution & Server RPCs)
    ↓
Phase 4: Messaging & Realtime Reliability (Scoped Channels, Atomic Unread)
    ↓
Phase 5: Notification & FCM Pipeline Reliability (Triggers & Preferences)
    ↓
Phase 6: Search & Performance (Server-Side Querying & Pagination)
    ↓
Phase 7: Testing & Automated Regression Hardening (Multi-User Test Suite)
    ↓
Phase 8: Feature Completion & Mobile Release Readiness
```

---

## Detailed Phase Specifications

### Phase 0 — Agent Harness & Engineering Documentation
- **Goal:** Establish strict engineering rules, architecture documentation, specialized skills, and safety invariants.
- **Included:** Markdown documentation, `.agents/skills/`, architecture guides, phase definitions, templates.
- **Excluded:** Any product code, database migrations, security fixes, or UI changes.
- **Entry Criteria:** Full system audit completed.
- **Exit Criteria:** All 58 harness deliverables validated and committed; Phase 0 report delivered.

### Phase 1 — Security Foundation
- **Goal:** Eliminate critical P0 data exposure vulnerabilities and secure API boundaries.
- **Included:** Hardening all RLS policies to use `auth.uid()`; protecting private profile data (email/phone); removing hardcoded Supabase keys from source/CI; securing UploadThing middleware and deletion endpoints; locking down push tokens and preferences.
- **Excluded:** Foreign key constraints; status redesign; atomic resolution RPCs; comment threading; pagination.
- **Entry Criteria:** Phase 0 approved.
- **Exit Criteria:** Multi-user RLS verification proves unauthorized users cannot read/modify private records.

### Phase 2 — Database Integrity
- **Goal:** Establish strict referential integrity, constraints, and data consistency.
- **Included:** Adding foreign keys with explicit `ON DELETE` rules; aligning `posts.status` CHECK constraints with application types; orphan record audit and cleanup; adding unique constraints.
- **Excluded:** Major frontend redesigns or RPC workflow refactors.
- **Entry Criteria:** Phase 1 completed and verified.
- **Exit Criteria:** Database constraints active in PostgreSQL; zero constraint violation errors during normal app usage.

### Phase 3 — Trusted Backend Workflows
- **Goal:** Move sensitive business transactions from untrusted browser clients to server-side PostgreSQL functions/RPCs.
- **Included:** Atomic post resolution function (`resolve_post_and_award_merit`); server-enforced merit deduplication; server-side notification generation.
- **Excluded:** Realtime channel refactoring or client UI redesign.
- **Entry Criteria:** Phase 2 completed.
- **Exit Criteria:** Post resolution and merit awarding occur atomically in a single database transaction.

### Phase 4 — Messaging & Realtime Reliability
- **Goal:** Harden private chat subscriptions and unread synchronization.
- **Included:** Adding participant-scoped filters to conversation realtime channels; atomic unread count increments/resets; message pagination.
- **Excluded:** Media upload changes or push notification refactors.
- **Entry Criteria:** Phase 3 completed.
- **Exit Criteria:** No client receives realtime events for conversations they do not participate in.

### Phase 5 — Notification & FCM Reliability
- **Goal:** Ensure 100% reliable end-to-end push notification delivery and preference enforcement.
- **Included:** Database triggers to invoke the `send-push-notification` Edge Function; dead token cleanup; deep link verification on Android devices.
- **Excluded:** Redesigning in-app UI cards.
- **Entry Criteria:** Phase 4 completed.
- **Exit Criteria:** Triggered notifications reliably arrive on physical Android devices.

### Phase 6 — Search & Performance
- **Goal:** Optimize feed loading, search scalability, and database query performance.
- **Included:** PostgreSQL full-text search / ilike indexing; cursor-based pagination for posts, messages, and notifications; query caching.
- **Excluded:** UI feature additions.
- **Entry Criteria:** Phase 5 completed.
- **Exit Criteria:** Feed and search query times remain under 200ms with large datasets.

### Phase 7 — Testing & Automated Regression Hardening
- **Goal:** Expand automated test coverage across critical user journeys.
- **Included:** Vitest unit test suite expansion; Cypress E2E flows; multi-user RLS automated tests.
- **Excluded:** Production deployment.
- **Entry Criteria:** Phase 6 completed.
- **Exit Criteria:** Automated test suite runs green in CI without flaky failures.

### Phase 8 — Feature Completion & Release Readiness
- **Goal:** Finalize missing feature polish and prepare production mobile release artifacts.
- **Included:** Comment threading persistence; release readiness checklist review; production keystore signing; final store bundle generation.
- **Entry Criteria:** Phase 7 completed.
- **Exit Criteria:** Release readiness checklist verified as READY across all dimensions.
