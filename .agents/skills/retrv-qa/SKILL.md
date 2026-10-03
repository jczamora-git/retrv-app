---
name: retrv-qa
description: Defines test methodologies, validation matrices, multi-user test requirements, and release qualification standards for Retrv.
---

# Retrv QA Skill

> **Target:** Verification rigor, test architecture, automated execution, and release qualification.

---

## 1. Current Test Tooling

- **Unit Testing:** Vitest (`vitest: ^4.0.0`, `npm run test:unit`)
  - Target files: `tests/unit/*.spec.ts`
- **E2E Testing:** Cypress (`cypress: ^13.5.0`, `npm run test:e2e`, `cypress.config.ts`)
- **Type Checking:** Vue-TSC (`npm run build` or `npx vue-tsc --noEmit`)
- **Linting:** ESLint (`npm run lint`)

---

## 2. Inviolable Testing Rules

1. **Never Report a Test as Passing Without Evidence:**
   - Always run the actual verification command and inspect output and exit codes.
   - Never simulate or fabricate test results.
2. **Domain-Specific Test Requirements:**
   - **RLS Policy Changes:** MUST be validated with at least two distinct user contexts (User A and User B) to verify cross-user isolation.
   - **Realtime Changes:** MUST be tested across two concurrent client sessions to prove broadcast and reception.
   - **Resolution & Merit Changes:** MUST test:
     1. Successful resolution with helper merit.
     2. Resolution without helper.
     3. Attempted self-awarding (must be blocked).
     4. Repeat resolution attempts (duplicate merit prevention).
     5. Invalid helper user ID.
   - **Push Notification Changes:** MUST clearly separate and report:
     1. Database `notifications` record creation.
     2. FCM HTTP dispatch status.
     3. Device push receipt.
3. **Verification Claim Integrity:**
   - Build success does NOT prove interactive UI or mobile runtime behavior.
   - When automated tests cannot exercise native plugins or live external services, state that implementation is complete but runtime behavior requires manual on-device verification.
