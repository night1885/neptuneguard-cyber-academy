# Owner access UX batch — preparation only

This patch groups clear action labels, action-specific confirmation explanations, original queue/page context through reason forms and token confirmations, post-confirm/cancel navigation, and regression tests. It performs no production operation.

Queue context is navigation metadata only. Actor, guild, enabled-state, target, status, acknowledgment, and eligibility checks remain in the existing handlers/services. The target/action/reason/context are held in the server-side pending confirmation record. Confirm/cancel controls retain UUID token IDs, five-minute expiration, capacity limits, consumption before asynchronous work, and restart invalidation. Malformed context cannot enter the action parser.

Reinstatement copy explicitly distinguishes enrollment access from lab permissions and certification. Suspension/revocation copy states that authorization-record changes do not prove running provider sessions were terminated. Result navigation offers a fresh read instead of claiming a stale panel establishes effective access.

Tests use synthetic mocked interactions and database clients. Existing confirmation regressions remain in the suite; new tests cover contextual route/form/cancel, exact expiry, action explanations, single consumption and return controls. CI for this exact patch is pending. These tests do not establish controlled live Discord behavior, provider termination, legal compliance or production readiness.

Outstanding work includes read throttling/deadline UX, broader end-to-end database coverage of contextual mutations, mobile/live rendering review, historical documentation reconciliation, and the existing migration/account/TLS/policy/publication release gates.
