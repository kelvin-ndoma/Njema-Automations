# Relay — AI sales workforce

Multi-tenant Relay foundation with employee configuration, private AI test chat, and
an operational Super Admin control center. Local development only. CRM, public chat,
payment processing, invitations, workers and external integrations remain unfinished.

## Local setup

1. Use a supported Node 22 patch, preferably 22.23.3. `npm ci` installs a project-local
   Node runtime used by all scripts; the system installation is unchanged.
2. Edit the single `.env` file. Replace placeholders privately; this file is ignored by Git.
3. Configure a MongoDB Atlas database (or local replica set), a least-privilege database
   user, and Atlas network access for this machine. Docker is not required.
4. Generate `BETTER_AUTH_SECRET` using a standard secure generator, e.g.
   `openssl rand -base64 48`, and store the result only in `.env`.
5. Set `BETTER_AUTH_URL=http://localhost:3000`. Local sign-in accepts both `localhost` and `127.0.0.1` on the configured port.
6. Run `npm run db:indexes` before using the application.
7. Run `npm run dev`, then visit http://localhost:3000.

Register an account, create a workspace with currency, locale and time zone, then
use the organization switcher to move between businesses. Account menu includes logout.
Indexes and transactions are required; Atlas provides a replica set. A standalone
MongoDB server is insufficient. No connection credentials should be pasted into logs.

## Environment

| Variable             | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `MONGODB_URI`        | Private MongoDB replica-set connection string              |
| `MONGODB_DB`         | Database name                                              |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters                    |
| `BETTER_AUTH_URL`    | Exact local origin; HTTPS required for a public deployment |

## Verification

```sh
npm run typecheck
npm run lint
npm test
node_modules/node/bin/node node_modules/@playwright/test/cli.js install chromium
npm run build:e2e
npm run test:e2e
npm run build
npm start
```

Vitest and Playwright use a disposable local MongoDB replica set, never Atlas or user
data. First test run downloads MongoDB 8.2.1; browser setup downloads Chromium.
Playwright uses a separate production build; run `npm run build:e2e` first.
Tests bind to port 3100, leaving a development server on port 3000 available.
On Linux, Chromium also needs its usual shared libraries. This workspace uses an
untracked project-local audio library, with
`LD_LIBRARY_PATH="$PWD/.runtime/browser-libs/usr/lib/x86_64-linux-gnu" npm run test:e2e`.
Local sockets and these downloads may require sandbox permission. Services bind to
loopback. Tests contain clearly labeled synthetic test identities and businesses.
Production build does not require real secrets; authenticated runtime does.

## Product build continuation

The expanded product scope and executable milestones are tracked in
[docs/product-build.md](docs/product-build.md). The original roadmap is historical.
Business settings are available at `/app/[orgSlug]/settings`; employee configuration
and approved text knowledge at `/app/[orgSlug]/employee`. Owners/admins can edit;
other active members can read. Run the explicit index setup when intentionally
provisioning a development database; new unique tenant indexes are required.

`/app/[orgSlug]/test-chat` provides owner/admin-only standalone test questions and
the latest ten persisted results. `/app/[orgSlug]/widget` configures allowed website
origins and the embed snippet; `/app/[orgSlug]/inbox` lists consented visitor leads.
Privately configure `OPENAI_API_KEY` and `OPENAI_MODEL` in the ignored `.env` to
enable actual OpenAI execution. No model is selected automatically. Use a model that
supports Responses API structured outputs. The initial ceiling is 20 requests and
100,000 token units per organization per UTC day, with a 512-token output limit.
This is not a paid plan or dollar cap. Failed/uncertain calls retain their
reservations; duplicate submissions cannot call the provider twice. Human takeover
and CRM pipelines are not available yet. Test fixtures never call a real paid provider.

See [architecture](docs/architecture.md), [security](docs/security.md),
[roadmap](docs/roadmap.md), and [authentication decision](docs/decisions/001-authentication.md).

## Sole platform super administrator

Run `npm run seed:super-admin` locally. The only allowed seed email is
`kelvinndomamutua@gmail.com`. If the account is absent, the terminal prompts for a
12–128 character password without echoing it; Better Auth creates the account and
hashes the password. Existing accounts keep their passwords; the command prompts for
their current password and verifies it through Better Auth before assigning any grant.
An email match alone cannot bootstrap platform privilege. Never send the password
in chat or pass it as a command-line argument.

The role is an idempotent singleton grant linked to the persisted user ID, independent
of organization roles. The command refuses unexpected grants or replacing another
super administrator. Grant and audit insertion use a transaction. Account creation
and role assignment are separate operations; rerunning safely completes assignment
if account creation succeeds first. The platform control center is available at `/platform`.
Every platform data read calls `requireSuperAdmin`; organization membership
checks continue to apply without a platform bypass.

## Platform control center

Sign in with the seeded super-admin account, then open **Platform control center**
from the account menu or visit `/platform` directly. Organization owners/admins
have no platform access. The existing sign-in destination and workspace routes remain.

Implemented: real overview and trends; searchable organization/user directories and
details; tenant suspension/restoration, read-only and AI restrictions; internal notes;
account restriction and session revocation; plans, trials and administrative subscriptions;
AI inventory, usage, model pricing and execution allowances; support requests and explicit
expiring read-only support access; audit filters/details; system checks/incidents; and
validated platform settings. Sensitive operations require confirmation and are audited
transactionally. The sole Super Admin cannot be restricted or revoked through these controls.

New organizations persist active lifecycle status. Legacy statuses are initialized only
by the explicit authenticated migration in `scripts/migrate-lifecycle.ts`; existing states
are preserved. Never infer active status from a missing field in reporting.
Live payments, MRR, unconfigured AI providers and unavailable worker/integration telemetry
are explicitly unavailable. Provider rates calculate estimated costs, not invoices.
Passwords, tokens, password hashes and customer conversation content are excluded from
platform reporting. See [operational control center decision](docs/decisions/009-operational-platform-control-center.md).

See [platform architecture decision](docs/decisions/002-platform-control-center.md)
and [Milestones 1–2 report](docs/platform-milestones-1-2.md).

After authentication, active platform administrators land at `/platform`; ordinary
members land in their sole workspace, a validated saved workspace, or the selector.
Users without memberships start at `/organizations/new`. Authorized deep links take
priority. The control center's **My organization workspaces** action lists only your
ordinary memberships. See [the access hierarchy](docs/decisions/003-access-hierarchy.md).

For the current development framework timing workaround, restart with `npm run dev`.
The Next development indicator remains enabled. Grammarly can inject attributes that
cause hydration warnings; disable that extension for localhost.

This environment already includes a project-local Chromium audio library. When needed:

```sh
LD_LIBRARY_PATH="$PWD/.runtime/browser-libs/usr/lib/x86_64-linux-gnu" npm run test:e2e
# Also verify the development server and profiler workaround:
E2E_DEV=1 LD_LIBRARY_PATH="$PWD/.runtime/browser-libs/usr/lib/x86_64-linux-gnu" npm run test:e2e
```

Browser tests clear only the disposable test database's request budgets between tests;
production rate limits stay enforced and are covered by integration tests.

The public website is at `/` and remains visible when signed in. It renders without a
MongoDB connection. Product availability is documented at `/features#availability`;
AI sales capabilities are planned, and pricing is contact-based.

Optional `.env` setting: `SITE_URL=http://localhost:3000`. It controls the public metadata
origin and demo-form origin check; otherwise `BETTER_AUTH_URL` is used. Keep this aligned
with the origin you serve. Existing database and authentication settings are still
required for private routes and saving demo inquiries. Inquiry persistence uses MongoDB
transactions and requires a replica set (Atlas supports this).

`npm run test:e2e` starts two local verification servers: port 3100 with a disposable
replica set, and port 3101 with unavailable database/session settings to verify public
rendering and honest form failures. Neither server is exposed publicly. The test harness
stops its servers after completion. See [marketing architecture](docs/decisions/004-public-marketing-site.md).
