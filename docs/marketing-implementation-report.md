# Public marketing implementation report

## Delivered functionality

- `/` is a static public homepage for anonymous and authenticated visitors. It never
  resolves a session or connects to MongoDB, and does not redirect members away.
- A separate marketing route-group layout provides responsive navigation, a forest-green
  and warm-ivory visual system, a mobile menu, semantic content and a comprehensive footer.
- Homepage sections include the requested headline and supporting message, product concept,
  pain points, intended workflow, capabilities, industry uses, differentiation, FAQ and CTA.
- Working destinations: `/features`, `/how-it-works`, `/solutions`, `/pricing`, `/contact`,
  `/privacy`, `/terms`, `/sign-in` and `/sign-up`. Availability links use real section IDs.
- Existing platform-first login resolution and authorized deep links are preserved.
  Super Admin defaults to `/platform`; a sole membership defaults to its workspace;
  multiple memberships use a validated preference or selector; no memberships reach onboarding.
- Demo inquiries use server-side Zod validation, origin checks, required consent, honeypot
  and global/request/email rate budgets. Inquiry and metadata audit records are saved in a
  transaction. Success follows persistence; failure never reports success. No appointment
  is scheduled and no email is sent.
- Public canonical/Open Graph metadata, local social artwork, SVG favicon, sitemap and
  robots configuration are implemented. Private pages retain noindex and server guards.
- Local/system font stacks avoid external font downloads. The illustrative product UI is
  HTML and icons, not customer data. Animations respect reduced motion.

## Files added

| Area                     | Files                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public routes and styles | `src/app/(marketing)/layout.tsx`, `page.tsx`, `marketing.css`                                                                                                        |
| Supporting routes        | `src/app/(marketing)/features/page.tsx`, `how-it-works/page.tsx`, `solutions/page.tsx`, `pricing/page.tsx`, `contact/page.tsx`, `privacy/page.tsx`, `terms/page.tsx` |
| Marketing components     | `src/components/marketing/navigation.tsx`, `shell.tsx`, `product-preview.tsx`, `content.ts`, `supporting-page.tsx`, `demo-form.tsx`                                  |
| Inquiry module           | `src/modules/marketing/validation.ts`, `repository.ts`, `service.ts`, `actions.ts`                                                                                   |
| Metadata and assets      | `src/lib/public-site.ts`, `src/app/robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `icon.svg`                                                                       |
| Verification             | `tests/demo.test.ts`, `tests/demo-actions.test.ts`, `tests/e2e/marketing.spec.ts`, `scripts/public-preview.ts`                                                       |
| Documentation            | `docs/decisions/004-public-marketing-site.md`, this report                                                                                                           |

Modified: `src/app/layout.tsx`, `playwright.config.ts`, `AGENTS.md`, `README.md`,
`docs/architecture.md`, `docs/security.md` and `docs/roadmap.md`.
The old redirecting `src/app/page.tsx` was replaced by the public route-group page.
Next regenerated build/type artifacts, including `next-env.d.ts`; artifacts remain ignored.
Existing working authentication and platform modules were reused. No new dependencies
were required. Existing uncommitted changes from earlier work were preserved.

## Verification results

| Check                   | Result                                                           |
| ----------------------- | ---------------------------------------------------------------- |
| `npm test`              | 56 passing tests across 8 files                                  |
| `npm run lint`          | Passed, no reported errors or warnings                           |
| `npm run typecheck`     | Passed                                                           |
| `npm run build:e2e`     | Production build passed; all 8 public content routes prerendered |
| Chromium browser suite  | 16 tests passed; no collected page errors                        |
| Desktop/mobile previews | Reviewed at 1440px and 390px; mobile overflow fixed and tested   |
| `git diff --check`      | Passed                                                           |

Browser coverage includes anonymous public rendering, all supporting public pages,
metadata/sitemap/robots/social image responses, desktop and mobile navigation, FAQ,
authenticated Super Admin and Owner homepage access, appropriate login destinations,
authorized deep links, existing signup/organization creation/switching/logout,
ordinary-user and cross-tenant denial, revoked platform grants, saved inquiry records
and audit events, and honest persistence failures.

The no-database server on loopback port 3101 intentionally has unusable database/session
settings. Public routes returned HTTP 200 there. Successful inquiry persistence and
private flows used a disposable local replica set on the separate port 3100 server.
The project's configured Atlas database was not read or changed during this verification;
these tests do not assert its current connectivity. Temporary verification servers stopped
when the suite completed. Screenshots are in ignored `test-results/marketing-desktop.png`
and `test-results/marketing-mobile.png`.

## Availability and remaining limits

AI sales replies, channels, qualification, employee configuration, automated follow-ups
and human handoff remain planned. No billing prices, customers, testimonials or revenue
statistics were invented. Subscription billing is not configured. Privacy and terms are
explicit development-preview notices; commercial/controller details remain launch work.
Saved inquiries have no public read API or new administration review screen. There are
no implementation blockers for the delivered local homepage. This report does not claim
commercial launch readiness or verification of the earlier development-profiler workaround.

## Run locally

```sh
npm run dev
```

Open `http://localhost:3000/`. Use the existing single `.env` for private authentication
and database-dependent submissions. Saving inquiries requires a MongoDB replica set.
Optional `SITE_URL` controls the public origin for metadata and the form origin check;
it falls back to `BETTER_AUTH_URL`, then `http://localhost:3000`. Existing variables remain
`MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. No `.env.example`
was created and credentials were not printed.

In this environment, Chromium needs the existing project-local audio library:

```sh
LD_LIBRARY_PATH="$PWD/.runtime/browser-libs/usr/lib/x86_64-linux-gnu" npm run test:e2e
```

Development remained local. No Git commits, remotes, pushes, publication or deployment
were performed. No parent repository files were modified.
