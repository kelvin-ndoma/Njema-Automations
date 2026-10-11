# Architecture

## Runtime and boundaries

Next.js 16.4 App Router, React 19.3, strict TypeScript 6, Tailwind 4, locally owned
shadcn/ui-compatible primitives, Radix accessible menus, Lucide icons, React Hook
Form and Zod. Node 22.23.3 is installed in this project, not system-wide.
The product name Relay is a working UI name, not a registered brand decision.

Modular monolith: pages/actions → session verification → organization services →
server-only repositories → MongoDB. Mongoose owns domain models; Better Auth uses
its official native MongoDB adapter in the same database. Separate connection pools
are intentional and process-cached; configuration and connections are lazy so builds
never contact Atlas. Domain models use explicit index provisioning, not autoIndex.
No Redis, queue or background worker exists in Phase 1.

## Data model

- Better Auth: `user`, `account`, `session`, `verification`, `rateLimit`.
- `organizations`: unique slug, name, ISO currency, IANA time zone, locale, timestamps.
- `memberships`: organization ObjectId, global user string ID, role, active/revoked status.
  Unique `(organizationId, userId)` and `(userId, status)` lookup index.
- `auditevents`: organization, actor, action, resource, timestamp.
- `identityAudit`: global identity/session lifecycle events; no credentials or tokens.
- `mutationlimits`: atomic counters keyed by a scoped identity and minute, TTL expiry.

Shared tenant collections must have organizationId. Organization reads resolve a
slug internally, check a current membership, and only then return a public DTO.
Listing organizations first resolves active memberships. Slugs, cookies and client
claims never establish authority. Native auth user IDs are stored as strings in
memberships; domain entity IDs use ObjectId.

## Atomicity

Organization, owner membership and creation audit are committed in one MongoDB
transaction. Duplicate slug creation rolls back all three. Better Auth's adapter is
passed its client so authentication operations can use transactions. A MongoDB
replica set or sharded cluster is mandatory; Atlas is supported without Docker.
Identity audit hooks are append-only lifecycle notifications, not part of the domain
organization transaction. Switching revalidates access, writes an audit event, and
sets an HTTP-only preference cookie; that cookie never grants access.

## Routes implemented

`/sign-in`, `/sign-up`, `/organizations`, `/organizations/new`, `/app/[orgSlug]`,
`/account`, `/api/auth/[...all]`. Root redirects to organization selection.
Data pages and actions independently authenticate; the layout is not the only guard.

## Future modules

Onboarding/settings/team → employees/knowledge/AI → website chat/conversations →
CRM/qualification/pipelines → quotations/scheduling/follow-ups → analytics/usage/
billing/platform administration → other channel integrations. All remain unimplemented.
Provider abstractions and durable jobs will be selected in their relevant milestones.
