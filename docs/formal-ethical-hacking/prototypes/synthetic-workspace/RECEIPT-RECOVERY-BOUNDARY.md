# Detached learner receipt recovery boundary candidate

## Scope and wiring contract
Source-only nmr: route, default off. No listener, published entry button, SDK client, pool, startup wiring, production flag or live resource change. Enabled configuration requires detached-rehearsal, distinct guild/production IDs, explicit entry channel/course/exercise and trusted providers. Constructor strings are guardrails, not authentication or proof of environment separation.

Supply resolve, authorize and discoverReceipts from the already initialized disposable adapter with its real method context as needed; supply recoverSubmission from the coordinator, plus synchronous literal-true readiness and a trusted nonnegative monotonic epoch-millisecond clock. Discovery calls resolve with action submit and authorization with a projected binding. Fixed fictional adapter mappings are not real learner identity. UUID-shaped record/request/report IDs match that adapter, not every generic coordinator provider.

nmr:list opens a new ephemeral control message. Discovery is limited to five descriptors. Request, record and report IDs and provider extras are not copied into control text or custom IDs. Random server-side session tokens map indexed buttons to immutable descriptors, actor, binding, private message and a five-minute technical session. No source/report bodies are fetched. No pagination or complete history is claimed.

Selection re-resolves authority, calls coordinator recoverSubmission using the original request ID, checks exact report/revision/deadline identity, then rechecks authorization and expiry. Changed revisions require fresh discovery. Missing, expired, denied or unknown results never fall back to submission, provisioning or source reads. Retention is not reset. Reconstruction requires fresh controls; tokens are not durable state. Bounds: 100 reserved/settled sessions, five descriptors per session, 20 pending handles and 20 unsettled provider calls. Waits default to 250 ms; timeout does not cancel remote work, which remains counted until settlement. dispose clears local timers/maps, not shared providers.

## Local evidence
40 cases passed on Node 20.20.1 with zero failures, skips or cancellations against the actual new boundary and scripted adapter/coordinator/interaction doubles. Coverage includes metadata-only flow, ownership/scope, expiry, revocation/binding changes, malformed/duplicate/over-limit discovery, missing/mismatched ACK, final expiry, disposal/timeouts, clocks, reconstruction, readiness, timer retirement, sequential capacity, concurrent admission, unsettled-call bounds/recovery and public reply rejection. The timer case invokes the captured session callback deterministically; it is not a five-minute wall-clock test. A stale-output bug in the test helper was corrected before the final run.

No actual coordinator/adapter composition, PostgreSQL, live SDK serialization/transport, real identity/permissions, process restart, backup/restore, erasure, Node 22 or committed-head CI result is claimed. No independent review. Candidate CI uses read-only contents permission and existing action versions; action-runtime warnings remain unresolved.

## Limits and approval
Trusted providers must enforce scoped receipt identity and durable authorization. Checks cannot eliminate revocation/expiry versus external-delivery races. Delivered metadata controls are not recalled; delivery failure may leave an old message, but failed-publication bindings are removed. Timers/disposal are not secure erasure. Interaction objects are trusted SDK infrastructure, not public authentication.

No reviewer feedback/presentation, complete learner navigation, cleanup or operational intake activation. Issue #30 remains incomplete. No grace period, indefinite report-linked tombstone, SQL, policy, deadline, dependency, startup, account/enrollment cleanup or live setting changes. Exact repository writes and subsequent merge/live operations require approval.
