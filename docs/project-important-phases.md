Based sa full audit ng Retrv, ito ang recommended **security hardening checklist by phase**. Ito ang order na pinaka-safe sundan dahil may current issues sa permissive RLS, client-trusted operations, missing foreign keys, unauthenticated upload/delete paths, at halos walang critical-workflow test coverage. retrv-full-system-audit

### Retrv Security Hardening Checklist

- [ ] **Phase 0 — Agent Harness & Engineering Rules**
  - [ ] Create/update `AGENTS.md`
  - [ ] Create `.agents/skills/`
  - [ ] Add security, Supabase, realtime, notification, QA, mobile, UI skills
  - [ ] Document architecture
  - [ ] Document security boundaries
  - [ ] Create engineering invariants
  - [ ] Create migration policy
  - [ ] Create testing strategy
  - [ ] Create known-issues register
  - [ ] Create phase roadmap
  - [ ] Enforce “no automatic next phase”
  - Goal: maging structured at consistent lahat ng succeeding Codex changes.

- [ ] **Phase 1 — Security Foundation**
  - [ ] Replace permissive `USING (true)` / `WITH CHECK (true)` RLS policies
  - [ ] Protect `profiles.email` and `profiles.phone`
  - [ ] Enforce post ownership
  - [ ] Enforce comment ownership
  - [ ] Make conversations participant-only
  - [ ] Make messages participant-only
  - [ ] Prevent message sender spoofing
  - [ ] Make notifications recipient-only
  - [ ] Make push tokens owner-only
  - [ ] Make notification preferences owner-only
  - [ ] Prevent arbitrary achievement/merit insertion
  - [ ] Authenticate UploadThing uploads
  - [ ] Authenticate file deletion
  - [ ] Prevent `VITE_DEV_BYPASS_AUTH` from working in production
  - [ ] Remove hardcoded Supabase config fallbacks
  - [ ] Audit username-resolution endpoint
  - [ ] Add multi-user RLS/security tests

  Ito ang pinakamahalagang phase dahil currently broad ang database access; audit found that users could potentially read private messages, modify other users' records, access push tokens, and award merit due to permissive policies. retrv-full-system-audit

- [ ] **Phase 2 — Database Integrity**
  - [ ] Audit existing orphan records
  - [ ] Add foreign keys carefully
  - [ ] Define `ON DELETE` behavior per relationship
  - [ ] Add appropriate `ON UPDATE` behavior
  - [ ] Normalize post status values
  - [ ] Fix `claimed` vs `returned` mismatch
  - [ ] Add missing uniqueness constraints
  - [ ] Add appropriate CHECK constraints
  - [ ] Validate nullable/non-nullable fields
  - [ ] Add integrity-related indexes
  - [ ] Create safe data backfills before constraints
  - [ ] Test migrations against existing data

  Right now, the 11 audited tables have no actual foreign keys; relationships are only conceptual. retrv-full-system-audit

- [ ] **Phase 3 — Trusted Backend Workflows**
  - [ ] Move post resolution to PostgreSQL RPC/server-side function
  - [ ] Make resolution atomic
  - [ ] Validate post ownership server-side
  - [ ] Validate helper recipient
  - [ ] Prevent self-awarding merit
  - [ ] Prevent duplicate resolution
  - [ ] Prevent duplicate merit
  - [ ] Move achievement creation out of the browser
  - [ ] Move trusted notification creation out of the browser
  - [ ] Wrap related DB writes in transactions
  - [ ] Add idempotency where needed
  - [ ] Add tests for partial-failure scenarios

  Current resolution is non-atomic: achievement insert, post update, and notification behavior happen separately. retrv-full-system-audit

- [ ] **Phase 4 — Messaging & Realtime Security**
  - [ ] Filter conversation queries server-side
  - [ ] Remove global conversation fetches
  - [ ] Restrict realtime subscriptions to authorized conversations
  - [ ] Ensure RLS also protects realtime events
  - [ ] Fix global conversation channel behavior
  - [ ] Review `public:posts` subscription lifecycle
  - [ ] Guarantee subscription cleanup
  - [ ] Prevent duplicate realtime listeners
  - [ ] Add message pagination
  - [ ] Make unread updates atomic
  - [ ] Test reconnect behavior
  - [ ] Test background/resume
  - [ ] Test multiple-device sessions

  The audit found conversation fetching and realtime behavior that currently operate too broadly and filter client-side. retrv-full-system-audit

- [ ] **Phase 5 — Notification & FCM Security**
  - [ ] Finalize trusted notification generation
  - [ ] Verify notification preferences at delivery time
  - [ ] Verify notification → Edge Function trigger
  - [ ] Configure/verify Supabase webhook if used
  - [ ] Restrict Edge Function access
  - [ ] Validate JWT/authentication
  - [ ] Protect service-role credentials
  - [ ] Validate FCM payloads
  - [ ] Implement delivery retry/error handling
  - [ ] Remove dead push tokens
  - [ ] Verify push deep links
  - [ ] Test notification taps after cold start
  - [ ] Test foreground/background delivery

  The audit could not confirm an automatic database trigger/webhook invoking the push Edge Function, so this requires runtime verification. retrv-full-system-audit

- [ ] **Phase 6 — Upload & Media Hardening**
  - [ ] Validate Supabase JWT on upload endpoints
  - [ ] Never trust arbitrary `x-user-id`
  - [ ] Associate uploads with actual authenticated users
  - [ ] Add ownership verification before deletion
  - [ ] Store file keys consistently
  - [ ] Validate MIME types
  - [ ] Validate max upload sizes
  - [ ] Add image compression/resizing where appropriate
  - [ ] Handle orphaned uploads
  - [ ] Handle DB-write failure after successful upload
  - [ ] Protect avatar/post/message media individually

  Current upload middleware does not validate identity properly, and file deletion was found unauthenticated. retrv-full-system-audit

- [ ] **Phase 7 — Search, Query & Performance Hardening**
  - [ ] Add cursor pagination for posts
  - [ ] Add pagination for messages
  - [ ] Add pagination for notifications
  - [ ] Limit comments appropriately
  - [ ] Stop loading all conversations
  - [ ] Stop loading all achievements
  - [ ] Move search server-side
  - [ ] Add DB indexes for common filters
  - [ ] Review N+1 queries
  - [ ] Review over-fetching
  - [ ] Avoid `select('*')` for sensitive/public-profile paths
  - [ ] Add safe caching where appropriate

  Search currently filters only the latest 50 fetched posts client-side, while some conversation/achievement queries have no effective bounds. retrv-full-system-audit retrv-full-system-audit

- [ ] **Phase 8 — Authentication & Abuse Protection**
  - [ ] Review username enumeration risk
  - [ ] Add rate limiting to username resolution
  - [ ] Review sign-in error messages
  - [ ] Protect account-related endpoints
  - [ ] Verify session refresh
  - [ ] Verify expired-session behavior
  - [ ] Verify account switching
  - [ ] Verify logout cleanup
  - [ ] Remove stale dev sessions
  - [ ] Add abuse controls where appropriate
  - [ ] Review brute-force surfaces
  - [ ] Review account deletion process

- [ ] **Phase 9 — Privacy & Data Minimization**
  - [ ] Define public profile fields
  - [ ] Define private profile fields
  - [ ] Ensure email/phone never appear in public queries
  - [ ] Review coordinate/location precision
  - [ ] Review private handoff details
  - [ ] Audit logs for personal data
  - [ ] Avoid logging message contents/tokens
  - [ ] Review data retention
  - [ ] Review account deletion/data cleanup
  - [ ] Validate privacy policy against actual app behavior

- [ ] **Phase 10 — Test & Security Regression Suite**
  - [ ] Auth tests
  - [ ] Profile ownership tests
  - [ ] Post ownership tests
  - [ ] Comment ownership tests
  - [ ] Conversation participant tests
  - [ ] Message privacy tests
  - [ ] RLS tests using User A / User B / User C
  - [ ] Achievement abuse tests
  - [ ] Resolution transaction tests
  - [ ] Notification ownership tests
  - [ ] Push-token privacy tests
  - [ ] Upload authentication tests
  - [ ] File deletion authorization tests
  - [ ] Realtime authorization tests
  - [ ] E2E critical user journeys

  Critical workflow coverage is currently near zero according to the audit. retrv-full-system-audit

- [ ] **Phase 11 — Legacy & Attack-Surface Cleanup**
  - [ ] Confirm whether Firebase RTDB is still required
  - [ ] Remove unused Firebase client data layer
  - [ ] Confirm Express server consumers
  - [ ] Retire old Express backend when safe
  - [ ] Remove `devChatStorage` from production paths
  - [ ] Review `lost_found` legacy table
  - [ ] Remove obsolete compatibility aliases
  - [ ] Remove unused dependencies
  - [ ] Remove dead API endpoints
  - [ ] Ensure only one authoritative backend path exists

  The audit identified Firebase RTDB, the Express server, file-based storage, and several aliases/shims as legacy or transitional. retrv-full-system-audit

- [ ] **Phase 12 — Production Security & Release Gate**
  - [ ] Production env vars verified
  - [ ] No service-role key in frontend bundle
  - [ ] Dev bypass disabled
  - [ ] RLS regression suite passes
  - [ ] Production migrations reviewed
  - [ ] No critical/high unresolved security issue
  - [ ] Upload/delete authorization verified
  - [ ] Push delivery verified on actual Android device
  - [ ] Auth lifecycle tested on physical device
  - [ ] App background/resume tested
  - [ ] Deep links tested
  - [ ] Slow/offline network behavior tested
  - [ ] Release APK/AAB tested
  - [ ] Crash/error logging configured safely
  - [ ] Privacy/legal docs reviewed
  - [ ] Final security audit completed

The audit itself proposed a similar progression from **Security & Data Integrity → Architecture Boundaries → Realtime → Notifications → Performance → Testing → Feature Completion**; the checklist above expands that into smaller security-focused gates so mas madaling ipa-execute at i-review per Codex phase. retrv-full-system-audit

**Pinaka-importanteng milestone:** huwag muna isipin na “production secure” after Phase 1. Phase 1 closes the biggest direct holes, pero I'd consider **Phases 1–5 + Phase 10 + Phase 12** the minimum core security path bago public production release.