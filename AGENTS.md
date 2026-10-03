# AGENTS.md — Retrv Engineering & Agent Operating Rules

> **CRITICAL DIRECTIVE FOR ALL CODING AGENTS**  
> This file is the primary contract and operational harness for all AI-assisted engineering on the **Retrv** repository. Every agent session MUST read and adhere strictly to the rules, invariants, and boundaries detailed herein before reading or modifying code.

---

## 1. Project Identity

- **Project:** Retrv (`retrv-app`, v2.5.0)
- **Product:** Community-powered Lost & Found mobile platform connecting people to report, discover, and recover lost belongings through collective participation.
- **Primary Client:** Ionic Vue (Vue 3) + TypeScript + Vite (`src/`)
- **Native Mobile Runtime:** Capacitor (Android) (`android/`, `capacitor.config.ts`)
- **Primary Backend & Database:** Supabase (Hosted PostgreSQL) (`supabase/`, `supabase-schema.sql`)
- **Realtime Layer:** Supabase Realtime (WebSockets channels)
- **Push Notification Delivery:** Firebase Cloud Messaging (FCM HTTP v1 + legacy fallback) via Supabase Edge Function (`supabase/functions/send-push-notification/`)
- **Media & File Storage:** UploadThing (`api/uploadthing.ts`, `src/composables/useImageUpload.ts`)
- **Serverless API Layer:** Vercel Functions (`api/`)
- **Legacy Transitional Subsystems:** Express server (`server/`) and Firebase Realtime Database (`src/firebase.ts`, `database.rules.json`)

### Core Domain Lifecycle
```text
Report (Lost/Found Post)
    ↓
Community Discussion (Public Comments & Replies)
    ↓
Private Coordination (Direct Conversations & Media)
    ↓
Resolution (Post Marked Resolved / Returned)
    ↓
Merit & Recognition (Community Merit Badge / Achievements)
```

---

## 2. Source of Truth & Precedence

When encountering discrepancies between documents, schemas, and code, apply the following strict hierarchy:

1. **Current Active Source Code** (`src/`, `api/`, `supabase/functions/`, `android/`)
2. **Current Applied Database Migrations & Live Schema** (`supabase/migrations/`, `supabase-schema.sql`)
3. **Root Agent Harness (`AGENTS.md`)**
4. **Specialized Agent Skills** (`.agents/skills/*/SKILL.md`)
5. **Authoritative Architecture Documentation** (`docs/architecture/`, `docs/engineering-invariants.md`)
6. **Latest System Audit / Verification Reports** (`docs/audits/retrv-full-system-audit.md`, `docs/reports/`)
7. **Legacy Documentation & General Markdown** (`README.md`, `policies/`)

> [!IMPORTANT]
> **Documentation Drift Rule:** Documentation MUST NOT override active source code when a conflict is found. Agents must report documentation drift explicitly in their final report rather than silently assuming either code or documentation is universally correct.

---

## 3. Mandatory Preflight Inspection

Before implementing any non-trivial change, every agent MUST inspect:
1. `AGENTS.md` (this document)
2. The relevant specialized `.agents/skills/<skill-name>/SKILL.md`
3. The exact target source files and their immediate callers/importers
4. Active database schemas (`supabase-schema.sql` and `supabase/migrations/`)
5. Relevant domain architecture guides in `docs/architecture/`
6. Known issues register in `docs/known-issues.md`
7. Existing automated tests in `tests/unit/` or `cypress/`

**You must thoroughly understand existing behavior before editing any code.**

---

## 4. Scope Discipline & Anti-Scope-Creep Rules

1. **Implement ONLY the explicitly requested phase or task.**
2. **Do NOT combine unrelated refactors** with bug fixes or security changes.
3. **Do NOT redesign architecture** unless explicitly tasked with an architectural refactor.
4. **Do NOT add new dependencies** to `package.json` without user approval and justification.
5. **Do NOT rename unrelated files** or restructure directories arbitrarily.
6. **Do NOT alter UI layouts, styles, or copy** while implementing backend, database, or security tasks unless required.
7. **Do NOT delete or purge legacy systems** (e.g., Express server, Firebase client) unless the task specifically authorizes deprecation/removal.
8. **Do NOT silently expand database migrations** beyond the precise tables/columns targeted by the task.

---

## 5. No Blind Fixing

Agents MUST NOT:
- See a linter warning or TypeScript error and rewrite entire subsystems.
- See a large file (e.g., `useAuth.ts`) and automatically split it into pieces without an explicit task.
- See legacy code (e.g., `server/src/app.ts`, `src/firebase.ts`) and delete it.
- See a permissive RLS policy and guess business rules without checking `docs/engineering-invariants.md` and Phase 1 specifications.
- See a schema mismatch and mutate the database without checking data compatibility and writing an incremental migration file.

**Always trace callers, data consumers, and cross-domain consequences first.**

---

## 6. Security Invariants

### Authentication Authority
- **Supabase Auth is the sole authoritative identity provider.**
- `auth.uid()` in PostgreSQL is the authoritative security principal for all Row Level Security and database functions.
- **Client-supplied identity fields are NEVER trusted.** Never rely on `author_id`, `sender_id`, or `user_id` passed in JSON payloads without verifying it matches `auth.uid()`.

### Authorization Boundaries
- **UI checks are NOT security.** Hidden buttons, disabled inputs, Vue `v-if="isAuthor"`, and client-side route guards are user conveniences only.
- All authorization decisions MUST be strictly enforced by:
  1. PostgreSQL Row Level Security (RLS)
  2. Database constraints and triggers
  3. Trusted backend functions (Supabase Edge Functions / Vercel serverless endpoints with service role validation)

### Sensitive Data Classification
The following data domains are strictly private and MUST NOT be exposed to unauthorized users:
- Direct messages and message attachments
- Conversation metadata and participant rosters
- User phone numbers and email addresses in profiles
- Push notification device tokens (`push_tokens`)
- User notification preferences (`notification_preferences`)
- Internal notification payloads
- Session tokens, refresh tokens, and private API keys
- Exact physical handoff addresses or sensitive meeting notes

### Trusted Operations Boundary
The following operations MUST NOT execute purely via untrusted browser client inserts:
- Post resolution state transitions (`status = 'resolved' | 'returned'`)
- Community Merit awarding (`achievements` table inserts)
- In-app notification creation targeting other users
- Account deletion and profile ownership transfer

---

## 7. Database & Supabase Rules

### Migration-Only Workflow
- **All database changes must be encapsulated in timestamped SQL files within `supabase/migrations/`.**
- Never execute manual ad-hoc SQL against staging/production environments as a primary solution.
- Editing a baseline file like `supabase-schema.sql` does NOT apply changes to running databases; a formal migration is always required.

### Non-Destructive Operations by Default
Agents MUST NOT run destructive database actions:
- `supabase db reset` against any non-local/remote environment
- `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE`
- Deleting test/user data without explicit user direction
- Reseeding production or staging databases

### Existing Data Compatibility First
Before applying:
- `NOT NULL` constraints
- Foreign key constraints (`REFERENCES`)
- `UNIQUE` constraints
- `CHECK` constraints
- Data type changes or column renames

You MUST analyze existing data for non-conforming rows, NULLs, or orphan records and design a safe backfill or cleanup strategy.

### Referential Integrity Invariants
When adding foreign keys, agents must explicitly specify:
- `ON DELETE` behavior (`CASCADE`, `SET NULL`, or `RESTRICT`)
- Nullability semantics
- Orphan cleanup strategy for pre-existing records

### Row Level Security (RLS) Policy Discipline
- **Every table containing user data MUST have RLS enabled.**
- Every table MUST define explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- **NEVER use `USING (true)` or `WITH CHECK (true)`** for user-scoped or sensitive tables.

---

## 8. Realtime Rules

When implementing or modifying Supabase Realtime channels:
1. **Subscription Cleanup:** Every channel created in a component or composable MUST be unsubscribed and removed when the scope unmounts (`onUnmounted`).
2. **Channel Scoping:** Never subscribe globally to an entire table (e.g., all conversations across all users) if a user-scoped filter (`filter: 'user_id=eq.' + uid`) is available.
3. **No Client-Only Privacy Filtering:** Never rely on client-side JavaScript (`records.filter(r => r.userId === me)`) to prevent private realtime events from reaching unauthorized clients. Security filtering must happen at the database RLS layer.
4. **Lifecycle & Reconnection:** Account for device backgrounding, app resumption, and network disconnects gracefully.

---

## 9. Messaging Invariants

- **Private Conversations:** Only explicit conversation participants (`participant_ids`) may query a conversation or its messages.
- **Message Authenticity:** A message's `sender_id` MUST equal `auth.uid()`.
- **Targeted Realtime:** Users must only receive realtime message notifications for conversations where they are an active participant.
- **Atomic Unread Management:** Read status and unread counters must be managed atomically to avoid race conditions during concurrent multi-device access.

---

## 10. Lost & Found Domain Invariants

- **Single Author Ownership:** A Lost & Found post has exactly one author (`author_id`).
- **Separation of Concerns:** Post `type` (`'lost'` vs `'found'`) and `status` (`'open'`, `'resolved'`, `'claimed'`, `'returned'`) are separate domain attributes.
- **Resolution Legitimacy:** Only the authenticated author of a post may mark it resolved.
- **No Self-Awarding:** Post authors cannot award Community Merit to themselves.
- **Merit Duplication Guard:** Exactly one Community Merit achievement may be granted per post resolution.
- **Known Schema Discrepancy:** The database schema currently enforces `CHECK (status IN ('open', 'resolved', 'claimed'))`, whereas the frontend TypeScript type uses `'returned'`. Do NOT silently patch this without consulting Phase 2 database integrity specifications.

---

## 11. Media & Upload Rules (UploadThing)

- **Upload Authentication:** All upload endpoints (`api/uploadthing.ts`) must authenticate the user session using verified credentials, not unverified client header claims.
- **Deletion Authorization:** Deleting an uploaded image (`/api/uploadthing/delete`) MUST verify that the requesting user owns the associated post, profile, or message. Possession of a file key alone is NOT proof of ownership.
- **Strict Size and Mime Limits:** Respect upload constraints (e.g., avatar 4MB, post photos 8MB, chat images 5MB).

---

## 12. Push Notification Pipeline Rules

The notification architecture consists of two decoupled stages:
```text
Application Event
    ↓
Database Notification Record (`notifications` table)
    ↓
Recipient Preference & Push Token Lookup
    ↓
Supabase Edge Function (`send-push-notification`)
    ↓
Firebase Cloud Messaging (FCM HTTP v1)
    ↓
Physical Mobile Device
```
- **Verification Rule:** A test confirming a row was added to `notifications` does NOT prove that an FCM push was delivered to a mobile device. Both stages must be validated.
- **Dead Token Cleanup:** Expired or unregistered FCM tokens returned by Google must be pruned from `push_tokens`.

---

## 13. Development Authentication Rules

- `VITE_DEV_BYPASS_AUTH` is strictly a local development tool.
- Development auth sessions (`dev_` prefix) must NEVER be permissible in production builds or CI artifacts.
- Future security updates must ensure production Vite builds completely exclude dev bypass code paths.

---

## 14. Validation Requirements

Before reporting any task complete, agents MUST run applicable checks and report concrete results:

| Validation Type | Command / Method | Requirement |
|---|---|---|
| **Typecheck** | `npm run build` or `npx vue-tsc --noEmit` | Must exit 0 with 0 errors |
| **Lint** | `npm run lint` | Must exit 0 |
| **Unit Tests** | `npm run test:unit -- --run` | All unit tests must pass |
| **E2E Tests** | `npm run test:e2e` (when applicable) | Document result |
| **Git Diff Check** | `git diff --check` | No whitespace or syntax errors |

### Reporting Verification Statuses
Agents must use unambiguous statuses:
- **PASS**: Directly run, verified with actual command exit code 0 or interactive proof.
- **FAIL**: Run and failed; command output captured.
- **NOT RUN**: Not executed during this session (provide rationale).
- **BLOCKED**: Cannot run due to external dependency, missing credentials, or environment constraint.
- **NOT APPLICABLE**: Irrelevant to the change made.

---

## 15. Cross-Domain Change Rule

Any change affecting one of the following primary domains MUST explicitly list and review all potentially affected downstream domains before implementing code:
- **Authentication / Profiles**
- **Lost & Found Posts**
- **Resolution & Merit Awarding**
- **Private Messaging**
- **In-App / Push Notifications**
- **Media Uploads**
- **Database Schema & RLS**

*Example:* Modifying post resolution affects `posts`, `achievements`, `notifications`, `useProfile`, `useMessageUnread`, realtime channels, and RLS policies.

---

## 16. Desktop Web Architecture Guardrails

For any task touching:
- `DesktopWebShell.vue`
- `DesktopHeader.vue`
- `DesktopNavSidebar.vue`
- `DesktopContextRail.vue`
- `TabsPage.vue`
- `src/router/index.ts`
- Any desktop page view (`src/views/desktop/Desktop*Page.vue`)
- Any new desktop feature (`>= 1200px`)

Agents **MUST READ FIRST**:
1. [docs/desktop/DESKTOP-SHELL.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-SHELL.md)
2. [docs/desktop/DESKTOP-ROUTES.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-ROUTES.md)
3. [docs/desktop/DESKTOP-PAGES.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-PAGES.md)
4. [docs/desktop/DESKTOP-CHECKLIST.md](file:///c:/Users/JC%20Zamora/Documents/retrv-app/docs/desktop/DESKTOP-CHECKLIST.md)

### Core Desktop Invariants:
1. **Single Canonical Sidebar:** Never recreate `DesktopNavSidebar.vue`. Exactly ONE canonical sidebar exists.
2. **Visible by Default:** `DesktopNavSidebar` MUST remain visible by default across all desktop routes. Only explicit routes (Messages, Profile) opt out.
3. **Boolean Prop Defaults:** In Vue 3, any boolean prop controlling visibility (`showSidebar?: boolean`) must explicitly specify `default: true` in `withDefaults`.
4. **Pure Vue Desktop Views:** Desktop pages (`src/views/desktop/`) must use standard semantic HTML/Vue and MUST NOT be wrapped in Ionic layout primitives (`IonPage`, `IonContent`, `IonTabs`).
5. **No `/tabs/` Navigations:** Active app navigation must use clean canonical named routes (`router.push({ name: "Home" })`). `/tabs/...` routes are legacy redirects only.
6. **No Layout Hacks:** Never mask missing sidebar regressions with compensatory `margin-left` or fake column hacks.

---

## 17. Agent Stop Conditions

An agent MUST stop, make no destructive edits, and ask for user clarification when:
1. Active database schema differs materially from documentation.
2. A requested change requires deleting or truncating existing database records.
3. A security invariant conflicts directly with a requested convenience feature.
4. Production/service-role secrets are found exposed or missing.
5. Proposed database constraints violate existing stored records.
6. The requested task crosses beyond the scope of the assigned Phase.

---

## 18. No Automatic Phase Advancement

- **Completing Phase 0 does NOT authorize starting Phase 1.**
- **Completing Phase 1 does NOT authorize starting Phase 2.**
- At the end of every task or phase, the agent must stop, document results in `docs/reports/`, report findings to the user, and wait for the next instruction.
