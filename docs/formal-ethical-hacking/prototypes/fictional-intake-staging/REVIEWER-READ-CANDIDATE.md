# Reviewer read candidate — NOT VALIDATED FOR ACTIVATION

Baseline: 0d77f387d4bea59928bc57c7c69216c3e2368199. Additive source only; no startup imports, workflow changes, migration installation, CI dispatch, or deployment.

The migration requires explicit isolated database/admin/worker bindings. Never run it against production. It returns protected report text; do not connect it to Discord until authenticated identity, private tracked delivery and retention are implemented. Actor arguments trust the service; they are not cryptographic Discord authentication. Database grants, role memberships, ownership, logging and backups require independent review.

The Node SQL contract is default-off behind FICTIONAL_STAGE_REVIEW_SQL_TESTS=true, distinct from the baseline SQL gate. It requires an empty local disposable fi_stage_test database, postgres test admin and fi_stage_worker. Install the baseline schema and candidate function separately in disposable CI first. The test uses savepoints and an outer ROLLBACK. Never enable it against the connected staging service. Exact database/host checks are guardrails, not isolation proof.

Prepared: one authorized-read scenario and 17 denial scenarios. Expired/future fixtures use statement_timestamp(), a single statement-stable time, rather than separate clock_timestamp() samples that could violate the exact 24-hour constraint.

Validation here: Node syntax and default-off skip only; SQL has not been parsed/executed. No PostgreSQL test has passed. Full regression, concurrent lock/deadline/revocation tests, adapter integration, review persistence and presentation remain incomplete. The previous 33 authorization-component tests and 9 acknowledgement tests are separate and are not included in this commit.
