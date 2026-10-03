# Retrv — Technical Documentation Index

> **Welcome to the Retrv Engineering Knowledge Base.**  
> This directory houses authoritative architectural blueprints, domain mappings, engineering invariants, phase specifications, and operational policies for the Retrv platform.

---

## 1. Start Here: Coding Agent & Engineer Onboarding

- **[AGENTS.md](../AGENTS.md)** — The foundational contract and engineering rules governing all development sessions.
- **[.agents/README.md](../.agents/README.md)** — Guide to specialized AI coding-agent skills and domain responsibilities.
- **[Engineering Invariants](engineering-invariants.md)** — Absolute, immutable rules that must never be violated.
- **[Known Issues Register](known-issues.md)** — Verified vulnerabilities and architectural defects tracked across phases.

---

## 2. System Architecture Blueprints (`docs/architecture/`)

- **[System Overview](architecture/system-overview.md)** — High-level architecture, layer descriptions, and Mermaid diagrams.
- **[Domain Map](architecture/domain-map.md)** — Inventory of all 13 functional domains, files, and dependencies.
- **[Data Model & Schema](architecture/data-model.md)** — Entity-relationship diagrams and table specifications for all 11 tables.
- **[Security Boundaries](architecture/security-boundaries.md)** — Trust boundaries, client exposure risks, and planned hardening.
- **[Realtime Messaging](architecture/realtime-messaging.md)** — 1-on-1 chat architecture, optimistic reconciliation, and unread sync.
- **[Notifications Pipeline](architecture/notifications.md)** — In-app inbox and FCM push notification architecture.
- **[Media Uploads](architecture/media-uploads.md)** — UploadThing routes, image constraints, and endpoint security.
- **[External Cloud Services](architecture/external-services.md)** — Supabase, Firebase, UploadThing, Vercel, and GitHub Actions.
- **[Legacy Systems Register](architecture/legacy-systems.md)** — Transitional Express and Firebase components that must not be casually deleted.

---

## 3. Development Policies & Workflows (`docs/development/`)

- **[10-Step Development Workflow](development/workflow.md)** — Standard execution workflow for all engineering tasks.
- **[Database Migration Policy](development/migration-policy.md)** — Mandatory rules for schema migrations, RLS changes, and safety.
- **[Testing Strategy](development/testing-strategy.md)** — Testing layers, runner scripts, and domain validation matrices.
- **[Engineering Phase Roadmap](development/phase-roadmap.md)** — Structured execution phases (Phase 0 through Phase 8).
- **[Release Readiness Checklist](development/release-readiness.md)** — Production readiness criteria across all domains.
- **[Code Style & Naming Conventions](development/conventions.md)** — Project conventions for components, database, and files.

---

## 4. Phase Specifications (`docs/phases/`)

- **[Phase 1 — Security Foundation](phases/phase-1-security-foundation.md)** — RLS hardening, credential scrubbing, and endpoint auth.
- **[Phase 2 — Database Integrity](phases/phase-2-database-integrity.md)** — Foreign keys, status constraint alignment, and orphan data cleanup.

---

## 5. Audits & Reports (`docs/audits/`, `docs/reports/`)

- **[Full System Audit (2026-10-03)](audits/retrv-full-system-audit.md)** — Comprehensive 31-section baseline architecture and security audit.
- **[Phase 0 Agent Harness Report](reports/phase-0-agent-harness-report.md)** — Verification and delivery report for Phase 0 bootstrap.

---

## 6. Architecture Decisions & Templates (`docs/decisions/`, `docs/templates/`)

- **[ADR Process](decisions/README.md)** & **[ADR Template](decisions/ADR-template.md)** — Architectural decision recording system.
- **[Change Report Template](templates/change-report-template.md)** — Mandatory report format for coding-agent sessions.
