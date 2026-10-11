# Relay — AI sales workforce

Phase 1 foundation of a global, multi-industry SaaS. Local development only.
No AI execution, CRM, invitations, billing, workers or integrations are implemented yet.

## Local setup

1. Use a supported Node 22 patch, preferably 22.23.3. `npm ci` installs a project-local
   Node runtime used by all scripts; the system installation is unchanged.
2. Copy `.env.example` to `.env.local`. Replace placeholders privately.
3. Configure a MongoDB Atlas database (or local replica set), a least-privilege database
   user, and Atlas network access for this machine. Docker is not required.
4. Generate `BETTER_AUTH_SECRET` using a standard secure generator, e.g.
   `openssl rand -base64 48`, and store the result only in `.env.local`.
5. Set `BETTER_AUTH_URL=http://localhost:3000`. Always open that exact origin.
6. Run `npm run db:indexes` before using the application.
7. Run `npm run dev`, then visit http://localhost:3000.

Register an account, create a workspace with currency, locale and time zone, then
use the organization switcher to move between businesses. Account menu includes logout.
Indexes and transactions are required; Atlas provides a replica set. A standalone
MongoDB server is insufficient. No connection credentials should be pasted into logs.

## Environment

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Private MongoDB replica-set connection string |
| `MONGODB_DB` | Database name |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters |
| `BETTER_AUTH_URL` | Exact local origin; HTTPS required for a public deployment |

## Verification

```sh
npm run typecheck
npm run lint
npm test
node_modules/node/bin/node node_modules/@playwright/test/cli.js install chromium
npm run test:e2e
npm run build
npm start
```

Vitest and Playwright use a disposable local MongoDB replica set, never Atlas or user
data. First test run downloads MongoDB 8.2.1; browser setup downloads Chromium.
Local sockets and these downloads may require sandbox permission. Services bind to
loopback. Tests contain clearly labeled synthetic test identities and businesses.
Production build does not require real secrets; authenticated runtime does.

See [architecture](docs/architecture.md), [security](docs/security.md),
[roadmap](docs/roadmap.md), and [authentication decision](docs/decisions/001-authentication.md).
