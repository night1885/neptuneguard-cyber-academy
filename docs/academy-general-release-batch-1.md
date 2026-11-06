# Academy general release: course request backend

## Scope
One course per learner request; another active course does not block an additional request. Each approval assigns exactly the requested course. Pending and denied requests grant no access. Existing course completion and all-courses-completed separate-review restrictions remain. Owner authorization is retained; no additional administrators are invented.

## Included
- Proposed migration 011 for immutable per-course request identities, terminal decisions and one pending request per learner/course.
- Transactional request and owner-decision service. Enrollment is locked before course/request rows, consistent with the existing lifecycle service. Course assignment, decision and audit events commit or roll back together.
- Unit validation and disposable-local-PostgreSQL integration tests. Test bodies skip integration when CERTIFICATION_TEST_DATABASE_URL is absent. A skipped suite is not passing database evidence.

## Not activated
No runtime imports, listeners, Discord messages, panel changes, SQL application, grants, main merge, Render deployment or student access changes are included. No code removes the existing learner hold. Cards/buttons/in-place navigation remain unchanged. This source commit does not make the feature ready for acceptance testing.

## Validation status
Tests are authored, not executed in this batch. No Node or PostgreSQL execution result is claimed. Run node --test test-certification-course-requests.mjs in an equipped environment; integration requires only a disposable local database named certification_test, never the academy database. Review the proposed migration against the actual schema and privilege setup before any separate application approval.

## Following integration work
Connect learner request/status cards and owner approve/deny confirmations using existing in-place presentation. Validate schema readiness and least-privilege access for the new table. Add forged-interaction and stale-confirmation tests. Trace report submission authorization at the write boundary, including races with course completion: lifecycle authorization tests alone do not prove every report submission path is protected. Keep student actions blocked until owner acceptance and explicit release approval. Report retention and recovery requirements remain separate unresolved release work.
