# Retrv — Architecture Decision Records (ADRs)

> **Location:** `docs/decisions/`  
> **Status:** Active decision recording process.

---

## 1. What Are ADRs?

An **Architecture Decision Record (ADR)** captures an important architectural or technical decision along with its context, considered alternatives, and downstream consequences.

---

## 2. When Is an ADR Required?

An ADR MUST be authored and approved before implementing significant structural changes to Retrv, including:
- Changing the conversation composite ID model (`conv_{uid1}__{uid2}`).
- Moving in-app notification creation from client to server triggers / Edge Functions.
- Normalizing post status enum values (`claimed` vs `returned`).
- Splitting user profile data into distinct public (`profiles`) and private (`user_private_data`) tables.
- Defining foreign key cascade deletion policies (`CASCADE` vs `SET NULL`).
- Introducing offline caching or local database synchronization.
- Changing media upload providers or altering the storage pipeline.
- Changing primary database, authentication, or realtime providers.

---

## 3. ADR Lifecycle & Naming

Files must be named sequentially using 4-digit zero-padded numbers:
```text
docs/decisions/<NNNN>-<kebab-case-title>.md
```
*Example:* `docs/decisions/0001-post-status-normalization.md`

### ADR Statuses
- **PROPOSED:** Under discussion, not yet accepted.
- **ACCEPTED:** Approved and scheduled for implementation.
- **REJECTED:** Considered and explicitly declined.
- **SUPERSEDED:** Replaced by a subsequent ADR (link the successor).
