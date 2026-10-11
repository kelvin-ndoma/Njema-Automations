# Public marketing site

The public `/` route now lives in the `(marketing)` route group. It renders the same
homepage for anonymous visitors, platform administrators and organization members.
The group has its own navigation, footer, styles and indexing metadata, separate
from authentication screens, the platform shell and membership-based workspaces.

Post-login routing remains in `/auth/continue`, where the current database session,
live platform grant and authorized memberships resolve a landing destination. An
explicit, safe and authorized deep link takes precedence. The marketing homepage
never calls that resolver or queries a session.

## Content and presentation

Forest green, warm ivory and restrained pale-lime accents extend the existing brand.
System sans-serif and local serif fonts avoid remote font requests. The product visual
is lightweight HTML with Lucide icons, labeled as a planned product concept. No
customer data, testimonials, customer logos, subscription prices or performance
statistics are invented. AI replies, integrations, qualification, follow-ups and human
handoff are clearly marked as planned. Existing secure workspace features are labeled
as the available foundation.

Supporting public routes: `/features`, `/how-it-works`, `/solutions`, `/pricing`,
`/contact`, `/privacy` and `/terms`. Pricing is transparent and inquiry-based. Preview
privacy and terms describe implemented behavior without implying a finalized public
commercial agreement. Controller details and commercial terms remain launch work.

## Inquiry handling

`/contact` reads no database during rendering. Its public Server Action checks the
configured origin, then calls a server-only service with Zod validation, a honeypot,
required consent and bounded input lengths. Shared database-backed budgets limit
submissions globally, per request hash and per normalized email hash. Forwarded
addresses are supplementary budget hints, never trusted identity claims. Global and
email limits remain effective when an address is missing or spoofed.

The repository atomically writes a `demoinquiries` document and a `marketingaudits`
metadata event using a MongoDB transaction. A replica set is required. The inquiry
stores consent time, status and business/contact details; it stores no raw IP address,
password or session. An audit event contains only action, resource reference and time.
No email is sent and no appointment is booked. Success is shown only after transaction
completion. Database/configuration failures return a generic error, not success.

No public read endpoint for inquiries is provided. A future authorized inquiry review
workflow is separate scope; database operators can inspect saved records locally.

## SEO and local verification

`SITE_URL` optionally sets the public origin for canonical, Open Graph, sitemap and
robots metadata. It falls back to `BETTER_AUTH_URL`, then `http://localhost:3000`.
Only the origin is used; URLs containing credentials are rejected. No database secret
is read by the metadata helper. Public pages are statically rendered, while private
routes retain server authorization and noindex metadata. The sitemap lists only public
routes; robots excludes private/auth/API routes. Robots is not an access control.

Open Graph artwork is generated locally with Next ImageResponse. The favicon is an
SVG. Both avoid external asset dependencies. Animation honors reduced motion, mobile
navigation has expanded-state semantics, and native FAQ disclosure and form controls
support keyboard access.

Playwright starts an additional loopback-only production server on port 3101 with
unusable database/session settings. Public rendering and the persistence failure state
are verified there. The existing port 3100 server uses a disposable replica set to test
successful inquiry persistence, login destinations and tenant security.
