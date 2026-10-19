# 012 — Agent CRM tools and consent-aware follow-ups

Approved sales-agent actions may trigger server-side tools after a visitor reply is
published. Tools run in the same MongoDB transaction as message completion.

Implemented tools:

- `record_qualification` — CRM activity note; advances open opportunity from `new` to
  `qualified` when a consented lead exists.
- `advance_opportunity` — moves open opportunity along `new → qualified → proposal`
  only with a consented lead for the conversation.
- `schedule_follow_up` — creates an idempotent in-app `FollowUpJob` (+24h). No email/SMS
  send. Processing creates CRM activity for human continuation.
- `request_quotation` — creates a zero-amount draft quotation for human pricing, advances
  opportunity toward `proposal`, and flags the conversation as needing human review.
- `request_appointment` — creates a provisional in-app appointment request (+48h) for human
  confirmation. No calendar provider write.

Consent gate: CRM mutations and follow-up/quote/appointment requests require `QualifiedLead`
for the conversation. Payment capture and live calendar sync remain unavailable. Approval of
quotations requires a positive human-set amount.
