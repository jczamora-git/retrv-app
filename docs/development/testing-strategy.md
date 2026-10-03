# Retrv — Testing Strategy & Verification Architecture

> **Current Test Reality:** Vitest and Cypress test runners are installed, but automated test coverage across business-critical workflows (Auth, Resolution, Messaging, RLS) is currently near zero.  
> **Rule:** Never claim a test passed unless it was executed with concrete terminal evidence.

---

## 1. Test Harness Overview

| Test Type | Runner / Tool | Script Command | Target Directory / Scope | Current Coverage Status |
|---|---|---|---|---|
| **Type Check** | `vue-tsc` | `npm run build` or `npx vue-tsc --noEmit` | Whole repository (`src/`) | Active & passing |
| **Linter** | ESLint | `npm run lint` | Whole repository | Active & passing |
| **Unit Tests** | Vitest (`vitest: ^4.0.0`) | `npm run test:unit -- --run` | `tests/unit/` | Limited (only categories/filters) |
| **E2E Tests** | Cypress (`cypress: ^13.5.0`)| `npm run test:e2e` | `cypress/` | Scaffolding only |
| **Native QA** | Android Emulator / Physical Device | Gradle / `adb` | `android/` | Manual verification |

---

## 2. Target Testing Layers & Verification Scope

1. **Unit Testing (Vitest):** Validate pure functions, category normalization, state composables, and error parsers.
2. **Database & RLS Integration Tests:** Validate that User A cannot read, insert, update, or delete User B's private messages, conversations, phone numbers, or push tokens.
3. **Domain Workflow Integration Tests:** Test multi-step business transactions:
   - Post creation with image upload.
   - Post resolution with helper selection and merit badge granting.
   - Idempotent deduplication via `client_request_id`.
4. **End-to-End Tests (Cypress):** Exercise full user journeys through the browser UI: registration, feed browsing, opening chat, and post editing.
5. **Native Android QA:** Physical device verification of push notifications, camera permissions, status bar styling, and back-button behavior.

---

## 3. Domain Change to Minimum Validation Matrix

| Subsystem Modified | Minimum Required Validation |
|---|---|
| **UI Components only** | Typecheck + Lint + Visual/browser verification in responsive mode |
| **Composables & Logic** | Typecheck + Unit test run (`npm run test:unit`) |
| **RLS Policies** | Multi-user PostgreSQL verification (test query as User A and User B) |
| **Database Migrations** | Schema pre-check against existing records + local migration run |
| **Realtime WebSockets** | Concurrent multi-session test (sender + receiver windows) |
| **Push Notifications** | Verify database `notifications` row + Edge Function invocation + device alert |
| **Capacitor / Android** | `npx cap sync android` + compilation check + physical device test |
