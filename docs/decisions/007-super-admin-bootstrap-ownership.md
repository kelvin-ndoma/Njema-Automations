# 007 — Verify account ownership before platform bootstrap

Public registration does not currently require email verification. Therefore a
matching email alone is insufficient evidence that an existing account belongs to
the operator who intends to bootstrap the sole platform administrator.

The terminal-only seed now asks for the existing account password without echo,
authenticates it through Better Auth, and passes the authenticated identity to the
transactional grant repository. Newly created accounts authenticate through the same
path. The repository rejects missing/mismatched authenticated identities before
creating grants or audit events. Existing passwords/grants are never replaced.

This is an explicit local bootstrap boundary, not an automatic registration grant,
email-verification substitute for invitations, or runtime MFA. No seed command was
run against the configured database while implementing this change.
