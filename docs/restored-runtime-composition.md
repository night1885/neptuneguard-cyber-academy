# Restored application/runtime composition coverage

The composed test uses createRestoredCertificationApplication with the real attachCertificationRuntime and the restoration router supplied by that application factory. Only the database/client/provider boundaries are mocked. This closes a test-composition gap between the separate application lifecycle tests and runtime/router tests; it does not add new runtime behavior or establish deployment acceptance.

Coverage includes certification readiness before app.ready, original admin dashboard/curriculum navigation, registration-form opening without writes, denial of direct lesson/help routes and forged section sessions, unauthorized/wrong-guild admin rejection before record access, and application shutdown draining a real runtime-owned pending query before pool/client closure. Unexpected SQL, non-SELECT statements, legacy profile/progress/badge queries, database connections for writes, and channel publication fail the fixture.

The test does not establish successful learner ID login, actual registration submission/approval, complete course delivery, real PostgreSQL role behavior, real Discord visibility/delivery, retention execution, or provider/backup handling. Those remain separate tests and release checks. Existing real-database and simulated-Discord lifecycle suites are not replaced. The standard certification unit-test glob includes this file; no workflow change is needed. Passing is not claimed until CI runs the new commit.

No application runtime code, package start command, environment flags, permissions, live records, messages, or agreements change. The default entry remains instructor.js; restoration stays staged. No merge or deployment is authorized.
