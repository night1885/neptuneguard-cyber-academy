# Default-off persisted receipt inspection candidate

This source-only library adds no startup import, listener, private entry, schema, grant, new student identifier, mutation, collection, merge or deployment. It is a partial recovery prerequisite, not completion of durable consent or restart recovery.

inspectLatest accepts trusted server-authenticated actor/guild context and one work ID. It selects at most one unexpired operation for that actor, guild, work and action, ordered by revision, from the existing immutable operations table. It then delegates current learner/course/exercise/reviewer authorization and saved-report validation to the actual core.read supplied by trusted composition. Owner self-review is rejected. The returned receipt contains identifiers, action, revision and original deadline, never report text, feedback or digest. The authorization read does handle content internally.

The result identifies the latest matching recorded operation, not the outcome of a particular lost preview/confirmation token. A missing, expired, denied or unreadable receipt remains unconfirmed. It is not proof of rollback, absence, cancellation, permission to resubmit, or permission to repeat a review. No mutation is retried and no deadline is renewed.

Four unsettled operations bound admission. A 20-2000 ms monotonic deadline suppresses late output and later core admission after a timed-out query. Timed-out work retains capacity until actual settlement. Dispose before drain; drain can wait indefinitely for an uncooperative provider and does not close borrowed pools or the core. Clock regression detection is local to the instance, not durable trusted time.

The caller must verify matching database/guild/owner bindings, read-role privileges, pool and server deadlines, and authenticated private interaction origin before use. This library does not initialize or audit the supplied pool. Existing discovery-reader column grants do not automatically include operations; this source batch changes no privileges.

Local execution passed 35 unit tests with zero failures or skips using the actual recovery module and hash-verified policy helpers with scripted SQL/core providers. Component recreation uses the same row fixture; it is not a PostgreSQL persistence or real process-restart test. No SDK or live Discord request was executed. Committed-head CI remains required.

Before activation: compose with actual restricted PostgreSQL and core; test real process death, ambiguous commit/delivery and expiry/revocation; implement approved private recovery entry and work discovery; bind any exact-attempt recovery separately; complete durable approved consent, scoped erasure and all other release gates. No release blocker is claimed fully closed by this candidate.
