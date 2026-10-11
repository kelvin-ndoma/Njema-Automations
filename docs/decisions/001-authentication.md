# ADR 001: Stable MongoDB-backed authentication

Status: accepted for Phase 1.

Evaluated Auth.js/NextAuth and Better Auth. Auth.js documentation lists NextAuth v5
as beta and v4 in maintenance mode. Better Auth 1.7.7 is a stable release with official
MongoDB adapter, email/password authentication, database sessions, Next.js integration,
origin checks and database-backed rate limits. Selected Better Auth 1.7.7 with official
`@better-auth/mongo-adapter` 1.7.7. No hosted authentication account is needed.

Passwords and sessions remain library-owned. Domain organizations/memberships use
Mongoose and a separate application permission policy, rather than an auth plugin
organization schema. No browser claim or cached cookie establishes tenant authority.

Trade-offs: two MongoDB pools; we maintain tenant authorization ourselves; email
verification/recovery delivery must be introduced before commercial release. Library
security upgrades require review and session regression tests. Identity lifecycle audit
hooks are not transactionally coupled to the domain organization transaction.

Sources checked during implementation:
- https://better-auth.com/docs/adapters/mongo
- https://better-auth.com/docs/authentication/email-password
- https://better-auth.com/docs/concepts/rate-limit
- https://authjs.dev/getting-started/integrations

TypeScript 6.0.3 was selected because the installed typescript-eslint does not support
TypeScript 7 yet. Vite is explicitly installed as Vitest's peer dependency.
