# Retrv — Naming & Code Style Conventions

> **Purpose:** Document established project naming, structure, and style conventions across the Retrv codebase.

---

## 1. File & Component Naming

| Layer | Convention | Example | Notes |
|---|---|---|---|
| **Page Views** | PascalCase with `Page` suffix | `HomePage.vue`, `ChatPage.vue` | Located in `src/views/` |
| **Components** | PascalCase | `PostCard.vue`, `SearchModal.vue` | Located in `src/components/` |
| **Composables** | camelCase with `use` prefix | `useAuth.ts`, `usePosts.ts` | Located in `src/composables/` |
| **Services** | camelCase with `Service` suffix | `chatService.ts`, `pushNotificationService.ts` | Located in `src/services/` |
| **Domain Types** | camelCase / PascalCase | `post.ts`, `user.ts`, `notification.ts` | Located in `src/types/` |
| **Database Migrations**| `<YYYYMMDDHHMMSS>_<snake_case>.sql` | `20261003180000_secure_rls.sql` | Located in `supabase/migrations/` |

---

## 2. Database & API Conventions

- **Database Tables:** `snake_case`, pluralized (e.g., `profiles`, `posts`, `comments`, `conversations`, `messages`, `notifications`, `push_tokens`, `achievements`).
- **Database Columns:** `snake_case` (e.g., `author_id`, `created_at`, `client_request_id`, `is_read`, `avatar_url`).
- **TypeScript Interfaces:** PascalCase with descriptive names matching database tables (e.g., `Post`, `UserProfile`, `PostComment`, `DirectMessage`).
- **Environment Variables:**
  - Client-exposed variables MUST use the `VITE_` prefix (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
  - Private/server-only variables MUST NOT have `VITE_` (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `UPLOADTHING_TOKEN`, `FCM_SERVICE_ACCOUNT_KEY`).

---

## 3. Router & Navigation Conventions

- **Path Naming:** Lowercase kebab-case (e.g., `/tabs/home`, `/edit-post/:id`, `/chat/:conversationId`, `/settings/notifications`).
- **Route Names:** PascalCase matching the view intent (e.g., `Home`, `PostDetails`, `Chat`, `Profile`).

---

## 4. Documentation & Reporting Conventions

- **Phase Reports:** `docs/reports/phase-<N>-<name>-report.md`.
- **Architecture Decision Records:** `docs/decisions/<NNNN>-<decision-title>.md`.
- **Audit Documents:** `docs/audits/<name>.md`.
