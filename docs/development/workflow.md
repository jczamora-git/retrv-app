# Retrv — Engineering Development Workflow

> **Purpose:** Standardized 10-step execution workflow for all engineering sessions in Retrv.

---

## 1. The 10-Step Agent Workflow

```text
1. Read AGENTS.md
   ↓
2. Select Relevant Specialized Skill (.agents/skills/)
   ↓
3. Inspect Current Implementation & Dependencies
   ↓
4. Map Affected Downstream Domains (Cross-Domain Rule)
   ↓
5. Define Minimal Scope of Work
   ↓
6. Implement the Smallest Coherent Change
   ↓
7. Run Sequential Validation Commands (Typecheck, Lint, Tests)
   ↓
8. Review Cross-Domain Side Effects & Realtime Impacts
   ↓
9. Update Documentation, Invariants, & Change Report
   ↓
10. STOP at the Phase Boundary & Await Review
```

---

## 2. Domain-Specific Development Guidance

### Bug Fixes
- Identify root cause with concrete evidence before editing.
- Do not refactor surrounding code while fixing a targeted bug.
- Add or update a regression unit test in `tests/unit/` when applicable.

### Database Work
- Never edit live databases manually.
- Always create a timestamped migration in `supabase/migrations/`.
- Query existing data to ensure no constraint violations before applying changes.
- Consult `.agents/skills/retrv-supabase/SKILL.md` and `docs/development/migration-policy.md`.

### Security & RLS Work
- Always test with at least two simulated user accounts (User A vs User B).
- Never use `USING (true)` or `WITH CHECK (true)` on private tables.
- Verify JWT validation in serverless API routes.
- Consult `.agents/skills/retrv-security/SKILL.md` and `docs/architecture/security-boundaries.md`.

### UI & Presentation Work
- Test within Ionic page lifecycle hooks (`ionViewDidEnter`, etc.).
- Never place security rules solely in Vue template conditionals.
- Preserve mobile touch ergonomics and dark/light mode CSS variables.
- Consult `.agents/skills/retrv-ui/SKILL.md`.

### Native Mobile Work (Capacitor / Android)
- Always run `npx cap sync android` after modifying native dependencies or web builds.
- Verify behavior on an Android device or emulator; do not rely solely on web browser simulation.
- Consult `.agents/skills/retrv-mobile/SKILL.md`.
