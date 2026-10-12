# Targeted transaction cleanup review

The process-fixture correction at 7f1aac5487cb4e6d1fef1ada4e34a35e03ffb51a passed both unit and PostgreSQL CI runs before this patch was prepared. The new patch's CI results are pending.

This targeted source review examined the certification router, activation configuration, submission validation, approval service, and access-management transactions. It is not a complete branch security audit or launch approval. Submission binds the configured agreement version and hash inside a transaction. Owner mutations check the configured owner identity before connecting. These observations do not replace route-level, live-permission, or database-role verification.

The three write services previously suppressed ROLLBACK errors and released clients normally. They now flag the client for destruction if rollback fails, release exactly once with that flag, and rethrow the original operation error. Successful rollback returns the client normally. Authorization checks, statements, audit data, student IDs, and state transitions are unchanged. node-postgres documents client.release(true) as disconnecting and destroying the checked-out client rather than returning it for reuse: https://node-postgres.com/apis/pool

Nine injected-failure tests exercise all three services with successful rollback, failed rollback, and BEGIN failure plus failed rollback. They assert release flags, original-error preservation, and absence of COMMIT. These are mock cleanup tests; they do not simulate a production network partition or establish uncertain commit outcomes. Existing PostgreSQL tests continue to run through CI.

A failed COMMIT, rollback, disconnection, or response deadline must not be taken as proof that a remote write failed. Persisted status review remains necessary before retrying uncertain actions. This disposal rule is connection hygiene, not transaction cancellation or a distributed retry protocol.

Remaining launch review includes least-privilege credentials, inherited TLS policy, actual Discord role/member overwrites, lab-session termination outside database state changes, age/retention/agreement policy approval, full learner/owner flow, and controlled shutdown/restart testing. No production migration, merge, publication, deployment, or enrollment activation occurs in this patch.
