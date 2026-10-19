# 013 — Quotations, appointments, and team invitations

On 19 October 2026 Relay gained opportunity-bound commercial and team slices
without requiring external providers.

## Quotations

- Drafts store currency-minor line amounts using the organization currency.
- Creating a draft on an open opportunity may advance stage `new`/`qualified` →
  `proposal`.
- Approval is human-only and audited. Customer email/send and payment capture are
  intentionally not implemented until a delivery/payment provider is configured.

## Appointments

- Requests store title, start time, duration, and organization time zone.
- Confirm/cancel are in-app only. No calendar provider write occurs; activity and
  audit records state that sync is not configured.

## Team invitations

- Owners/admins with `members:manage` create invitations with hashed tokens
  (SHA-256), expiry, and non-owner roles.
- Acceptance requires a signed-in session whose email matches the invitation.
- Email delivery of invitations is blocked; the UI surfaces a one-time accept
  link for secure manual share.
- Last active owner cannot be revoked; actors cannot revoke themselves.

## Employee pause

- `SalesEmployee.status` is `active` | `paused` (default active for legacy rows).
- Paused employees reject public widget AI replies. Private test chat remains
  available for configuration verification.
