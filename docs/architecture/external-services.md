# Retrv — External Cloud Services & Integrations

> **Purpose:** Comprehensive inventory of external SaaS, cloud providers, and native toolchains used by Retrv. Never store secret credentials in this document.

---

## 1. Supabase (Primary Backend Platform)

- **Purpose:** Relational database, user authentication, WebSocket realtime event distribution, and serverless Edge Functions.
- **Client vs Server Usage:**
  - Client utilizes `@supabase/supabase-js` with the public Anon Key.
  - Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for administrative tasks (e.g., querying tokens and pushing alerts).
- **Credentials Boundary:**
  - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` (public client bundle).
  - `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions secret environment).
- **Failure Impact:** Total app failure (login fails, feed cannot load, messages cannot send).
- **Local Dev Considerations:** Supabase CLI local development environment (`supabase start`) can run isolated PostgreSQL instances.

---

## 2. UploadThing (Media Hosting & CDN)

- **Purpose:** Direct-to-cloud file uploads, image optimization, and global CDN delivery for avatars, post photos, and chat attachments.
- **Client vs Server Usage:**
  - Client uses `uploadthing/client` via `useImageUpload.ts`.
  - Serverless function `api/uploadthing.ts` handles presigned URL generation and file deletion via `UPLOADTHING_TOKEN`.
- **Credentials Boundary:** `UPLOADTHING_TOKEN` (server-side environment variable only).
- **Failure Impact:** Image uploads fail gracefully; text posts, messaging, and authentication remain operational.
- **Local Dev Considerations:** Requires mock storage or dev UploadThing app token.

---

## 3. Firebase & Firebase Cloud Messaging (FCM)

- **Purpose:** Native Android push notification delivery to user devices.
- **Client vs Server Usage:**
  - Android native shell integrates `google-services.json` and `@capacitor/push-notifications`.
  - Supabase Edge Function `send-push-notification` dispatches alerts via FCM HTTP v1 using Google Service Account credentials (`FCM_SERVICE_ACCOUNT_KEY`).
  - Legacy `server/src/firebaseAdmin.ts` uses Firebase Admin SDK.
- **Credentials Boundary:** `android/app/google-services.json` (native config), `FCM_SERVICE_ACCOUNT_KEY` (Edge Function secret).
- **Failure Impact:** Push notifications are not delivered; in-app notifications and feed updates continue functioning.

---

## 4. Vercel (Web Hosting & Serverless Compute)

- **Purpose:** Hosting the web SPA build and executing serverless endpoints in `api/`.
- **Client vs Server Usage:** Deploys `dist/` web artifacts; executes `api/uploadthing.ts` and `api/auth/resolve-username.ts`.
- **Credentials Boundary:** Environment variables configured in Vercel project dashboard.
- **Failure Impact:** Web client and UploadThing serverless endpoints become unavailable.

---

## 5. GitHub Actions (Continuous Integration & Native Builds)

- **Purpose:** Automated compilation of Android APKs and validation testing.
- **Workflow:** `.github/workflows/build-apk.yml`.
- **Credentials Boundary:** Repository secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, keystore signing secrets.
- **Failure Impact:** Automated APK artifact generation fails.

---

## 6. Capacitor & Android Native Toolchain

- **Purpose:** Native runtime bridge wrapping the web application into an installable Android APK.
- **Tooling:** Capacitor CLI, Gradle, Android SDK 36, Java 21.
- **Credentials Boundary:** Android keystore file (`.jks` / `.keystore`) for production release signing.
- **Failure Impact:** Native APK cannot be built or updated.
