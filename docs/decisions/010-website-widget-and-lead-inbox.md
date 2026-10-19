# 010 — Website widget, visitor isolation and lead inbox

M3 delivers an embeddable script widget (not an iframe), exact allowed-origin
authorization, scoped visitor sessions, grounded public replies that share the
existing per-organization AI usage ledger, consented lead capture, and a
tenant-authorized inbox.

The installation key (`wk_…`) identifies a workspace in the loader URL only. It is
not a capability credential: every browser call must present an `Origin` that
exactly matches a saved allow-list entry for that installation. Visitor session
tokens (`vs_…`) are random bearer secrets; only SHA-256 hashes are stored, bound to
organization, conversation and the originating allow-listed origin, and expire after
24 hours via a TTL index.

Public routes live under `/api/widget/*` and set CORS to the validated origin only.
Private App Router pages continue to use Better Auth database sessions and
membership checks. Platform grants do not read visitor conversation content.
Repositories re-check organization suspension, read-only controls and enabled
installation state before reservation, provider execution, publication and lead
writes. Duplicate message/lead `requestId` values are rejected by a unique tenant
index so retries cannot double-charge usage or create duplicate leads.

AI replies reuse the private test chat grounding provider, including structured
output and exact-excerpt evidence checks. `RELAY_SYNTHETIC_AI=1` is reserved for
disposable test/e2e processes and never substitutes for a live provider claim in
production. Human takeover, multi-document knowledge and payment-backed ceilings
remain later milestones.
