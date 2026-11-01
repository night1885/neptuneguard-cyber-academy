# Consolidated reviewer adapter batch — candidate only

Base: 8f119047a1f429692f3e6dda7dadf7cbf3660e15, feat/fictional-reviewer-validation.

Adds a default-off detached reader, scripted unit tests, real restricted-worker PostgreSQL integration/concurrency tests, and updates the existing four-job disposable workflow. Does not change existing SQL/learner sources, enable launcher review ports, create Discord presentation, store decisions, renew live authorization or deploy. No metadata publisher or write-enabled workflow token.

The reader borrows one client, parameterizes reviewer_read, checks worker/database/privileges in that transaction, verifies response identity/hash/expiry, and contains errors. It has a separate readReport({actorId,guildId},reportId) interface; it is NOT a drop-in coordinator binding. Authenticated Discord identity and a validated isolated profile remain required at integration. The SQL actor argument trusts the service; it is not cryptographic identity. Pool acquisition/transport/COMMIT limits and hard cancellation remain embedding responsibilities.

Protected report text is returned only to the caller. Authorization is proven at SQL read time, not guaranteed through later publication. A reauthorization/tracked-presentation/retention design is still mandatory. Do not enable Discord review from this batch alone.

Real integration tests require FICTIONAL_STAGE_REVIEW_ADAPTER_SQL_TESTS=true and an empty local fi_stage_test database. Only disposable CI enables a fixture-only fi_stage_worker login. Fixtures are committed so a separate real worker connection can see them, and explicitly deleted in finally; unlike rollback-only tests they MUST NOT target connected staging or production. Connection/database assertions are guardrails, not independent isolation proof. Runs are sequential and the worker pool is bounded to one connection. Concurrency tests observe actual server lock waits and require SQLSTATE 42501, preventing lock-timeout failures from counting as authorization success.

Prepared integration coverage: authorized worker read; learner rejection; revoked/expired grant; expired/redacted report; changed reviewer; concurrent revocation; grant expiry and report expiry across proven lock waits (10 scenarios). No real PostgreSQL execution was possible locally. CI success is still required; prior green jobs cover only the older SQL candidate.

Local results are supplied separately. No full checkout regression, live SDK test, independent security review, decision persistence, learner-status delivery or deployment approval is implied.
