# Repository conventions

Work only in `/home/kelvin/Automator`. The isolated Git root must resolve here.
Never modify the parent repository. No commits without explicit user approval.
Never push, manage remotes, create remote repositories, publish, or deploy.
Do not use destructive Git commands. No sub-agent delegation unless requested.

## Commands

Use npm. Commands invoke the project-local Node 22.23.3 runtime.

- `npm run dev`: localhost-only development server.
- `npm run typecheck`, `npm run lint`, `npm test`: required checks.
- `npm run test:e2e`: browser tests using a disposable MongoDB replica set.
- `npm run build:e2e`: isolated production build for browser tests on port 3100.
- `npm run build`: production build; `npm start`: localhost-only production server.
- `npm run db:indexes`: apply explicit non-destructive indexes to configured database.

## Implementation standards

Phase 1 foundation plus approved platform Milestones 1–2 only. No organization
suspension, additional administrators, or later modules. The public marketing site
and access hierarchy correction are also explicitly approved.
Strict TypeScript, Zod validation, App Router, Tailwind and shadcn-style local primitives.
Keep server-only repositories and domain services separate. Route handlers and Server
Actions only adapt transport, authenticate, and invoke services. Do not put domain
logic in React. Document material decisions in `docs/decisions`.
Use real empty states, never fabricated statistics or customer records.

## Security requirements

Authenticate from Better Auth's database session. Never trust browser role claims.
Resolve active membership and permission on every organization operation, including
page data, actions, APIs, jobs, aggregations and future AI tools. Scope references to
the authorized organization. Deny missing and revoked memberships immediately.
Do not cache tenant authorization or session claims across requests.
Use transactions for organization + owner + audit creation. MongoDB must be a replica set.
Never print secrets, URIs, tokens, passwords or customer conversations. Keep `.env`
untracked. Do not weaken origin or cookie protections to make tests pass.
Platform read repositories must independently call `requireSuperAdmin`. Never let
organization owner/admin roles grant platform access. Platform reporting returns
explicit minimal DTOs. Never return credential, session, or customer content fields.
Missing organization status is untracked, not active.
Add tests for security boundaries; run them before claiming completion.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
