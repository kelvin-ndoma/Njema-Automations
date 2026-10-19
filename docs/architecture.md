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

## Website widget (M3 slice)

`/app/[orgSlug]/widget` configures allowed origins and embeds `/api/widget/loader`.
Public visitor APIs under `/api/widget/*` authorize by exact Origin allow-list and
origin-bound visitor tokens. `/app/[orgSlug]/inbox` lists consented leads and recent
website conversations for active members. Human takeover remains future work.

## Future modules

Team invitations → human takeover/assignment → CRM pipelines → quotations/scheduling/
follow-ups → customer analytics → payment checkout → other channel integrations.
Provider abstractions and durable jobs will be selected in their relevant milestones.

## Platform reporting (Milestones 1–2)

`/platform`, `/platform/organizations`, `/platform/organizations/[id]`,
`/platform/users`, `/platform/users/[id]` are implemented with a dedicated protected
shell. The singleton `platformRoles` grant is checked against the current database
session user ID. Organization roles are independent; no tenant-service bypass exists.

Every exported operation in `src/modules/platform/read-repository.ts` calls the
super-admin guard before accessing data, independently of layouts. Reporting uses
the native MongoDB driver to join Mongoose-owned organization/membership records
with Better Auth-owned identities. Domain writes remain in their existing services.
Projection allowlists and explicit DTOs exclude account credentials, tokens, private
notes and customer content. Native auth ObjectIds and string membership user IDs
are normalized only for identity joins. No browser roles are trusted.

Directories paginate 15 records with stable creation-date/ID ordering, bounded
search input and literal escaped regex search. Membership detail views paginate too.
Search is suitable for the initial dataset; dedicated search indexes and cursor
pagination can replace substring search/offset pagination as the dataset grows.

Overview totals are all-time counts; new organizations and growth use the selected
7/30/90 UTC calendar-day window through page load. Missing dates are not guessed.
Absent lifecycle status is explicitly unavailable, never treated as active. Latest
organizations and audit activity are all-time latest records. Independent database
reads are not a transactional reporting snapshot and can differ during concurrent writes.
Platform pages are dynamic, private/no-store and excluded from indexing.

Shared UI includes responsive platform navigation, compact tables, pagination,
search/status filters, badges, accessible Radix dialogs, UTC date formatting and
Recharts growth with a daily-count table alternative. The test runner uses a separate
build directory and loopback port 3100; fixtures exist only in disposable test databases.

## Public marketing surface

`src/app/(marketing)` is a public route group with independent navigation, footer,
scoped design styles and metadata. `/` renders public content for every visitor and
has no authentication or database dependency. `/auth/continue` remains the server-side
post-login destination resolver. Private layouts and repositories retain authorization.

`src/modules/marketing` owns public inquiry validation, rate-limited submission and
transactional persistence plus audit metadata. Inquiry records have no public read API.
See [the marketing decision](decisions/004-public-marketing-site.md).
