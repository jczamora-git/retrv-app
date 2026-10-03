# Retrv Specialized Agent Skills System

> **Location:** `.agents/`  
> **Authority:** Subordinate to root [AGENTS.md](../AGENTS.md). The root `AGENTS.md` rules, invariants, and stop conditions ALWAYS apply regardless of active skills.

---

## 1. Overview

Retrv utilizes a modular coding-agent skill framework to provide specialized domain guidance for AI pair programming sessions. Each skill encapsulates deep, project-specific knowledge for a specific subsystem of Retrv—such as PostgreSQL/Supabase, Realtime WebSocket synchronization, Push Notifications, or Ionic Vue UI.

When working in Retrv, coding agents should consult the relevant skill document before inspecting or modifying code in that domain.

---

## 2. Skill Matrix

| Skill | Directory | Primary Focus / Use When | Key Files & Artifacts |
|---|---|---|---|
| **retrv-architect** | [retrv-architect/SKILL.md](skills/retrv-architect/SKILL.md) | Cross-domain architecture, dependency tracing, phase discipline, and system boundaries | `docs/architecture/`, `src/composables/`, `api/` |
| **retrv-supabase** | [retrv-supabase/SKILL.md](skills/retrv-supabase/SKILL.md) | PostgreSQL schema, migrations, RLS policies, indexes, and database RPC functions | `supabase/`, `supabase-schema.sql` |
| **retrv-security** | [retrv-security/SKILL.md](skills/retrv-security/SKILL.md) | Auth boundaries, JWT verification, private data protection, RLS audits, and API security | `src/utils/supabase.ts`, `api/`, `docs/security/` |
| **retrv-realtime** | [retrv-realtime/SKILL.md](skills/retrv-realtime/SKILL.md) | WebSockets, Supabase channels, chat messaging, optimistic updates, and unread sync | `src/services/chatService.ts`, `useChat.ts`, `useMessageUnread.ts` |
| **retrv-notifications** | [retrv-notifications/SKILL.md](skills/retrv-notifications/SKILL.md) | In-app notification records, preferences, push tokens, and FCM Edge Function delivery | `src/composables/useNotifications.ts`, `supabase/functions/` |
| **retrv-mobile** | [retrv-mobile/SKILL.md](skills/retrv-mobile/SKILL.md) | Capacitor native runtime, Android builds, device permissions, and native push integration | `android/`, `capacitor.config.ts`, `pushNotificationService.ts` |
| **retrv-qa** | [retrv-qa/SKILL.md](skills/retrv-qa/SKILL.md) | Testing architecture, Vitest unit tests, Cypress E2E, multi-user test matrices, and release QA | `tests/`, `package.json`, `docs/development/testing-strategy.md` |
| **retrv-ui** | [retrv-ui/SKILL.md](skills/retrv-ui/SKILL.md) | Ionic Vue presentation layer, components, theme styling, route transitions, and UX | `src/views/`, `src/components/`, `src/theme/` |

---

## 3. Combining Skills & Precedence

1. **Precedence:** `AGENTS.md` > `retrv-architect` > Domain Skills (`retrv-supabase`, `retrv-security`, etc.) > UI Skill (`retrv-ui`).
2. **Multi-Domain Work:** If a task spans both database and frontend (e.g., adding an item resolution status), the agent must review both `retrv-supabase` and `retrv-ui`, with `retrv-architect` governing the boundary.
3. **Conflict Resolution:** If a UI convenience or optimistic update pattern conflicts with a security or data integrity rule in `retrv-security` or `retrv-supabase`, **the security and database integrity rule wins unconditionally**.

---

## 4. Scope Boundaries & Anti-Patterns

- **No Universal Fixes:** Loading a skill does not authorize refactoring outside that skill's domain.
- **Trace Downstream Effects:** Before changing data structures in `retrv-supabase`, check frontend types and realtime payloads using `retrv-architect`.
- **Preserve System Functionality:** Skills must not be used to justify deleting transitional or legacy systems (e.g., Express server, Firebase client) without explicit user instruction.
