# 014 — Channel scaffolding and AI commercial requests

## Channels

Customer conversations are channel-independent. Website chat remains the first live
channel. Email and WhatsApp accept tenant configuration, encrypted credential storage,
and honest activation blocking. Outbound send helpers throw until a verified provider
integration is enabled. Credentials are never returned in page DTOs.

## AI commercial requests

`request_quotation` and `request_appointment` are consent-gated agent tools:

- Quotations start at zero amount so the model cannot invent prices. Humans must set
  positive pricing before approval.
- Appointments create provisional in-app requests only. Humans confirm; no calendar
  provider write occurs.
- Both mark the conversation as needing human attention.
