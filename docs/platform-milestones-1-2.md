# Platform control center — Milestones 1–2

Implemented locally on 11 October 2026. Stops before Milestone 3 and marketing.

## Implemented

- Dedicated `/platform` shell, desktop/mobile navigation, account controls, shared
  tables, pagination, search/status filters, status badges, accessible information
  dialog, empty/loading/error handling and refined forest-green/ivory typography.
- Real overview counts, 7/30/90-day UTC registration period, zero-filled daily growth,
  latest three organizations and five recent audit events. Organization details show
  up to eight recent organization audit events.
- Organization directory/details, active owners, regional profile and paginated
  memberships. Status is read only where recorded; missing status is never active.
- User directory/details with identity, verification, registration, organization
  memberships and platform grant indicator. No credential/session fields or customer
  conversation content are returned.
- Current session + singleton grant checked in the layout and each exported reporting
  operation. Organization owners/admins cannot access platform data. No new grants,
  mutations, suspension, billing or marketing functionality.

## Verification

- `npm test`: 40 tests passed, including direct read authorization, anonymous denial,
  owner/admin denial, grant revocation, real metrics, literal search, safe projections,
  malformed IDs, recorded status handling and existing authentication/tenant tests.
- `npm run lint`: passed with no warnings.
- `npm run typecheck`: passed.
- `npm run build:e2e`: production build passed with all five platform routes dynamic.
- `npm run test:e2e`: 7 Chromium tests passed against the production build before the
  final compact-spacing and latest-record-count refinements. Covers platform routes,
  owner denial, metrics dialog, search/pagination/details, mobile navigation, revoked
  grants, and the existing workspace creation/switching/login/logout flow.
- Fully loaded desktop/mobile screenshots reviewed in ignored `test-results/`.
- A final browser rerun after density refinements was declined. It was not retried.
  Final code has passed unit/integration tests, build, lint and type checks.
- Runtime audit: zero vulnerabilities. Existing dev-only Next ESLint/braces advisory
  remains recorded in security.md.
- No Git staging, commits, remotes, source publication, deployment, parent repository
  changes or real-database fixture seeding were performed.

## Local access and setup

Use the existing single `.env` configuration and `npm run dev`. Sign in as the seeded
super administrator, then use **Platform control center** in the account menu or open
http://localhost:3000/platform directly. Existing passwords and grants were not changed.

Browser tests use `npm run build:e2e` first and a disposable replica set on loopback
port 3100, keeping the development port 3000 available. The isolated build directory
is `.next-platform-tests`, and all test businesses/identities are development fixtures.
No new required environment variables. `NEXT_BUILD_DIR` is an optional build override
set by the test-build command, not another environment file.

## Limitations and next milestones

No organization/user lifecycle schema changes, suspension/reactivation, privilege
management, billing/AI metrics, customer-content access or marketing website. MFA and
recent-authentication controls remain production gates before high-impact mutations.
Reporting uses independent database reads, not a billing-grade transactional snapshot.
Substring search and offset pagination will need specialized indexes/cursor pagination
at larger scale. Directories show 15 rows per page; memberships also paginate.
No blocking implementation issue remains, but the final visual browser rerun is unverified.

## New files

- `src/app/platform/layout.tsx`
- `src/app/platform/loading.tsx`
- `src/app/platform/not-found.tsx`
- `src/app/platform/organizations/[id]/page.tsx`
- `src/app/platform/organizations/page.tsx`
- `src/app/platform/page.tsx`
- `src/app/platform/users/[id]/page.tsx`
- `src/app/platform/users/page.tsx`
- `src/components/platform/data-table.tsx`
- `src/components/platform/growth-chart.tsx`
- `src/components/platform/membership-table.tsx`
- `src/components/platform/navigation.tsx`
- `src/components/platform/presentation.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/dialog.tsx`
- `src/modules/platform/input.ts`
- `src/modules/platform/read-repository.ts`
- `src/modules/platform/types.ts`
- `tests/platform-operations.test.ts`
- `tests/e2e/platform.spec.ts`
- `docs/decisions/002-platform-control-center.md`
- `docs/platform-milestones-1-2.md`

## Existing files modified

- `src/modules/platform/service.ts`
- `src/components/account-menu.tsx`
- `src/app/organizations/page.tsx`
- `src/app/account/page.tsx`
- `src/app/app/[orgSlug]/layout.tsx`
- `src/app/globals.css`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `scripts/e2e-server.ts`
- `tsconfig.json`
- `next-env.d.ts`
- `.gitignore`
- `.prettierignore`
- `eslint.config.mjs`
- `AGENTS.md`
- `README.md`
- `docs/architecture.md`
- `docs/security.md`
- `docs/roadmap.md`
