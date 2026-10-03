# Change Report: [Phase / Task Title]

> **Date:** [YYYY-MM-DD]  
> **Session / Agent:** [Agent Name or ID]  
> **Target Phase:** [Phase Number & Name]  
> **Status:** [Completed / Blocked / In Progress]

---

## 1. Objective
[Concise summary of what this engineering session aimed to achieve.]

---

## 2. Scope
- **Included:** [Explicit list of work performed.]
- **Excluded:** [Explicit boundaries and what was deferred.]

---

## 3. Files Changed
- `path/to/file1.ts` — [Brief description of change]
- `path/to/file2.vue` — [Brief description of change]

---

## 4. Database Changes & Migrations
- **Migrations Added:** [e.g., `supabase/migrations/20261003180000_name.sql` or None]
- **Schema Impact:** [Tables, columns, constraints, or RLS policies altered]

---

## 5. Security Impact
- **Threat Mitigations:** [Vulnerabilities resolved or hardened]
- **Remaining Exposure:** [Any unaddressed security boundaries]

---

## 6. Cross-Domain Impact
- **Downstream Effects:** [Impact on Auth, Posts, Resolution, Messaging, Notifications, etc.]
- **Realtime Impacts:** [Any changes to channel events or listeners]

---

## 7. Validation Results

| Check | Command Run | Exit Code | Result (PASS / FAIL / NOT RUN / BLOCKED) | Notes |
|---|---|---|---|---|
| **Typecheck** | `npm run build` | 0 | PASS | 0 type errors |
| **Lint** | `npm run lint` | 0 | PASS | 0 linter errors |
| **Unit Tests** | `npm run test:unit -- --run` | | | |
| **Integration** | | | | |
| **Build** | `npm run build` | | | |
| **Manual QA** | | | | |

---

## 8. Known Limitations
[Any discovered bugs, performance constraints, or edge cases not handled.]

---

## 9. Deferred Work
[Tasks identified during this session that belong to future phases.]

---

## 10. Documentation Updated
- `AGENTS.md`
- `docs/...`

---

## 11. Next Recommended Phase
[Identify the next authorized phase in `docs/development/phase-roadmap.md`. Do NOT begin implementation automatically.]
