# Retrv — Production Release Readiness Checklist

> **Purpose:** Authoritative qualification checklist for public mobile deployment.  
> **Rule:** Do NOT mark any item as READY without concrete, reproducible verification evidence.

---

## Qualification Status Legend
- **READY:** Confirmed implemented, tested, and verified with concrete evidence.
- **NOT READY:** Known gaps, vulnerabilities, or missing implementations.
- **NEEDS VERIFICATION:** Implemented but requires live runtime or on-device validation.
- **NOT APPLICABLE:** Irrelevant to the current release milestone.

---

## 1. Security & Authorization Checklist

| Item | Status | Verification Evidence / Current Deficit |
|---|---|---|
| PostgreSQL RLS Hardening | **NOT READY** | All tables in `supabase-schema.sql` currently use permissive `USING (true)`. |
| Private Profile Data Protection | **NOT READY** | Phone numbers and emails readable by all users via `profiles` query. |
| Hardcoded Credentials Scrubbed | **NOT READY** | Fallback Supabase Anon Key hardcoded in `supabase.ts` and `build-apk.yml`. |
| Media Upload Auth Verification | **NOT READY** | UploadThing endpoints accept unverified client headers. |
| Media Deletion Auth Verification | **NOT READY** | `/api/uploadthing/delete` accepts file key with zero auth check. |
| Development Bypass Disabled | **NOT READY** | `VITE_DEV_BYPASS_AUTH` compiled into client bundle. |
| Push Token Access Isolation | **NOT READY** | `push_tokens` table lacks user-scoped RLS policies. |

---

## 2. Database Integrity Checklist

| Item | Status | Verification Evidence / Current Deficit |
|---|---|---|
| Foreign Key Referential Integrity | **NOT READY** | No foreign keys (`REFERENCES`) defined anywhere in schema. |
| Post Status Constraint Alignment | **NOT READY** | Schema CHECK allows `claimed`; frontend uses `'returned'`. |
| Database Migration History | **NOT READY** | Baseline schema is an unversioned `.sql` file without formal migration history. |
| Comment Threading Schema | **NOT READY** | `parent_comment_id` missing from `comments` table. |

---

## 3. Workflows & Integrations Checklist

| Item | Status | Verification Evidence / Current Deficit |
|---|---|---|
| Atomic Post Resolution & Merit | **NOT READY** | Multi-table mutations are non-atomic and execute from browser. |
| In-App Notification System | **READY** | Realtime in-app notification inbox functional. |
| End-to-End FCM Push Delivery | **NEEDS VERIFICATION** | Edge Function implemented, but automatic DB trigger requires live verification. |
| UploadThing Media Pipeline | **READY** | Image uploads for avatars, posts, and chat attachments functional. |
| Dynamic Custom Subcategories | **READY** | Category filter bar and custom subcategory upserts functional. |

---

## 4. Mobile Runtime & Android Build Checklist

| Item | Status | Verification Evidence / Current Deficit |
|---|---|---|
| Android APK Build Compilation | **READY** | GitHub Actions workflow compiles debug and release APKs. |
| Release Keystore & App Signing | **NEEDS VERIFICATION** | Requires production keystore configuration in CI secrets. |
| On-Device Push Alert Receipt | **NEEDS VERIFICATION** | Requires testing on a physical Android 13+ device. |
| Android Back Button Handling | **NEEDS VERIFICATION** | Requires validation across nested modals and chat views. |
| Dark / Light Theme & Status Bar | **READY** | Theme initializes before mount; `@capacitor/status-bar` integrated. |

---

## 5. Testing & Quality Assurance Checklist

| Item | Status | Verification Evidence / Current Deficit |
|---|---|---|
| TypeScript Typecheck (`vue-tsc`) | **READY** | `npm run build` exits 0 with 0 type errors. |
| ESLint Code Quality | **READY** | `npm run lint` exits 0 with 0 errors. |
| Critical Workflow Unit Tests | **NOT READY** | Automated tests for auth, resolution, and chat are missing. |
| Multi-User RLS Automated Tests | **NOT READY** | No automated tests verifying database authorization boundaries. |
| End-to-End Browser Journeys | **NOT READY** | Cypress tests need completion. |
