# 009 — Operational platform control center

The user's complete Super Admin directive takes priority over website-widget work.
Implementation adds native MongoDB collections behind server-only reporting and
transactional mutation repositories. Better Auth identities remain unchanged.

Every platform read authenticates the database session and singleton Super Admin
grant independently. Mutations repeat the grant check inside their transaction,
validate bounded Zod input, enforce an actor budget, and atomically append a protected
`platformAudit` event. Organization and account controls have typed-target confirmation
dialogs. The sole Super Admin cannot be restricted or have sessions revoked through
these controls. Its bootstrap ownership proof from decision 007 is retained.

## Lifecycle and restrictions

New organizations persist `active`. Existing blank/missing lifecycle values are
explicitly initialized as active through an audited, session-authorized migration;
explicit suspensions are never overwritten. Before initialization, legacy access is
preserved while reporting labels the missing lifecycle as initialization pending.
No organization data is deleted. Suspension is checked in workspace/service and direct
repository paths, including before AI execution and publication. Read-only and AI
restrictions are separate policies. Reactivation is available through platform guards,
without requiring membership in the suspended workspace.

User restrictions live outside Better Auth's identity model. They are checked during
session creation, auth transport and private page authentication. Restriction and
explicit session revocation remove only the target user's sessions. Existing account
identity/password data is neither replaced nor read into platform DTOs.

## Provider-independent commerce and AI oversight

Plans hold currency-correct integer minor-unit prices, entitlements and allowances.
Administrative subscription assignment records trial/active/past-due/canceled states
and billing events. Payment status remains unconfigured; manual assignments never
create receipts or recurring revenue. No live payments are activated.

AI operations aggregate the actual private-test ledger, not marketing illustrations.
Daily request/token limits, subscription/trial entitlements, model availability and
optional estimated cost ceilings are applied in execution transactions. Explicit
model rate policies allow usage cost estimation; unknown historical costs remain
unavailable. Rates are snapshotted per request so later edits do not rewrite history.
Failed/uncertain calls retain reservations. Estimated cost is not a provider invoice.

## Support, audit and health

Support requests have organization-linked internal notes, status and assignment to
the sole administrator or unassigned. Support access requires explicit authorization,
a reason, a bounded expiration (maximum 30 minutes), and a live grant on every read.
Its dedicated view has a persistent read-only banner and exit action; it exposes
business profile metadata, never password impersonation or silent tenant-service bypass.
Customer conversations and knowledge are excluded from ordinary global inventory.

Identity, organization and administrative audit events support action, organization,
actor and UTC-date filtering plus protected event detail pages. No audit deletion or
retention-shortening endpoint exists. Failed authorization records contain metadata
only. Database backup/WORM retention remains infrastructure release work.

Health performs a read-only database ping and reports application response, provider
configuration and honest absent worker/integration states. It does not make paid
provider probes. Manual incident registration/resolution complements known failed AI
request counts; it does not pretend that global exception telemetry is installed.
Platform settings contain identity, defaults, trial/support policy, model allowlist
and feature switches, never credentials. All changes are audited.

## Persistence and indexes

New collections: `organizationControls`, `userControls`, `subscriptionPlans`,
`organizationSubscriptions`, `modelPolicies`, `platformSettings`, `platformAudit`,
`administrativeNotes`, `supportRequests`, `supportNotes`, `supportAccess`,
`billingEvents`, `operationalIncidents`. Explicit unique/scope/date indexes are
provisioned through the existing index command and disposable test setup. Support
expiry is enforced by queries; grants and audit history are not deleted by TTL.

MongoDB transaction queries run sequentially. Parallel queries on the same session
caused a regression during implementation and are covered by the full integration
suite, including rollback, lifecycle enforcement and budget reservation tests.
