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
- [ ] Final browser verification, production build, lint and type checks recorded.
- [ ] User's Atlas connection verified (requires private configuration).

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
