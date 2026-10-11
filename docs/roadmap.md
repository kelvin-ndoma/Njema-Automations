# Delivery roadmap

## Phase 1 — foundation

- [x] Isolated local repository verified; no commits or remote operations.
- [x] npm dependency setup and project-local Node 22.23.3.
- [x] Next.js App Router, strict TypeScript, Tailwind, UI primitives and icons.
- [x] Atlas-compatible MongoDB connection and explicit indexes.
- [x] Better Auth password/session authentication and logout.
- [x] Organization creation with owner membership and atomic audit.
- [x] Multiple organizations, authorized switching and membership-backed roles.
- [x] Tenant-scoped services and revoked membership checks.
- [x] Responsive shell, authentication, empty/loading/error states.
- [x] Input validation, database-backed mutation limits and origin checks.
- [x] Unit and MongoDB transaction/session integration tests added.
- [x] Final verification: 25 Vitest tests, 3 production-mode Chromium tests,
      production build, lint and TypeScript checks passed.
- [x] Configured MongoDB authentication verified during subsequent account setup.
      Platform reporting is covered by disposable-database integration/browser tests.

## Future phases (not implemented)

2. Onboarding, settings, invitations and team: expiration, permissions and regional
   preference tests required.
3. Employees, knowledge and AI: approved grounding, tool authorization, injection
   resistance and usage tests required.
4. Website chat and leads: origin controls, visitor isolation, consent and persistence.
5. CRM and pipelines: tenant-safe record/stage transitions.
6. Follow-ups, quotations and scheduling: durable retry/idempotency, approvals,
   currency and time-zone correctness.
7. Analytics, billing, usage and platform administration: real-data reporting,
   provider reconciliation, separate platform authorization.
8. Other integrations and release hardening: signed webhooks, retention/deletion,
   backup restore, end-to-end tests and deployment verification.

Each milestone adds the smallest complete vertical slice and updates this checklist.
Production safeguards deferred here must be completed before a commercial release.

## Platform control center — approved Milestones 1–2

- [x] Dedicated private platform layout and responsive mobile navigation.
- [x] Singleton grant checked by layout and every exported reporting operation.
- [x] Shared tables, search/filter forms, pagination, dialogs, badges and empty states.
- [x] Real totals, period registrations, status-aware count and zero-filled UTC growth.
- [x] Organization directory/profile, ownership, paginated memberships and recent audit.
- [x] User directory/profile, verification and paginated memberships; no secrets.
- [x] Unit/integration tests for anonymous, owner/admin, revoked-grant and direct reads.
- [x] Production build and browser tests, including existing workspace regressions.
- [x] Documentation and architecture decision updated.

Milestone 3 (suspension/reactivation), marketing and later platform modules remain
unimplemented and require a subsequent approved task. Your account remains the only
super administrator. Current verification supersedes older test counts above.

### Approved access hierarchy correction

- [x] Server-resolved platform-first default landing, membership-based onboarding.
- [x] Safe authorized deep links through authentication.
- [x] Explicit organization selector and membership-only platform/workspace switching.
- [x] Functional Security & Audit metadata directory.
- [x] Independent live grant checks and revoked-grant coverage.
- [x] Investigate development indicator errors; narrowly guard invalid profiler timing.

Organization Support Mode and organization lifecycle controls remain deferred. The public
marketing website is separately approved and implemented below.

### Approved public marketing website

- [x] Public homepage for anonymous and authenticated visitors, independent of MongoDB.
- [x] Separate marketing layout, premium responsive design and concept workflow visual.
- [x] Features, workflow, solutions, contact-based pricing, contact, privacy and preview terms.
- [x] Origin-checked, validated, rate-limited inquiry persistence and metadata audit transaction.
- [x] Canonical/Open Graph metadata, social artwork, favicon, sitemap and robots.
- [x] Public navigation and authenticated homepage browser coverage.

Live AI capabilities, subscriptions, public deployment and commercial launch policies
remain future work. No release dates or prices are implied by the marketing site.
