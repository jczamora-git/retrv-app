---
name: retrv-security
description: Enforces authentication boundaries, Row Level Security, secret protection, privacy guarantees, and threat-oriented validation in Retrv.
---

# Retrv Security Skill

> **Target:** Authorization boundaries, identity verification, credential security, data privacy, and abuse prevention.

---

## 1. Security Philosophy & Invariants

In Retrv, **client-side checks provide zero security guarantee**. All security guarantees must be enforced by Supabase Auth, PostgreSQL Row Level Security (RLS), verified JWT claims, and trusted serverless/Edge compute.

### Core Invariants
- `auth.uid()` is the sole trusted database identity.
- Client-provided identifiers (`author_id`, `sender_id`, `recipient_id`, `user_id`) in request bodies must NEVER be trusted without matching against `auth.uid()`.
- Private messages, conversations, phone numbers, emails, and device push tokens must NEVER be visible or modifiable by unauthorized users.
- Development auth bypass mechanisms (`VITE_DEV_BYPASS_AUTH`, `dev_` UIDs) must NEVER be enabled in production environments or release builds.

---

## 2. Threat Modeling & Adversarial Questions

Every security evaluation or modification must answer the following threat questions:

1. **Identity Spoofing:** Can User A submit a mutation (create post, comment, message, notification) using User B's ID as author/sender?
2. **Horizontal Privilege Escalation:** Can User A view, update, or delete User B's private messages, conversations, or notifications?
3. **Data Enumeration:** Can an unauthenticated or newly registered user dump all phone numbers, email addresses, or push tokens from `profiles` or `push_tokens`?
4. **State Manipulation:** Can a user transition a post from `open` to `resolved` without being the post author?
5. **Self-Awarding & Merit Tampering:** Can a user forge an `achievements` insert to grant themselves Community Merit badges?
6. **File Key Hijacking:** Can knowing an UploadThing file key allow an attacker to delete an image they do not own via `/api/uploadthing/delete`?
7. **Secret Exposure:** Are API keys (like `SUPABASE_SERVICE_ROLE_KEY` or FCM server keys) exposed to the client bundle?

---

## 3. Security Review Rules

- **Evidence First:** Do not label a finding as P0/Critical without confirming via source code or live test that the attack path is executable.
- **Never Log Secrets or Sensitive Data:** Do not emit auth tokens, passwords, push tokens, or phone numbers in application console logs.
- **Strict Endpoint Verification:** Ensure API routes in `api/` validate incoming `Authorization: Bearer <token>` headers against Supabase Auth before processing actions.
