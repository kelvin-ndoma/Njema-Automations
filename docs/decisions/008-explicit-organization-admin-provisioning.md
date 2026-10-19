# 008 — Explicit local organization admin provisioning

For the user's requested Njema administrator, use Better Auth to create a missing
global identity and preserve the password of any pre-existing identity. The operator
authenticates with Better Auth and verifies a persisted database session before any
organization mutation. The operation still requires active owner/admin membership;
platform access alone cannot authorize a tenant grant.

The internal repository checks the actor membership, organization and target
identity inside a transaction. It grants only an active organization-admin
membership and writes a metadata audit. Already-active admin grants are idempotent;
owner memberships are never downgraded. An audit failure rolls back the membership.
No platform grant is created or modified, and no public provisioning endpoint exists.

`scripts/create-njema-admin.ts` is an explicit one-time script for the exact account
and organization requested in this conversation. It reads the existing ignored
local password file without printing its contents. It verifies membership, platform
grant preservation, and a new account's persisted login before reporting success.
The account creation and membership transaction are separate; rerunning after a
partial failure reuses the existing account without replacing its password.

This does not implement general team management or verified-email invitations.
The explicit trusted local operator instruction is the authority for this account
assignment. Security regression tests use disposable MongoDB and synthetic identities.
