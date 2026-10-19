# 011 — Sales lifecycle AI workforce direction

On 19 October 2026 the product direction was corrected: Relay is a full-scale
multi-tenant AI Sales Workforce, not a website chatbot with lead capture alone.

Preserve and expand the working foundation (auth, organizations, employee
configuration, widget, consented leads, Super Admin control center). Do not rebuild
those modules. The sales lifecycle is the spine:

Inquiry → multi-turn AI engagement → qualification → lead/opportunity →
follow-up → conversion or booking → reporting.

## Executable order (do not skip dependencies)

1. **L1 — Sales agent:** Expand employee configuration with goal, qualification
   criteria, escalation rules, and allowed workflow actions. Multi-turn grounded
   replies using prior conversation turns. Structured agent actions limited to
   implemented capabilities (`continue`, `request_contact`, `escalate_human`,
   `record_qualification`). No fabricated booking/payment/quote tools.
2. **L2 — Collaboration inbox:** Human replies, assignment, and atomic AI
   takeover/resume on visitor conversations. AI must not publish after takeover.
3. **L3 — CRM core:** Contacts, leads (linked to conversations), opportunities,
   pipelines/stages, ownership, and activities — tenant-scoped with real empty
   states.
4. **L4 — AI ↔ CRM:** Approved tools that create/update CRM records from
   conversations under membership and consent rules.
5. **L5 — Follow-up automation:** Durable outbox/jobs, consent/stop, no double-send.
6. **L6 — Quotes & appointments:** Bound to opportunities; external calendar only
   after provider decision.
7. **L7 — Team management:** Verified invitations, roles UI, last-owner protection.
8. **L8 — Platform ops completion:** Widget usage in AI metrics, account management.
9. **L9 — Subscriptions/usage:** Entitlement enforcement; checkout blocked on payment
   provider.
10. **L10 — Coherence:** Navigation, onboarding, analytics, honest marketing copy.

Each slice requires UI, server authorization, persistence, and tests. No UI-only
surfaces, fabricated metrics, commits, remotes, pushes, or deployments.
