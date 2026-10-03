# Retrv — Database Migration & Schema Safety Policy

> **CRITICAL POLICY:** Database integrity is paramount. Improper migrations cause permanent data loss and catastrophic service interruptions. All database modifications must strictly follow this policy.

---

## 1. Migration File Conventions

All database changes must be recorded as timestamped SQL files within:
```text
supabase/migrations/<YYYYMMDDHHMMSS>_<descriptive_snake_case_name>.sql
```
*Example:* `supabase/migrations/20261003180000_harden_profiles_rls.sql`

---

## 2. Inviolable Migration Invariants

1. **Strictly Prohibited Operations:**
   - **NO Manual Production Edits:** Never run ad-hoc `ALTER TABLE` or `CREATE POLICY` directly via database dashboard tools without a corresponding migration file.
   - **NO Destructive Resets:** Never run `supabase db reset` against staging or production environments.
   - **NO Silent Data Deletion:** Never execute `DROP TABLE`, `TRUNCATE`, or destructive `DELETE` queries as part of a routine migration.
   - **NO Retroactive Migration Edits:** Once a migration file has been merged or applied to remote environments, it MUST NOT be modified. Always author a new additive migration.
2. **Existing Data Pre-Check:**
   - Before adding `NOT NULL`, check for existing `NULL` rows: `SELECT COUNT(*) FROM table WHERE col IS NULL;`.
   - Before adding a `FOREIGN KEY`, check for orphan records: `SELECT COUNT(*) FROM posts WHERE author_id NOT IN (SELECT id FROM profiles);`.
   - If non-conforming data exists, the migration must include a safe backfill or cleanup strategy.
3. **Additive-First Strategy:**
   - When renaming columns, add the new column first, mirror data, update consumers, and deprecate the old column in a subsequent phase.
4. **Rollback Script Requirement:**
   - Every migration file must document the corresponding reverse/down SQL steps in header comments to facilitate rapid rollback in case of deployment issues.

---

## 3. Migration Review & Verification Flow

```text
Draft SQL Migration in supabase/migrations/
    ↓
Analyze Constraints against Existing Database Records
    ↓
Verify Local Schema Migration via Supabase CLI (`supabase db reset` locally)
    ↓
Validate Affected RLS Policies with Multi-User Test Queries
    ↓
Verify Application TypeScript Types & Supabase Queries
    ↓
Commit Migration & Document in Change Report
```
