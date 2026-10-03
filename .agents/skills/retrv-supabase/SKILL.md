---
name: retrv-supabase
description: Manages PostgreSQL schema, migrations, Row Level Security policies, indexes, database constraints, and RPC functions in Supabase for Retrv.
---

# Retrv Supabase Skill

> **Target:** PostgreSQL data integrity, migrations, Row Level Security (RLS), and database-level business logic.

---

## 1. Supabase & Database Architecture in Retrv

Retrv uses hosted Supabase PostgreSQL as its primary transactional database. The schema comprises 11 core tables:
- `profiles` — User identity and public/private profile metadata.
- `posts` — Lost and Found community reports.
- `comments` — Public discussion comments on posts.
- `conversations` — 1-on-1 private messaging metadata and participant rosters.
- `messages` — Chat messages belonging to conversations.
- `notifications` — In-app notification inbox records.
- `push_tokens` — FCM device registration tokens.
- `notification_preferences` — Per-user notification category toggles.
- `achievements` — Community merit awards unlocked by helping others.
- `subcategories` — Custom subcategory registry.
- `lost_found` — Legacy activity log table.

---

## 2. Inviolable Database Rules

1. **Migration-Only Schema Changes:**
   - Every schema change must be captured in a timestamped file under `supabase/migrations/` (e.g., `20261003120000_secure_rls.sql`).
   - Baseline SQL files (`supabase-schema.sql`) are reference blueprints; updating them does NOT execute migrations against live environments.
2. **Never Weaken RLS:**
   - Never use `USING (true)` or `WITH CHECK (true)` for user-scoped or sensitive tables.
   - All authorization policies must reference `auth.uid()`.
3. **Data Compatibility Analysis Before Constraints:**
   - Never apply `NOT NULL`, `FOREIGN KEY`, `CHECK`, or `UNIQUE` constraints to existing tables without first querying existing records for NULLs, orphans, or invalid values.
4. **Referential Integrity Discipline:**
   - When introducing foreign keys, explicitly declare `ON DELETE` rules (`CASCADE`, `SET NULL`, `RESTRICT`).
   - Never assume cascade deletion is safe without tracing associated media (e.g., UploadThing files) and counters.
5. **Atomic Multi-Step Operations via RPC:**
   - Business workflows spanning multiple tables (e.g., resolving a post and awarding an achievement) must be executed within transactional PostgreSQL functions (`CREATE FUNCTION ... LANGUAGE plpgsql`) rather than independent client-side queries.

---

## 3. Migration Review Checklist

Before writing or applying any migration:
- [ ] Migration is saved under `supabase/migrations/<timestamp>_<descriptive_name>.sql`.
- [ ] No destructive `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` operations are used.
- [ ] Existing data in target tables has been audited for constraint compatibility.
- [ ] RLS policies are explicitly defined for all four operations: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- [ ] Performance impact on existing query patterns evaluated; required indexes added.
- [ ] Realtime publication impact verified (`supabase_realtime` publication).
- [ ] Safe rollback / undo SQL commands documented in the migration comments.
