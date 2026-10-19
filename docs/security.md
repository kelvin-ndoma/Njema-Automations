# Security model

## Authentication

Better Auth owns password hashing, signed cookies, session creation and invalidation.
Passwords require 12–128 characters. Sessions expire after seven days and refresh
at most daily. Cookie caching is disabled: session state is checked in MongoDB.
Production cookies are secure; local HTTP development uses HTTP-only, SameSite cookies.
Auth POSTs require the configured origin. For a loopback configuration only, the
exact `localhost` and `127.0.0.1` aliases are allowed with the same protocol and port.
Public deployment origins remain exact; no wildcard origins are allowed. Better Auth's own origin/CSRF checks
remain enabled. Next.js enforces Server Action origin checks. No custom session protocol.

## Tenant authorization

Roles: owner/admin may read the workspace, update organization settings and manage
members; manager/agent/viewer may read. Update/team permissions are defined for later
milestones, with no update/team endpoints in Phase 1. Platform access is governed by a separate singleton grant and guard; organization
roles never grant platform privileges.
Every workspace read/switch checks active membership from the database. Unknown,
foreign and revoked workspaces disclose the same unavailable message. Client-selected
organization IDs, slugs and preference cookies never establish authority.

## Abuse protection

Auth uses database-backed Better Auth rate limits, plus atomic MongoDB global and
hashed-email POST budgets (100 auth POSTs/minute overall, 5/minute per email). The global
budget intentionally protects a local development instance even without trusted proxy
IP information; it would need tuning and trusted ingress configuration before release.
Organization mutations allow 10/minute per authenticated user. Rate limit failure is
closed; database outages do not bypass it. TTL indexes clean expired counters.
Fixed-minute windows permit boundary bursts. No claim of production perimeter protection.

## Logs and errors

Authentication logging is disabled to avoid accidental credential/database disclosure.
Errors shown to users never include database details, stack traces, passwords or tokens.
Audit records contain actor IDs, action and resource metadata only. Identity lifecycle
hooks record account creation, session creation and explicit logout/session deletion.
Database TTL expiry does not emit a session deletion hook.

## Local constraints and release gates

No Git remotes, commits, publication, deployment or public listening interfaces are added.
MongoDB Atlas is configured privately; database credentials never enter tracked files.
Test databases and identities are synthetic and disposable.
Email verification and password recovery delivery are deferred until the email abstraction
is introduced. Unverified email addresses must never grant invitations or privileges.
MFA, retention/deletion workflows, security monitoring, CSP rollout, production ingress
rate limiting, backup/restore drills and platform administration are future release gates.
This foundation is locally usable, not a production release certification.

Known tooling advisory: npm audit reports a high-severity `braces` denial-of-service
advisory through Next's ESLint plugin. Registry latest braces is 3.0.3, still affected;
no compatible patched version was offered during setup. Do not blindly downgrade Next
or force an audit fix. Runtime dependency audit is checked separately. Lint only trusted
repository content until upstream resolves the advisory.

## Explicit super-admin seed

The current seed requires account ownership proof through Better Auth password
authentication before granting the matching user ID. It prompts without echo for
the existing account password; an unverified email match alone is insufficient.
Decision 007 records this hardening. No configured-database seed was run during
the product-build continuation.

The owner-requested bootstrap email is `kelvinndomamutua@gmail.com`. The terminal-only
seed command creates the account through Better Auth if needed, with a privately
entered password, and transactionally creates a singleton `platformRoles` grant and
identity audit. It never grants privilege automatically upon registration or based
on browser email/role claims. Runtime platform authorization checks the authenticated
user ID against that persisted grant. The seed refuses existing conflicting grants.
An operational platform control center is implemented. Ordinary tenant services retain membership checks. Deleting the grant revokes access
on the next authorization check.

## Protected platform reporting

Milestones 1–2 add private routes and authorized global metadata reporting. Layouts
and each exported read independently verify the current session and singleton grant.
Anonymous access redirects to sign-in; ordinary users and revoked grants receive an
unavailable response. Organization owner/admin membership never satisfies this check.
Account-menu visibility is based on a server-side lookup of the authenticated user's
own grant, and is not an authorization control for the destination.

No caches preserve platform privileges across requests. Platform routes are dynamic,
private/no-store and noindex. Operational mutations recheck the singleton grant inside
transactions and atomically append privileged audit records. Typed target confirmations
protect lifecycle, account and subscription changes; the sole administrator is protected.
Tenant suspension, read-only restrictions and account restrictions are enforced by services
and direct repositories. Session creation rejects restricted accounts without altering passwords.
No additional platform grants, impersonation, customer-content views or exports are exposed.
Read DTOs expose approved identity/business metadata and operational policy, never credential
or session tokens. Audit details return an explicit metadata allowlist.
Support access requires a reason, is actor-bound and short-lived, and exposes read-only
business metadata with a banner and explicit exit; it never bypasses tenant services.
MFA/recent authentication, infrastructure retention and backup drills remain production gates.
See decision 009 for the implemented operational security boundaries.

## Authentication landing and deep links

The server resolves the live platform grant before considering membership preferences.
Organization owners and admins cannot grant themselves platform permissions. Local
implemented deep links are validated against current memberships/grants; unknown and
external destinations fall back to the appropriate default. Destination guards remain
mandatory. The request proxy supplies only a path hint, never trusted identity claims.
See [access hierarchy decision](decisions/003-access-hierarchy.md).

## Public demo inquiries

The public inquiry action validates the configured origin, honeypot, consent and bounded
fields, and uses global/request/email database budgets. Success follows a committed
inquiry-plus-audit transaction. Records store no raw IP, password or session, and errors
return no connection details. No public inquiry read operation exists. Public homepage
rendering does not inspect authentication cookies or connect to MongoDB. Private routes
remain protected regardless of crawler configuration.

## Employee configuration and private test replies

Owner/admin membership controls employee/business settings writes and private test
chat execution/history. Other active members may read employee configuration and
business settings. Platform grants do not bypass those permissions. Repositories
recheck memberships, and configuration/settings writes include transactional metadata
audits. Configuration revisions reject stale saves. Tenant-scoped indexes enforce
one employee per organization and unique test request IDs.

Provider secrets stay server-only. Test calls use a fixed OpenAI endpoint, no tools,
bounded prompt/output sizes, timeout, structured output and local evidence checks.
Per-organization daily request/token reservations precede external calls and are
reconciled on completion. Failed/unknown calls retain their reservations. Revocation
before publication denies the result even if provider execution already occurred.
No live-provider grounding, dollar spending guarantee or human-takeover safety is
claimed by the private test slice. See decision 006.

## Website widget and consented leads

Website chat uses a public loader and `/api/widget/*` routes. Installation keys only
identify a tenant; exact allowed origins authorize browser calls. Visitor bearer
tokens are hashed at rest, origin-bound and TTL-limited. Membership sessions never
come from the widget. Inbox reads require an active tenant membership; foreign
workspaces and foreign origins are denied. Usage reservations share the organization
daily AI ledger with private tests. See decision 010.
