# Independent access scopes and login routing

The previous sign-in form always navigated to `/organizations`. That page immediately
followed a validated `workspace` cookie. As a result, even a legitimate platform super
administrator landed in a customer workspace. The platform grant guard itself was
independent of organization roles and did not cause the routing error.

Better Auth remains the single authentication system, with database sessions and no
cookie-cached role claims. After sign-in/signup, `/auth/continue` resolves the session,
then the live singleton platform grant, then active organization memberships.

Default destinations:

| Access                             | Destination                                           |
| ---------------------------------- | ----------------------------------------------------- |
| Anonymous                          | Sign-in for protected pages                           |
| Active Super Admin grant           | `/platform`, ahead of a saved workspace               |
| One active organization membership | `/app/[orgSlug]`                                      |
| Multiple memberships               | Validated saved workspace, otherwise `/organizations` |
| No memberships                     | `/organizations/new`                                  |

Owner, admin, manager, agent and viewer roles have only organization permissions.
A removed grant is denied by every platform reporting operation immediately on its
next server request. Existing rendered browser content is not remotely erased.

Implemented local deep links take priority when authorized. External URLs, malformed
paths and unknown routes are rejected. A request proxy overwrites a routing-hint header
with the actual path and query; it does not authenticate or authorize. Server guards
carry that path into sign-in. The landing service validates it against the current grant
or membership, and destination services independently authorize again. No browser flag
or email comparison grants access. The email constant remains confined to explicit seed
administration, not runtime access decisions.

`/organizations` is now an explicit selector and never follows a cookie automatically.
The platform sidebar links to **My organization workspaces**; only actual memberships
are listed. The account menu provides a return to the control center only after a
server grant check. This is ordinary membership access, not Organization Support Mode.

Security & Audit is a functional, authorized, paginated directory of existing audit
metadata. It exposes no sessions, passwords, conversation content or audit payloads.

## Development indicator investigation

The local development log showed two recurring issue categories:

1. Hydration mismatch on `<body>` caused by `data-new-gr-c-s-check-loaded` and
   `data-gr-ext-installed`, inserted by Grammarly. Disable Grammarly for localhost
   or use a browser without extensions. Do not hide the mismatch with hydration
   suppression.
2. Negative timestamps in React Server Component development performance tracking
   during redirects, errors and aborted renders. The installed Next webpack client
   contains the two unguarded timing branches described in
   [React issue 37561](https://github.com/facebook/react/issues/37561).
   `scripts/fix-dev-performance.mjs`, run by `npm run dev`'s `predev`, adds the same
   nonnegative end-time check already used for successful render measurements.
   It changes only development profiler measurements, preserves error reporting
   and the Next indicator, and verifies its expected source shape. Remove this
   temporary workaround after an upstream release fixes the branches. Reinstallation
   requires running `npm run dev` again; restart an already-running server to load it.
   It applies to the supported webpack development command, not experimental clients.

Earlier logs also contain database connection failures. Those are separate historical
connectivity errors, not evidence of a grant or login-routing failure. Browser tests use
an isolated replica set and do not prove current Atlas network availability.
