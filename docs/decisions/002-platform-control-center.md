# ADR 002: Separate, read-only platform control center

Status: implemented for approved Milestones 1–2.

Use `/platform` with its own responsive layout and independent singleton super-admin
authorization. Preserve customer workspace URLs, login destinations and membership
checks. Expose the platform entry through the account menu only when the server
confirms the authenticated user's grant. No additional administrators are introduced.

Each exported reporting operation authorizes afresh; layout checks are supplementary.
Use explicit projections and DTOs for global business and identity metadata. Native
MongoDB reporting joins existing Mongoose domain collections and Better Auth identity
collections without changing either model's ownership. No credentials, sessions,
customer documents, or conversations are queried for presentation.

Status is not part of the current organization model. Show missing status as untracked;
never infer that an organization is active. If existing records contain status, reflect
it read-only. Do not migrate or implement suspension until Milestone 3.

All-time totals, latest records and selected-period UTC growth have distinct labels.
Charts come from creation-date aggregates and have a tabular alternative. Data is read
on request; no tenant or platform authorization is cached. Individual queries can
observe different moments during concurrent writes; this is operational reporting,
not billing reconciliation. Escaped substring search and offset pagination fit the
initial dataset and will need more specialized indexing at scale.

Limit navigation to implemented overview, organizations and users. No dead links to
billing, AI, settings or marketing. Tests use synthetic fixtures in disposable replica
sets, a separate build output and localhost port 3100; no real tenant data is seeded.
