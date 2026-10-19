# Relay product build

## Authority and continuation

**Authentication incident follow-up:** The configured database connection has
recovered. The user-requested Njema admin provisioning verified operator authentication,
the new account's actual local sign-in HTTP 200, persisted session and workspace
HTTP 200. See `docs/authentication-incident.md`. No credentials were reset and no
platform grants were reassigned. Current task: the user subsequently requested the complete operational Super Admin
Control Center. That implementation takes priority over M3; see the session section below.

On 12 October 2026 the user approved the full product scope below, superseding
the earlier milestone scope limit in AGENTS.md. `docs/roadmap.md` is preserved as
historical delivery context. Work remains local to `/home/kelvin/Automator`:
no commits without approval, remotes, pushes, deployments, destructive database
operations, credential disclosure, or sub-agent delegation.

Resume the first unfinished, unblocked acceptance item in milestone order. Implement
vertical slices, run relevant security tests and required checks, and update this file.
Do not rebuild delivered foundation or produce another architecture plan.

## Status and evidence

COMPLETE requires verified UI, transport/backend, persistence, authorization and
relevant tests. PARTIAL includes implemented features whose current runtime checks
remain unverified. NOT STARTED means no meaningful implementation. BLOCKED means
a named external dependency or decision prevents that specific capability.

Baseline: clean isolated Git root; Next App Router/strict TypeScript; Mongoose domain
models plus Better Auth native collections. Evidence is source and tests, rather than
the existence of a route. The initial inspection could only run 21 unit tests because the sandbox denied local
sockets. Authorized subsequent runs resolved that verification restriction; current
results appear in the command-center execution record below.

| Module                                                  | Status                               | Evidence                                                                                                                | Remaining                                                                                                 |
| ------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Authentication, organizations, memberships, permissions | PARTIAL                              | Database session/transaction/tenant/restriction tests verified; current 115-test and 20-browser suites                  | Recovery, verification delivery, account editing and team roles UI                                        |
| Customer onboarding/business settings                   | PARTIAL                              | `/app/[orgSlug]/settings`, service/repository and browser save/reload checks                                            | Full activation checklist through widget installation                                                     |
| Employee configuration/management                       | PARTIAL                              | Owner/admin editor; unique tenant model; revision-safe transaction and audit; pause/resume blocks widget AI             | Archive and multi-employee entitlements                                                                   |
| Business knowledge                                      | COMPLETE (approved plain-text slice) | Employee knowledge editor, validation, persistence/reload, scoped read/write, audit rollback tests                      | Multi-document/file/retrieval extensions are later scope                                                  |
| OpenAI conversation engine                              | PARTIAL                              | Private `/test-chat`, server-only Responses provider, synthetic-provider integration/unit tests, persisted results      | Live credential/model check and adversarial semantic grounding evaluations; multi-turn/customer execution |
| Embeddable website widget                               | PARTIAL                              | Allowed-origin install, public loader/API, visitor sessions; Chromium install→chat→inbox journey                        | Live provider reply demonstration; multi-turn polish and production CSP hardening                         |
| Lead qualification/capture                              | PARTIAL                              | Consented name/email/phone capture bound to visitor conversation; duplicate request protection                          | Richer qualification fields and CRM handoff                                                               |
| Conversations inbox/human takeover                      | PARTIAL                              | Tenant inbox lists leads and recent website conversations; private test history retained                                | Assignment, human messaging and atomic takeover                                                           |
| CRM/contacts/leads/opportunities/pipelines              | NOT STARTED                          | No CRM entities                                                                                                         | Tenant-safe records, stages, deduplication and transitions                                                |
| Follow-up automation                                    | NOT STARTED                          | No job or delivery provider                                                                                             | Durable retries/idempotency, consent, stop rules and actual delivery                                      |
| Quotations/appointments                                 | PARTIAL                              | Opportunity-bound quotation drafts/approvals; appointment request/confirm/cancel; org currency and time zone            | Customer send, tax, calendar provider integration                                                         |
| Team management                                         | PARTIAL                              | Invite/accept/revoke, role updates, last-owner protection; manual accept links                                          | Email delivery of invitations                                                                             |
| Customer analytics                                      | PARTIAL                              | `/analytics` Outcomes page with real counts from CRM, quotes, appointments, follow-ups, conversations                   | Attribution windows, trend charts, cost coupling                                                          |
| Platform Super Admin Control Center                     | PARTIAL                              | Super Admin + Platform Admin grants; Support Mode mask; ops modules; audits                                             | Live payment/provider telemetry and production MFA/retention remain external release gates                |
| Organization Support Mode                               | COMPLETE (read-only metadata slice)  | Explicit actor-bound expiring grants; audited profile view/banner/exit; expiry/revocation/browser tests                 | Customer-content support and write capabilities intentionally excluded                                    |
| Subscriptions/billing/trials/usage limits               | PARTIAL                              | Plans, trials, administrative subscriptions, model rates and request/token/estimated-cost enforcement                   | Checkout, signed payment-webhook reconciliation and approved commercial/payment provider                  |
| Public marketing                                        | PARTIAL                              | Public rendering/persistence/browser tests; availability updated for configuration/private tests                        | Inquiry review/notification, final commercial policies and launch metadata                                |
| Security/testing/monitoring/deployment readiness        | PARTIAL                              | 115 tests and 20 browser cases passed; isolated production build, typecheck/lint; widget origin boundaries verified     | Live AI evaluation, MFA, retention/restore/monitoring/release hardening; no deployment                    |

## Executable milestones

### M0 — Verify the delivered baseline and unblock checks (COMPLETE)

- Deliverables: current test/build evidence; no repeated foundation implementation.
- Dependencies: installed tooling, permitted loopback sockets for disposable MongoDB.
- Acceptance: typecheck/lint, all existing Vitest and Chromium tests, isolated production
  build pass; no real-database fixture operations or weakened origin/cookie controls.
- Verification: full suite passed with 85 tests, typecheck/lint passed, and isolated
  production build passed. Final Chromium suite: 18 tests passed, including employee
  form save/reload and the platform-admin/viewer tenant-boundary case.
- Blockers: none with approved test-socket access. Earlier sandbox-only failures are
  historical. Use permitted execution for test servers/build subprocesses; do not
  modify framework internals or weaken security to bypass sandbox restrictions.

### M1 — Business setup, employee configuration and approved knowledge (COMPLETE)

- Dependencies: existing authenticated membership policy and MongoDB replica set.
- Deliverables: business settings; one configurable sales employee per workspace;
  bounded approved plain-text knowledge; revision-safe saves and metadata audit;
  role-aware navigation and actionable onboarding.
- Acceptance: owners/admins save; other active members read; missing/revoked/foreign
  memberships denied; injected org IDs/roles ignored; failed transactions roll back;
  conflicting edits do not silently overwrite; reload shows persisted values.
- Verification: ten employee/settings integration tests passed, including admin edits,
  foreign/viewer/revoked denial, ignored claims, transaction rollback and revisions.
  Browser save/reload/edit checks passed; typecheck/lint/build passed.
- Blockers: none for this bounded configuration slice. New explicit indexes are added
  to provisioning and disposable test setup; configured-database provisioning was not run.

### M2 — First grounded conversation and usage ceiling (PARTIAL)

- Dependencies: M1, server-only OpenAI provider and usage ledger.
- Deliverables: authenticated test chat; persisted conversation/messages; grounding
  in approved knowledge; truthful fallback; bounded tokens, timeout and per-tenant
  reservation/reconciliation of usage; no credentials in browser or logs.
- Acceptance: real configured-provider response; provider failures never fabricate
  success; tenant/revocation/prompt-injection/parallel-budget tests; no tools with
  arbitrary tenant access. Deterministic provider fakes are test evidence only.
- Verification: ten provider tests and eight real-MongoDB conversation tests passed.
  Includes failures, refusal/incomplete output, exact-excerpt fallback, scoped history,
  duplicate submission, concurrent budgets and revocation during provider execution.
  Browser verifies the unavailable-provider state. Synthetic network responses are
  explicitly test fixtures, not live AI evidence.
- Blockers: `OPENAI_API_KEY` and `OPENAI_MODEL` are not configured; no paid call made.
  Live semantic grounding/injection evaluation remains unverified. Request/token caps
  exist, but monetary price-aware ceilings and multi-turn customer conversations do not.
- Outstanding acceptance: privately configure a structured-output-compatible model,
  verify live grounded/unknown/adversarial questions, add money-based usage reservation
  once pricing is selected. Advance unblocked M3 implementation in parallel with these
  external dependencies; no additional agent delegation is authorized.

### M3 — Website widget → qualified lead → business inbox (PARTIAL)

- Dependencies: M2.
- Deliverables: embeddable loader/widget, allowed website origins, scoped visitor
  sessions, isolated history, qualification/contact consent, tenant lead inbox.
- Acceptance: browser test from employee setup through visitor reply/contact capture
  to authorized inbox; foreign visitor/tenant denied; rate/usage caps enforced;
  public credentials cannot access private workspace records.
- Verification: 115 Vitest tests passed; Chromium suite 20 passed including widget
  install → visitor reply/lead → inbox, plus prior auth/platform/marketing journeys.
  Typecheck, lint and isolated production build passed. Live paid-provider demonstration
  remains blocked on private `OPENAI_API_KEY` / `OPENAI_MODEL` (e2e uses disposable
  synthetic AI via `RELAY_SYNTHETIC_AI=1`).
- Outstanding: production CSP/frame review for third-party sites, live grounding evals,
  richer qualification and M4 human takeover.

### M4 — Conversations and human takeover (NOT STARTED)

- Dependencies: M3.
- Deliverables: paginated inbox, human replies, assignment and atomic takeover/resume.
- Acceptance: in-flight AI cannot publish after takeover; tenant/role checks on all
  messages and transitions; retry/ordering tests and real empty states.
- Verification: pending. Blockers: none for local implementation.

### M5 — Team, identity recovery and business CRM (NOT STARTED)

- Dependencies: M3–M4; email provider for verified-email invitations/recovery.
- Deliverables: account edits, recovery/verification, expiring invitations and member
  roles; contacts/leads/opportunities/pipelines with minimal usable sales stages.
- Acceptance: invitation possession plus verified identity required; revoked access
  immediate; preserve last owner; scoped references/deduplication/stage transitions;
  one lead-to-opportunity browser journey.
- Verification: pending. Blockers: email-provider configuration for actual delivery.

### M6 — Commercial pilot, subscriptions and trials (PARTIAL)

- Dependencies: M2 usage ledger and customer-value M3; payment-provider decision.
- Deliverables: plans, checkout, subscription state, signed/idempotent webhooks,
  reconciliation, trials and server-side feature/usage entitlements.
- Acceptance: duplicate/out-of-order events safe; payment state cannot come from
  browser claims; downgrade/trial expiry/usage enforcement tested; no invented prices.
- Verification: plans, administrative subscription/trial lifecycle and execution entitlements are verified in the command-center tests. Checkout/payment reconciliation remains NOT STARTED and BLOCKED on the payment provider and approved commercial offer.

### M7 — Follow-ups, quotations and appointments (NOT STARTED)

- Dependencies: M4–M6, delivery/calendar provider decisions.
- Deliverables: durable job outbox/retries, consent/stop rules, draft/approved quotes,
  currency-aware amounts and time-zone-safe scheduling.
- Acceptance: retries cannot double-send/book; takeover/opt-out stops automation;
  quotations need configured pricing and human approval; tenant-safe background jobs.
- Verification: pending. Blockers: providers for real delivery/calendar execution.

### M8 — Customer analytics and complete platform operations (PARTIAL)

- Dependencies: actual usage/sales/commercial records from preceding milestones.
- Deliverables: real customer outcome reports; platform usage/billing/settings and
  audited organization suspension/reactivation; secure privileged authentication;
  explicit expiring Organization Support Mode (no implicit super-admin bypass).
- Acceptance: minimal platform DTOs, independent grant guards, lifecycle enforced
  throughout execution, support scope/expiry/revocation tests, no fabricated metrics.
- Verification: platform operational foundations delivered in the current-priority record below; customer analytics remains NOT STARTED. Blockers: production MFA, telemetry and provider-dependent integrations.

### M9 — Marketing operations and release readiness (NOT STARTED)

- Dependencies: operational product, defined retention/commercial policies.
- Deliverables: inquiry review/notification, accurate availability/pricing pages,
  monitoring/redaction, CSP, backup/restore drills, retention/deletion, load/accessibility
  tests and documented release runbook. Do not deploy.
- Acceptance: all checks pass, recovery/restore proven on disposable data, critical
  security findings resolved, credible customer demo and published-capability accuracy.
- Verification: pending. Blockers: commercial/provider policy decisions as applicable.

## Direction correction — AI Sales Workforce (19 October 2026)

Relay is a full-scale AI Sales Workforce SaaS. The lifecycle spine is:

Customer inquiry → AI engagement → Qualification → Lead/Opportunity → Follow-up →
Conversion or Booking → Reporting.

Preserve auth, organizations, employee+knowledge, website widget, consented leads,
inbox shell, and Super Admin foundations. Expand them; do not rebuild. Decision 011
records the dependency order. No UI-only features, fabricated metrics, commits,
remotes, pushes, or deployments.

### Lifecycle milestones (active backlog)

| Milestone | Status | Deliverables | Dependencies |
| --------- | ------ | ------------ | ------------ |
| L1 Sales agent | PARTIAL | Goal, qualification, escalation, multi-turn grounded replies; CRM/follow-up/quote/appointment request tools. Live OpenAI BLOCKED on credentials | M1–M3 foundations |
| L2 Collaboration inbox | PARTIAL | Conversation detail, human replies, takeover/resume, assignment, sales-context sidebar | L1 |
| L3 CRM core | PARTIAL | Contacts, pipeline, opportunities from consented leads, stage moves, activities | Organizations |
| L4 AI ↔ CRM | PARTIAL | record_qualification, advance_opportunity, schedule_follow_up, request_quotation, request_appointment (decision 012/014) | L1–L3 |
| L5 Follow-up automation | PARTIAL | FollowUpJob outbox, idempotent schedule, in-app process-due (no email/SMS). Outbound BLOCKED on provider | L3–L4 |
| L6 Quotes & appointments | PARTIAL | Draft/approve with human pricing gate; AI zero-amount requests; appointment request/confirm/cancel; no send/calendar | L3–L5 |
| L7 Team management | PARTIAL | Hashed-token invitations, accept-by-email match, revoke invite/member, role updates, last-owner protection. Email delivery BLOCKED | L3 |
| L8 Platform ops completion | PARTIAL | AI metrics include widget DailyAIUsage + private tests; health notes follow-up jobs | Command center |
| L9 Subscriptions & usage | PARTIAL | Entitlement enforcement; checkout BLOCKED on payment provider | Plans/allowances |
| L10 Coherence | PARTIAL | Channels page, inbox sales context, workforce overview, Outcomes analytics, nav/marketing honesty | Prior slices |

Historical M0–M9 rows remain verification evidence.
**Next unblocked:** Subscription entitlement gates for channel/employee limits, consent
opt-out stop rules on follow-ups, or payment checkout scaffolding. Live OpenAI BLOCKED
on credentials. Payments BLOCKED on provider. Outbound email/WhatsApp BLOCKED until
verified. Calendar sync BLOCKED. Invitation email delivery BLOCKED.

## Session log (continued)

19 October 2026 (continued 3): Integrated lifecycle slice — AI `request_quotation` /
`request_appointment` tools (consent-gated, no invented prices/calendar), human quotation
pricing before approval, inbox assignment + CRM/sales context sidebar, channel
configuration scaffolding for email/WhatsApp with encrypted secrets and explicit outbound
refusal. Decision 014. Live provider activation remains BLOCKED.

## Session log

19 October 2026 (continued): Master directive applied. Implemented L4 agent→CRM tools,
L5 in-app FollowUpJob outbox + process-due UI, workforce overview metrics, platform AI
metrics combining private-test + widget usage (decision 012). Checkpoint: do not claim
outbound messaging, quotes, appointments, checkout, or live OpenAI complete.

19 October 2026 (continued 2): L6 quotations (draft/approve) and appointments
(request/confirm/cancel) bound to opportunities. L7 team invitations with hashed tokens,
in-app accept matching session email, last-owner protection, `/team` and
`/invitations/accept`. Customer Outcomes analytics from persisted counts. Employee
pause/resume blocks public widget AI replies. Overview cards + nav updated. Email invite
delivery, calendar sync, and customer quote send remain BLOCKED.

19 October 2026 (continued 3): See lifecycle table — AI commercial request tools, inbox
sales context/assignment, channel scaffolding, quotation pricing gate, contact
communication opt-out cancelling pending follow-ups.

19 October 2026 (continued 4): Platform Admin role under Super Admin (decision 015).
Both can mask into customer orgs via audited Support Mode; Super Admin alone grants
operators and privileged mutations. Org teams still land in `/app/[orgSlug]`.
