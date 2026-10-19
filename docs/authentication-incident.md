# Sign-in unavailable — 12 October 2026

Feature development is stopped pending resolution of the configured database's
external connection failure. Accounts, passwords, sessions, memberships and platform
grants were not reset, replaced or reassigned.

## Reproduction and evidence

- Existing loopback server: both localhost aliases return HTTP 503 for
  `/api/auth/get-session`. A sign-in POST with deliberately invalid diagnostic
  credentials and the correct origin returns 503, `Authentication service unavailable.`,
  and no session cookie. A password failure would ordinarily return 401.
- All required environment names are present and `getEnv()` validation passes;
  the authentication origin is loopback. No values were displayed.
- Independent native-driver read-only ping fails outside the sandbox with
  `MongoServerSelectionError`, observed topology `ReplicaSetNoPrimary`, and
  `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` from every discovered node.
- DNS SRV discovery succeeds and finds three nodes. Direct TCP connects. Both
  default certificate-verified TLS and a diagnostic TLS 1.2 handshake fail with
  the same remote TLS alert. TLS verification was never disabled.
- Recent feature diffs do not change auth configuration, connection configuration,
  auth HTTP routing, credential submission or the client error helper. The seed
  command changed, but was not run against the configured database.

## Exact error path

`AuthForm` calls Better Auth's sign-in client. The auth route delegates to
`handleAuth`, which validates the origin and enforces the database-backed global
request budget before password verification. `enforceLimit` invokes `connectDb`.
The connection cannot complete TLS, `connectDb` throws its sanitized unavailable
error, and `handleAuth` returns 503. `authErrorMessage` maps server errors to the
reported sign-in message. Native session reads also fail closed on the unavailable
database. No configured-database session persistence could be verified.

The observed root failure is remote TLS connection rejection, not an invalid
password, role mismatch, origin failure, or missing environment name. An Atlas
access-list/network policy is a plausible cause, but it cannot be confirmed without
the project's Atlas settings/logs. `ReplicaSetNoPrimary` here is the client's
observation after failing every handshake, not proof of an actual cluster election.

## Corrective action

1. In the Atlas project, confirm the cluster is active.
2. In Security / Network Access (IP Access List), verify an active, non-expired entry
   for the application's current public egress IP. Use the app host's egress IP,
   which may differ from the browser machine's IP. Add only that required IP/range.
3. If it is already allowed, inspect Atlas connection diagnostics and the application's
   VPN/proxy/firewall path for TLS rejection on database connections. TCP alone is
   not proof that TLS/database access is authorized.
4. Run `npm run auth:check` from the application host with permitted network access.
   It performs read-only ping/topology checks and an anonymous loopback HTTP request,
   outputs fixed diagnostic categories only, and never resets or reads user records.
5. Once the ping and HTTP endpoint pass, retry sign-in with the existing account.
   Do not reseed, reset passwords, recreate users or relax certificate/origin checks.

Sources: [MongoDB connection troubleshooting](https://www.mongodb.com/docs/manual/troubleshooting/server-selection-timeout/)
and [Atlas connection prerequisites](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

## Regression coverage and current verification

`tests/auth-http-failure.test.ts` covers fail-closed budget dependency failures,
native session failures, secret-free responses, preserved origin checks and recovery
of the normal auth path without configuration changes. These are synthetic failure
tests, not proof that Atlas has recovered.

Final results: `npm run typecheck` and `npm run lint` passed;
`npm test -- tests/foundation.test.ts tests/auth-origins.test.ts tests/auth-http-failure.test.ts tests/platform.test.ts`
passed all 27 tests across four files against disposable MongoDB; `npm run build:e2e`
passed the isolated production build. `npm run auth:check` still failed the configured
MongoDB ping with the TLS code above and observed HTTP 503 on the local session
endpoint. Existing-account login is not restored or verified; feature development
remains stopped pending external connection recovery.

## Subsequent recovery and requested organization admin setup

The later user-requested organization count query connected successfully and found
one organization, Njema. The exact external Atlas/network change is not known.
No connection string, TLS setting, existing password or platform grant was changed
by the agent to restore connectivity.

The user subsequently requested a new organization admin. Provisioning authenticated
the existing operator, verified the operator's active organization management
permission, created the specified account through Better Auth, and transactionally
assigned only an organization-admin membership with a metadata audit. Existing
account passwords and memberships were preserved. The platform grant count was
unchanged and the target had no platform grant.

Actual local HTTP verification for the requested new account: sign-in 200, persisted
session identity verified, Njema workspace 200. Login is working again on that path;
initial TLS failures above remain historical evidence, not current login status.
