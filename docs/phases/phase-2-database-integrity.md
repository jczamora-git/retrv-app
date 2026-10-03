# Phase 2 Specification — Database Integrity & Schema Normalization

> **Status:** PLANNED / SPECIFIED (Not authorized for implementation).  
> **Authority:** Derived from [retrv-full-system-audit.md](../audits/retrv-full-system-audit.md) and [AGENTS.md](../../AGENTS.md).  
> **RULE:** This document defines the exact scope of Phase 2. Coding agents MUST NOT implement any item from this document until Phase 1 is verified and Phase 2 is explicitly authorized.

---

## 1. Objective

Establish strict referential integrity, status constraint consistency, and relational safety across all 11 database tables in Supabase PostgreSQL without causing data loss.

---

## 2. Included Scope (Phase 2 Target Deliverables)

1. **Foreign Key Constraints (`REFERENCES`):**
   - Add foreign keys linking:
     - `posts.author_id` -> `profiles(id)` (`ON DELETE CASCADE`)
     - `comments.post_id` -> `posts(id)` (`ON DELETE CASCADE`)
     - `comments.author_id` -> `profiles(id)` (`ON DELETE SET NULL`)
     - `messages.conversation_id` -> `conversations(id)` (`ON DELETE CASCADE`)
     - `messages.sender_id` -> `profiles(id)` (`ON DELETE SET NULL`)
     - `notifications.user_id` -> `profiles(id)` (`ON DELETE CASCADE`)
     - `push_tokens.user_id` -> `profiles(id)` (`ON DELETE CASCADE`)
     - `notification_preferences.user_id` -> `profiles(id)` (`ON DELETE CASCADE`)
     - `achievements.user_id` -> `profiles(id)` (`ON DELETE CASCADE`)
     - `achievements.post_id` -> `posts(id)` (`ON DELETE SET NULL`)
2. **Orphan Data Audit & Safe Backfill:**
   - Audit all pre-existing records for broken foreign key references before applying `REFERENCES` constraints.
   - Clean up or remap orphan comments, messages, and notifications safely.
3. **Status Constraint Normalization:**
   - Reconcile `posts.status` CHECK constraint: Update `CHECK (status IN ('open', 'resolved', 'claimed'))` to include `'returned'` or normalize application code and schema to a unified lifecycle status enum.
4. **Integrity Indexes & Uniqueness:**
   - Enforce uniqueness on `(post_id, badge_id)` in `achievements` to prevent double-awarding merit.
   - Ensure `notification_preferences(user_id)` is unique.

---

## 3. Explicit Exclusions (Deferred to Future Phases)

The following areas are strictly **EXCLUDED** from Phase 2:
- Moving post resolution or merit awarding to PostgreSQL RPC functions — *Deferred to Phase 3*.
- Realtime channel scoping and unread management refactoring — *Deferred to Phase 4*.
- Database webhooks for FCM push notifications — *Deferred to Phase 5*.
- Full-text search indexing — *Deferred to Phase 6*.
