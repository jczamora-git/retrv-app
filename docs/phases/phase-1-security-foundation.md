# Phase 1 Specification — Security Foundation & Authorization Hardening

> **Status:** PLANNED / SPECIFIED (Not yet authorized for implementation).  
> **Authority:** Derived from [retrv-full-system-audit.md](../audits/retrv-full-system-audit.md) and [AGENTS.md](../../AGENTS.md).  
> **RULE:** This document defines the exact scope of Phase 1. Coding agents MUST NOT implement any item from this document until explicitly instructed.

---

## 1. Objective

Harden Retrv's security perimeter by eliminating critical P0/P1 data exposure vulnerabilities across Supabase Row Level Security, application credentials, and serverless API endpoints.

---

## 2. Included Scope (Phase 1 Target Deliverables)

1. **Row Level Security (RLS) Overhaul:**
   - Author a migration (`supabase/migrations/*_harden_rls.sql`) replacing all permissive `USING (true)` / `WITH CHECK (true)` policies with strict `auth.uid()` checks.
   - **Profiles:** Public users can read `id`, `name`, `username`, `avatar_url`, `created_at`. Only the profile owner (`auth.uid() = id`) can view `email`, `phone`, or update the profile.
   - **Conversations & Messages:** Only verified participants (`auth.uid() = ANY(participant_ids)`) may `SELECT` conversations and messages. Only sender (`auth.uid() = sender_id`) can `INSERT` messages.
   - **Notifications:** Only the target user (`auth.uid() = user_id`) may `SELECT`, `UPDATE` (mark read), or delete notifications.
   - **Push Tokens & Preferences:** Restricted exclusively to the authenticated owner (`auth.uid() = user_id`).
   - **Posts & Comments:** Public can `SELECT` open/resolved posts and comments. Only `author_id = auth.uid()` can `UPDATE` or `DELETE` their own posts/comments.
2. **Hardcoded Credential Scrubbing:**
   - Remove fallback Supabase project URL and anon key literals from `src/utils/supabase.ts`.
   - Remove hardcoded credentials from `.github/workflows/build-apk.yml`, replacing them with GitHub Secrets references.
   - Provide a `.env.example` template with clean placeholder variables.
3. **UploadThing Endpoint Hardening:**
   - Add Supabase JWT authentication to the middleware in `api/uploadthing.ts`.
   - Protect `/api/uploadthing/delete` by verifying that the requesting user owns the post, profile, or message referencing the file key.
4. **Development Auth Bypass Hardening:**
   - Ensure `VITE_DEV_BYPASS_AUTH` is strictly stripped out of production bundles (`vite.config.ts` define or tree-shaking guard).
5. **Security Regression Tests:**
   - Author multi-user test scripts validating that User A cannot read User B's private messages, notifications, or contact info.

---

## 3. Explicit Exclusions (Deferred to Future Phases)

The following areas are strictly **EXCLUDED** from Phase 1:
- Adding database foreign key constraints (`REFERENCES`) — *Deferred to Phase 2*.
- Post status constraint normalization (`claimed` vs `returned`) — *Deferred to Phase 2*.
- Atomic post resolution & merit awarding stored procedures (RPCs) — *Deferred to Phase 3*.
- Automated database triggers for push notifications — *Deferred to Phase 5*.
- Message and feed cursor pagination — *Deferred to Phase 6*.
- Comment threading persistence schema changes — *Deferred to Phase 8*.
- iOS platform configuration — *Deferred to Phase 8*.
