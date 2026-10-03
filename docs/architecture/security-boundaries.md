# Retrv — Security Boundaries & Trust Architecture

> **Security Posture Status:** Active audit indicates critical vulnerabilities due to open RLS policies and unverified client inputs.  
> **Rule:** All findings are documented as **CURRENT RISK** vs **PLANNED HARDENING**. No fix is claimed as completed until Phase 1 implementation.

---

## 1. System Trust Boundaries

```text
Untrusted Client Environment (Mobile Device / Web Browser)
══════════════════════════════════════════════════════════════════ [Boundary 1: Client Trust Boundary]
  │
  ├──► Supabase PostgREST & Auth ──► PostgreSQL Engine (RLS)
  │    [Boundary 2: Database RLS Boundary]
  │
  ├──► Vercel Serverless APIs (`api/`) ──► Firebase Admin / UploadThing
  │    [Boundary 3: Serverless API Boundary]
  │
  ├──► UploadThing Upload & Delete Endpoints
  │    [Boundary 4: Media Upload Boundary]
  │
  └──► Capacitor Native Plugins (Push, Status Bar, Settings)
       [Boundary 5: Native Device Boundary]
```

---

## 2. Boundary Analysis & Status Matrix

### Boundary 1: Browser & Client Trust Boundary
- **Description:** The boundary between the user's mobile device / browser and backend network endpoints.
- **CURRENT RISK:** The client currently executes sensitive operations directly against the database:
  - Client code inserts in-app notification rows for other users (`useNotifications.ts`).
  - Client code awards community merits (`useAchievements.ts`).
  - Client code marks posts resolved without server verification (`usePosts.ts`).
  - Development auth bypass (`VITE_DEV_BYPASS_AUTH`) allows synthetic sessions (`dev_` UIDs).
- **PLANNED HARDENING:**
  - Transition state-changing actions (Resolution, Merit Awarding) to PostgreSQL stored procedures (RPCs).
  - Strip development bypass authentication from production bundles.

### Boundary 2: Database & Row Level Security (RLS) Boundary
- **Description:** The PostgreSQL engine evaluating access rules on every SQL query.
- **CURRENT RISK:** **CRITICAL:** Every table in `supabase-schema.sql` (lines 176–220) currently has RLS enabled but uses permissive policies:
  - `USING (true)` and `WITH CHECK (true)` across all operations.
  - Any user can read, overwrite, or delete any record in `profiles`, `posts`, `comments`, `conversations`, `messages`, `notifications`, `push_tokens`, and `notification_preferences`.
  - Phone numbers and emails in `profiles` are readable by all users.
- **PLANNED HARDENING:**
  - Enforce `auth.uid()` based ownership policies across all tables.
  - Separate public profile fields from private contact data.
  - Restrict conversation and message read/write access strictly to verified participants.

### Boundary 3: Serverless API Boundary (`api/`)
- **Description:** Vercel functions for username resolution (`api/auth/resolve-username.ts`) and file uploads.
- **CURRENT RISK:** Username resolution endpoint returns user email without authentication, creating an account enumeration and privacy leak.
- **PLANNED HARDENING:**
  - Require valid Supabase Auth session tokens for internal API routes.
  - Redact private email addresses from public resolution responses.

### Boundary 4: UploadThing Media Boundary
- **Description:** File uploads and deletions for profile pictures, post photos, and chat attachments.
- **CURRENT RISK:**
  - Upload endpoints in `api/uploadthing.ts` accept arbitrary client headers without cryptographically verifying JWTs.
  - The file deletion endpoint `/api/uploadthing/delete` has zero authentication or ownership verification.
- **PLANNED HARDENING:**
  - Verify Supabase JWT inside UploadThing middleware.
  - Enforce that a user can only delete files linked to their own posts, profiles, or messages.

### Boundary 5: Native Device & FCM Boundary
- **Description:** Device token registration and native push notifications via Firebase Cloud Messaging.
- **CURRENT RISK:**
  - `push_tokens` table has permissive RLS, enabling device token enumeration.
  - Automatic invocation of the `send-push-notification` Edge Function from database triggers is not confirmed in source code.
- **PLANNED HARDENING:**
  - Strict RLS on `push_tokens` (`user_id = auth.uid()`).
  - Database webhook or trigger to reliably invoke Edge Function on new notification inserts.
