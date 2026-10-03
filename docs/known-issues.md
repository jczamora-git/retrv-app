# Retrv — Known Issues & Vulnerability Register

> **Status:** All entries verified against active repository code (v2.5.0) and [retrv-full-system-audit.md](audits/retrv-full-system-audit.md).  
> **Rule:** Issues remain in status `OPEN` until the corresponding remediation phase is implemented and verified with concrete evidence.

---

## Issue Summary Matrix

| ID | Title | Area | Severity | Planned Phase | Status |
|---|---|---|---|---|---|
| **ISSUE-001** | Permissive RLS `USING (true)` across all tables | Security / Database | **P0 (Critical)** | Phase 1 | **OPEN** |
| **ISSUE-002** | Hardcoded Supabase Anon Key in source & CI | Security / Config | **P0 (Critical)** | Phase 1 | **OPEN** |
| **ISSUE-003** | UploadThing endpoints lack cryptographic auth | Security / Storage | **P1 (High)** | Phase 1 | **OPEN** |
| **ISSUE-004** | File deletion endpoint has zero authorization | Security / Storage | **P1 (High)** | Phase 1 | **OPEN** |
| **ISSUE-005** | No foreign key constraints in database schema | Database Integrity | **P1 (High)** | Phase 2 | **OPEN** |
| **ISSUE-006** | Post status mismatch (`claimed` vs `returned`) | Database Integrity | **P1 (High)** | Phase 2 | **OPEN** |
| **ISSUE-007** | Non-atomic post resolution & merit awarding | Workflow Integrity | **P1 (High)** | Phase 3 | **OPEN** |
| **ISSUE-008** | In-app notifications generated directly by client | Security / Workflow | **P1 (High)** | Phase 3 | **OPEN** |
| **ISSUE-009** | Achievements/merits inserted by client | Security / Workflow | **P1 (High)** | Phase 3 | **OPEN** |
| **ISSUE-010** | Global conversation realtime channel without filter | Realtime / Privacy | **P2 (Medium)** | Phase 4 | **OPEN** |
| **ISSUE-011** | Conversation query fetches all conversations globally | Performance / Privacy | **P2 (Medium)** | Phase 4 | **OPEN** |
| **ISSUE-012** | Read-modify-write race on `unread_counts` | Realtime / Chat | **P2 (Medium)** | Phase 4 | **OPEN** |
| **ISSUE-013** | Posts realtime channel never unsubscribed | Realtime / Memory | **P2 (Medium)** | Phase 4 | **OPEN** |
| **ISSUE-014** | Edge Function push trigger not codified in repo | Push Notifications | **P2 (Medium)** | Phase 5 | **OPEN** |
| **ISSUE-015** | Client-side-only post search with 50-item limit | Search / Performance | **P2 (Medium)** | Phase 6 | **OPEN** |
| **ISSUE-016** | Comment threading metadata not persisted to DB | Community / Schema | **P3 (Low)** | Phase 8 | **OPEN** |
| **ISSUE-017** | Coexistence of dead/legacy Express & Firebase code | Architecture Cleanup | **P3 (Low)** | Phase 8 | **OPEN** |
| **ISSUE-018** | Near-zero test coverage of critical workflows | Quality Assurance | **P1 (High)** | Phase 7 | **OPEN** |

---

## Detailed Issue Records

### ISSUE-001: Permissive RLS `USING (true)` across all tables
- **Area:** Supabase / Database Security
- **Severity:** P0 (Critical)
- **Current Behavior:** Every policy in `supabase-schema.sql` (lines 176–220) specifies `USING (true)` and `WITH CHECK (true)`.
- **Evidence:** `CREATE POLICY "Allow all operations for now" ON profiles FOR ALL USING (true);`
- **Risk:** Any anonymous or authenticated user can query, overwrite, or delete all records across all tables (including private messages and user phone/email).
- **Planned Phase:** Phase 1
- **Status:** OPEN

### ISSUE-002: Hardcoded Supabase Anon Key in source & CI
- **Area:** Secret Management
- **Severity:** P0 (Critical)
- **Current Behavior:** Fallback project URL and anon key are hardcoded in `src/utils/supabase.ts` and `.github/workflows/build-apk.yml`.
- **Evidence:** `const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...'`
- **Risk:** Public disclosure of API keys in repository source code and commit history.
- **Planned Phase:** Phase 1
- **Status:** OPEN

### ISSUE-003: UploadThing endpoints lack cryptographic auth
- **Area:** Storage Security
- **Severity:** P1 (High)
- **Current Behavior:** Middleware in `api/uploadthing.ts` inspects arbitrary client headers without validating JWT tokens against Supabase.
- **Evidence:** `const userId = devUid.replace(/^dev_/, '') || authHeader.replace(/^Bearer (dev_)?/, '') || 'anonymous_user';`
- **Risk:** Attackers can upload arbitrary media under forged user IDs.
- **Planned Phase:** Phase 1
- **Status:** OPEN

### ISSUE-004: File deletion endpoint has zero authorization
- **Area:** Storage Security
- **Severity:** P1 (High)
- **Current Behavior:** `/api/uploadthing/delete` accepts a `fileKey` and deletes the file with zero authentication or ownership check.
- **Evidence:** `api/uploadthing.ts` line 169 handles POST without auth check.
- **Risk:** Malicious users can delete other users' avatars and post images.
- **Planned Phase:** Phase 1
- **Status:** OPEN

### ISSUE-005: No foreign key constraints in database schema
- **Area:** Database Integrity
- **Severity:** P1 (High)
- **Current Behavior:** Schema has 11 tables with zero `REFERENCES` clauses.
- **Evidence:** `supabase-schema.sql` lines 1–170 define column relationships purely by naming convention (`author_id text`).
- **Risk:** Orphan records accumulate; deleting posts or users leaves orphaned comments and messages.
- **Planned Phase:** Phase 2
- **Status:** OPEN

### ISSUE-006: Post status mismatch (`claimed` vs `returned`)
- **Area:** Database Schema Integrity
- **Severity:** P1 (High)
- **Current Behavior:** Schema enforces `CHECK (status IN ('open', 'resolved', 'claimed'))`, while `useAchievements.ts` (line 341) assigns `'returned'`.
- **Evidence:** `supabase-schema.sql` line 31 vs `useAchievements.ts` line 341.
- **Risk:** Resolving a found post can fail with a PostgreSQL check constraint violation.
- **Planned Phase:** Phase 2
- **Status:** OPEN

### ISSUE-007: Non-atomic post resolution & merit awarding
- **Area:** Workflow Integrity
- **Severity:** P1 (High)
- **Current Behavior:** Post status update and achievement insertion occur as separate client-side queries.
- **Evidence:** `useAchievements.ts` lines 365–381.
- **Risk:** Network drop between calls leaves post unresolved or awards duplicate merit without updating post status.
- **Planned Phase:** Phase 3
- **Status:** OPEN

### ISSUE-008: In-app notifications generated directly by client
- **Area:** Security & Spam Prevention
- **Severity:** P1 (High)
- **Current Behavior:** Client code inserts directly into `notifications` table for other user IDs.
- **Evidence:** `useNotifications.ts` line 106.
- **Risk:** Any user can forge arbitrary notifications or spam other users.
- **Planned Phase:** Phase 3
- **Status:** OPEN

### ISSUE-009: Achievements/merits inserted by client
- **Area:** Security & Merit Integrity
- **Severity:** P1 (High)
- **Current Behavior:** Client code inserts into `achievements` table directly.
- **Evidence:** `useAchievements.ts` line 365.
- **Risk:** Users can forge API calls to grant themselves Community Hero badges.
- **Planned Phase:** Phase 3
- **Status:** OPEN

### ISSUE-010: Global conversation realtime channel without filter
- **Area:** Realtime Privacy
- **Severity:** P2 (Medium)
- **Current Behavior:** `useMessageUnread.ts` listens to all conversation changes globally and filters in memory.
- **Evidence:** `useMessageUnread.ts` lines 108–116.
- **Risk:** Unnecessary WebSocket traffic; potential leak of conversation metadata.
- **Planned Phase:** Phase 4
- **Status:** OPEN

### ISSUE-011: Conversation query fetches all conversations globally
- **Area:** Performance & Privacy
- **Severity:** P2 (Medium)
- **Current Behavior:** `chatService.ts` queries `conversations` with no participant filter.
- **Evidence:** `chatService.ts` lines 140–143.
- **Risk:** As conversation count grows, query returns unbounded rows.
- **Planned Phase:** Phase 4
- **Status:** OPEN

### ISSUE-012: Read-modify-write race on `unread_counts`
- **Area:** Realtime Chat
- **Severity:** P2 (Medium)
- **Current Behavior:** Updating unread counts fetches JSONB, modifies local object, and writes back.
- **Evidence:** `useMessageUnread.ts` lines 174–188.
- **Risk:** Concurrent messages cause unread count drift.
- **Planned Phase:** Phase 4
- **Status:** OPEN

### ISSUE-013: Posts realtime channel never unsubscribed
- **Area:** Realtime / Memory
- **Severity:** P2 (Medium)
- **Current Behavior:** `public:posts` channel in `usePosts.ts` persists indefinitely.
- **Evidence:** `usePosts.ts` lines 112–128.
- **Risk:** Memory leak and unnecessary background WebSocket traffic.
- **Planned Phase:** Phase 4
- **Status:** OPEN

### ISSUE-014: Edge Function push trigger not codified in repo
- **Area:** Push Notification Pipeline
- **Severity:** P2 (Medium)
- **Current Behavior:** Automated trigger from `notifications` table to `send-push-notification` Edge Function is not in codebase.
- **Evidence:** Absence of trigger SQL in `supabase-schema.sql`.
- **Risk:** Push notifications may not fire automatically without dashboard webhook.
- **Planned Phase:** Phase 5
- **Status:** OPEN

### ISSUE-015: Client-side-only post search with 50-item limit
- **Area:** Discovery & Search
- **Severity:** P2 (Medium)
- **Current Behavior:** `usePosts.ts` fetches up to 50 posts and filters in memory.
- **Evidence:** `usePosts.ts` lines 145–150.
- **Risk:** Items beyond the 50 most recent are unsearchable.
- **Planned Phase:** Phase 6
- **Status:** OPEN

### ISSUE-016: Comment threading metadata not persisted to DB
- **Area:** Community Discussion
- **Severity:** P3 (Low)
- **Current Behavior:** TypeScript interface defines `parentCommentId`, but database table lacks columns.
- **Evidence:** `PostComment` in `src/types/post.ts` vs `comments` table in `supabase-schema.sql`.
- **Risk:** Nested comment relationships cannot be reconstructed on page reload.
- **Planned Phase:** Phase 8
- **Status:** OPEN

### ISSUE-017: Coexistence of dead/legacy Express & Firebase code
- **Area:** Codebase Hygiene
- **Severity:** P3 (Low)
- **Current Behavior:** `server/` directory and `src/firebase.ts` coexist with Supabase.
- **Evidence:** `server/src/app.ts`, `src/firebase.ts`.
- **Risk:** Developer confusion regarding authoritative backend.
- **Planned Phase:** Phase 8
- **Status:** OPEN

### ISSUE-018: Near-zero test coverage of critical workflows
- **Area:** Testing & Quality
- **Severity:** P1 (High)
- **Current Behavior:** Only category normalization and filter functions have unit tests.
- **Evidence:** `tests/unit/` contains only 3 test files; 0 tests for Auth, Resolution, or Messaging.
- **Risk:** High regression risk during security and schema refactoring.
- **Planned Phase:** Phase 7
- **Status:** OPEN
