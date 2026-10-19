# 005 — First employee configuration and business setup

The expanded product scope approved on 12 October 2026 is tracked in
`docs/product-build.md`; the original roadmap is historical.

Start with one sales employee per organization, enforced by an explicit unique
organization index. The first knowledge base is bounded approved plain text within
the employee configuration, not a crawler, uploaded files, embeddings or arbitrary
external URLs. This supports the next grounded conversation slice without unsafe
fetching or premature infrastructure. Multi-document knowledge can follow later.

Owner/admin permissions control configuration and business-settings writes. Active
members may read. New employee services authenticate using the current database
session, resolve membership, then call repositories that independently check
membership again. Transactional writes recheck permissions and pair changes with
metadata-only audit events. Every record reference includes organization scope.

Configuration revisions prevent stale forms from overwriting newer knowledge.
Creation uses revision zero and the unique index; updates compare/increment revision.
No live/active state or AI execution is implied by saving configuration. Slugs are
immutable in business settings to preserve existing URLs. Regional settings reuse
existing Zod validation and settings writes are audited transactionally.

Explicit indexes must be provisioned through the existing non-destructive setup
command; development/test fixtures provision them only in disposable databases.
