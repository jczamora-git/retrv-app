# Retrv — Engineering Invariants

> **Purpose:** Immutable project engineering rules. Every code modification must uphold these invariants.

---

## Invariant Catalog

### AUTH-001: Authoritative Database Identity
- **Rule:** Database authorization MUST be derived from `auth.uid()`, never from client-supplied request body fields.
- **Reason:** Client request bodies can be freely forged by malicious actors.
- **Enforcement Layer:** PostgreSQL Row Level Security (RLS) & Supabase Auth JWT.
- **Current Status:** TARGET INVARIANT (Active RLS currently uses `USING (true)`).

### MSG-001: Conversation Participant Isolation
- **Rule:** Only verified conversation participants may access or query private conversations and their messages.
- **Reason:** Private chat messages contain sensitive personal communication and meeting arrangements.
- **Enforcement Layer:** PostgreSQL RLS (`auth.uid() = ANY(participant_ids)`).
- **Current Status:** TARGET INVARIANT (Planned for Phase 1).

### MSG-002: Message Sender Authenticity
- **Rule:** A message's `sender_id` MUST match `auth.uid()`.
- **Reason:** Prevents users from forging messages on behalf of other members.
- **Enforcement Layer:** PostgreSQL RLS `WITH CHECK (sender_id = auth.uid())`.
- **Current Status:** TARGET INVARIANT (Planned for Phase 1).

### POST-001: Post Ownership Integrity
- **Rule:** Only the authenticated author of a post may edit, delete, or mark the post as resolved.
- **Reason:** Prevents unauthorized tampering with community lost and found reports.
- **Enforcement Layer:** PostgreSQL RLS (`author_id = auth.uid()`).
- **Current Status:** TARGET INVARIANT (Currently enforced only in client JavaScript).

### RES-001: Atomic Resolution & Single Merit Award
- **Rule:** Exactly one Community Merit achievement may be granted per post resolution, and resolution must be atomic.
- **Reason:** Prevents duplicate badge exploits and partial database updates.
- **Enforcement Layer:** PostgreSQL Stored Procedure / RPC (`resolve_post_and_award_merit`).
- **Current Status:** TARGET INVARIANT (Planned for Phase 3).

### RES-002: No Self-Awarding
- **Rule:** A post author cannot award Community Merit to their own user account.
- **Reason:** Prevents self-farming of community trust badges.
- **Enforcement Layer:** PostgreSQL constraint / RPC check (`recipient_id <> author_id`).
- **Current Status:** CURRENTLY ENFORCED IN CLIENT ONLY (Must be server-enforced in Phase 3).

### NOTIF-001: Private Notification Isolation
- **Rule:** Users may only read, update read status, or delete their own notification records.
- **Reason:** Notifications reveal private interactions, comments, and direct messages.
- **Enforcement Layer:** PostgreSQL RLS (`user_id = auth.uid()`).
- **Current Status:** TARGET INVARIANT (Planned for Phase 1).

### PUSH-001: Push Token Privacy
- **Rule:** Push tokens are private to their owning user and the trusted notification backend.
- **Reason:** Token exposure allows unauthorized external parties to dispatch push spam to user devices.
- **Enforcement Layer:** PostgreSQL RLS (`user_id = auth.uid()`).
- **Current Status:** TARGET INVARIANT (Planned for Phase 1).

### MEDIA-001: Authorized Media Deletion
- **Rule:** Knowing an UploadThing file key does not grant authorization to delete it.
- **Reason:** Prevents attackers from deleting images uploaded by other users.
- **Enforcement Layer:** Vercel Serverless Function (`api/uploadthing.ts`).
- **Current Status:** TARGET INVARIANT (Planned for Phase 1).

### DB-001: Migration-Only Schema Alterations
- **Rule:** All database schema, constraint, index, and RLS changes must be committed as versioned migration scripts in `supabase/migrations/`.
- **Reason:** Prevents undocumented schema drift between environments and enables rollbacks.
- **Enforcement Layer:** Repository code review & CI deployment pipeline.
- **Current Status:** ACTIVE INVARIANT.

### DB-002: Existing Data Audit Before Constraints
- **Rule:** Existing records must be audited for compatibility before applying `NOT NULL`, `FOREIGN KEY`, or `CHECK` constraints.
- **Reason:** Prevents migration failures and database locks in staging/production environments.
- **Enforcement Layer:** Migration authoring checklist (`retrv-supabase` skill).
- **Current Status:** ACTIVE INVARIANT.

### QA-001: Absolute Verification Claim Integrity
- **Rule:** A test, build, or check that was not run MUST NEVER be reported as passing.
- **Reason:** Prevents false confidence and premature release qualification.
- **Enforcement Layer:** Agent operating rules (`AGENTS.md`).
- **Current Status:** ACTIVE INVARIANT.

### PHASE-001: Strict Phase Boundary Discipline
- **Rule:** Coding agents MUST stop at the requested phase boundary and await user review.
- **Reason:** Prevents scope creep, uncoordinated refactoring, and compounding errors.
- **Enforcement Layer:** Agent operating rules (`AGENTS.md`).
- **Current Status:** ACTIVE INVARIANT.
