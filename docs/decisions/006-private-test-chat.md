# 006 — Private test chat before public widget execution

The first conversation slice is an owner/admin-only, standalone question against
the workspace's saved employee configuration. It does not expose a public endpoint,
install a widget, contact a prospect, retain a multi-turn provider conversation or
grant platform administrators access to customer conversation content.

Use the OpenAI Responses API with a configured model, structured JSON output,
`store: false`, no tools, a 30-second timeout, and 512 maximum output tokens.
Server-only environment settings are `OPENAI_API_KEY` and `OPENAI_MODEL`; neither
is returned to the browser. There is no default model or implied dollar price.
References: [text generation](https://developers.openai.com/api/docs/guides/text)
and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

Fixed higher-priority grounding instructions distinguish approved facts, business
preferences and the visitor question. Model-returned evidence must be nonempty
exact excerpts of the approved knowledge, otherwise the saved answer is the
configured fallback. This is a useful mechanical guard, not proof that a generated
answer is semantically entailed by its excerpts. Live grounding/injection evals are
still required before public release. Refusals, incomplete responses, malformed JSON
and provider failures never produce a successful AI answer.

MongoDB transactions reserve per-organization UTC-day request/token allowances
before external execution. The initial test allowance is 20 requests and 100,000
token units daily; each request conservatively reserves UTF-8 prompt bytes plus
overhead and the output limit. Completion reconciles actual reported usage; failed,
interrupted or unknown calls keep their reservations. This is a token ceiling, not
a monetary spending guarantee. Currency pricing/plan limits belong to later work.

Unique `(organizationId, requestId)` prevents duplicate external calls for a submitted
operation. Membership checks run at service entry, repository entry, before the
provider request and before publishing. Revocation prevents publication; cleanup also
requires live membership, so revoked/crashed requests can remain pending. Reservations
are never released by a blind timeout. A later audited reconciliation task can handle
these records after provider state and tenant authorization are established.

Persistence keeps question/reply, employee revision, model, reported token counts,
reservation and status. Audit events include metadata only. The current private
history lists the latest ten tests; the public conversations/inbox domain will extend
this slice rather than treating tests as customer leads.

Test harnesses always remove real provider credentials. Unit/integration tests stub
network responses with synthetic fixtures; a live response is not claimed without
private provider configuration and explicit runtime verification.
