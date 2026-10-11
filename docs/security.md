# Security model

## Authentication

Better Auth owns password hashing, signed cookies, session creation and invalidation.
Passwords require 12–128 characters. Sessions expire after seven days and refresh
at most daily. Cookie caching is disabled: session state is checked in MongoDB.
Production cookies are secure; local HTTP development uses HTTP-only, SameSite cookies.
Auth POSTs require the exact configured Origin. Better Auth's own origin/CSRF checks
remain enabled. Next.js enforces Server Action origin checks. No custom session protocol.

## Tenant authorization

Roles: owner/admin may read the workspace, update organization settings and manage
members; manager/agent/viewer may read. Update/team permissions are defined for later
milestones, with no update/team endpoints in Phase 1. Platform administrator permissions
are not organization roles and will require a separate protected system in Phase 7.
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
