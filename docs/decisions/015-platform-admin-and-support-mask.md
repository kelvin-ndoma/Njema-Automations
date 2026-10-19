# 015 — Platform Admin and Support Mode masking

On 19 October 2026 platform access was expanded beyond the singleton Super Admin.

## Roles

| Role | Landing | Capabilities |
| ---- | ------- | ------------ |
| Super Admin | `/platform` | Full platform control, operator grants, settings, billing mutations, suspend |
| Platform Admin | `/platform` | Reads, Support Mode enter/exit, support tickets, restrictions, notes, incidents |
| Org owner/admin/team | `/app/[orgSlug]` | Only their organization memberships |

Org roles never grant platform access. Platform operators who also own an org still use
ordinary membership for write access inside that org.

## Support Mode (“mask”)

Both Super Admin and Platform Admin may enter an explicit, actor-bound, expiring,
read-only support grant and open `/app/[orgSlug]`. This is audited masking for diagnosis,
not password impersonation and not a write bypass.

Opening `/app/[orgSlug]` without membership also auto-enters Support Mode for platform
operators when Support Mode is enabled in platform settings. The grant is still
actor-bound, timed, read-only, and written to `supportAccess` + `platformAudit`. Org
members keep normal membership access; operators never receive write rights through
this path. The platform UI “Mask into organization” flow remains available for
reasoned, confirmation-gated sessions.

## Grants

- Super Admin remains a singleton document `_id: 'super-admin'`.
- Platform Admin grants use `_id: 'platform-admin:{userId}'`.
- Only Super Admin may grant or revoke Platform Admin.
