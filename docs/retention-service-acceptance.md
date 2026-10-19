# Service-to-retention acceptance scope

This test connects the existing submission, approval, course assignment/completion, and application-closure services to both read-only retention previews in one disposable PostgreSQL schema. It adds no application runtime wiring, learner-facing publication, live-record inspection, deletion executor, scheduler, production migration/grant, configuration change, merge, or deployment.

Coverage: pending and approved-without-assignment records are not completion candidates; partial course completion leaves the shared record ineligible and other assigned course authorization intact; all-course completion ends course authorization and reaches the shared-record timing boundary without deleting the shared record or changing its academy ID; explicit application closure reaches its own deadline; retries do not alter existing closure/completion records or add audit rows. Injected audit failures roll back completion and closure, and those failed actions never become preview candidates.

An application-closure audit event is checked at occurrence, one microsecond before its independent three-calendar-month expiry, and exactly at expiry. PostgreSQL UTC calendar-month arithmetic supplies the expected audit boundary independently of the JavaScript preview. Prior preview unit/integration tests continue to cover month-end/leap-year clamping, large IDs, pagination, and dependency blockers.

Every preview runs through a separate SELECT-only login. Audit access is limited to event_id and created_at columns. Ordered JSON snapshots preserve database timestamp precision and check that enrollment, course, lab, and audit rows are unchanged across preview calls. Test lifecycle actions use the fixture administration connection; this is service integration coverage, not new proof of restricted write-role behavior, real Discord delivery, deployed authorization, or production deletion acceptance. Existing restricted-role and simulated-Discord suites remain separate gates.

CI runs this suite on PostgreSQL 16 and 18 with explicit loopback certification_test and role-DDL opt-ins. Schema/role creation, injected failures, and cleanup are confined to disposable test fixtures. A skipped suite is not acceptance. No new passing result is established until CI executes this commit.

Preservation review, provider/backup behavior, complete dependency handling, actual restricted deletion, scheduling/retries/alerts, final document approval, and release acceptance remain outstanding. Policy periods and eligibility rules are unchanged.
