# Retrv — Legacy & Transitional Systems Register

> **CRITICAL RULE:** Do NOT delete or casually remove any system listed in this document without explicit user authorization and completion of all documented prerequisites.

---

## 1. Firebase Realtime Database (RTDB) & Client SDK

- **Location:** `src/firebase.ts`, `database.rules.json`, `storage.rules`.
- **Current Usage:** Firebase client is initialized in `src/firebase.ts` with web config, but primary operational data has migrated to Supabase.
- **Consumers:** Legacy imports, `server/src/firebaseAdmin.ts`.
- **Risk of Removal:** High risk of breaking legacy username resolution or server-side admin endpoints.
- **Primary Modern System:** Supabase PostgreSQL & Supabase Realtime.
- **Removal Prerequisites:**
  1. Migrate username resolution endpoint (`api/auth/resolve-username.ts`) entirely to Supabase.
  2. Verify no remaining client imports of `src/firebase.ts`.

---

## 2. Express Node.js Server (`server/`)

- **Location:** `server/src/app.ts`, `server/src/storage.ts`, `server/src/firebaseAdmin.ts`.
- **Current Usage:** Standalone Express server initially used for local backend development and file-based JSON storage.
- **Consumers:** Local development scripts (`package.json` dev server).
- **Risk of Removal:** Low risk to Vercel production deployment, but potential disruption to local offline dev workflows.
- **Primary Modern System:** Vercel Serverless Functions (`api/`) & Supabase Edge Functions.
- **Removal Prerequisites:** Verify all local developer workflows run via Vite dev server and direct Supabase client.

---

## 3. Development Chat Storage (`devChatStorage.ts`)

- **Location:** `src/services/devChatStorage.ts`.
- **Current Usage:** In-memory and `localStorage` mock chat storage used when `VITE_DEV_BYPASS_AUTH=true` is enabled.
- **Consumers:** `src/composables/useChat.ts`, `src/services/chatService.ts`.
- **Risk of Removal:** Breaks offline dev bypass testing when developer does not have Supabase credentials.
- **Primary Modern System:** Supabase PostgreSQL `messages` table.
- **Removal Prerequisites:** Transition local development to run against a local Supabase CLI instance (`supabase start`).

---

## 4. `lost_found` Database Table

- **Location:** `supabase-schema.sql` (lines 149–165).
- **Current Usage:** Initial single-table schema implementation from early prototypes.
- **Consumers:** Unused in active v2.5.0 Vue composables (superseded by `posts`).
- **Risk of Removal:** Low risk to application code; medium risk if historical data resides in remote production database.
- **Primary Modern System:** `posts` table.
- **Removal Prerequisites:** Confirm no historical records exist in production database before executing a DROP migration.

---

## 5. Legacy Naming & Aliases (`isRealFirebaseUser`)

- **Location:** `src/composables/useAuth.ts` (line 427).
- **Current Usage:** Exported alias `export const isRealFirebaseUser = isRealSupabaseUser`.
- **Consumers:** Legacy components checking auth state.
- **Risk of Removal:** Compilation error if any uninspected view imports `isRealFirebaseUser`.
- **Primary Modern System:** `isRealSupabaseUser`.
- **Removal Prerequisites:** Global grep across all `.vue` and `.ts` files to replace usages before removing the export.
