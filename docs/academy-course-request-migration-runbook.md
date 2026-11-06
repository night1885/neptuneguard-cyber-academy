# Academy course-request migration runbook

Status: review proposal only. Saving this document does not authorize live changes.

## Resolved target
- Render workspace: My Workspace (tea-db1p6jp42hec73dnfs4g).
- Academy database: neptuneguard_cyber_academy_db (dpg-db1touu7bikc73bl9vhg-a).
- Existing academy worker: neptuneguard-cyber-academy (srv-db1ula3tqb8s73bcqdc0), main branch, automatic deployment off at inspection.
- Worker-shell diagnostic through CERTIFICATION_DATABASE_URL returned login/effective role certification_registration_pilot and verified TLS. This is not proof of every running application's connection-selection path. No credentials recorded.

## Verified permission findings
The application connection role does not inherit the table owner. It already has enrollment SELECT and column-level UPDATE permissions, so do not add a broad enrollment UPDATE grant just for row locking. Audit insert grants already cover actor, subject, action and details, but not created_at. Audit sequence USAGE exists. Course-enrollment access is missing. The request table was absent at inspection.

## Preconditions before live approval
Recheck the target database, execution role, public schema, object ownership, effective grants and absence of the request table/function/index. Review migrations 001-010 against the actual schema; earlier checks did not certify every dependency. Verify an appropriate backup/recovery point; none is claimed here. Confirm the existing lifecycle trigger prevents course-key identity changes before using the column-specific lock grant. Confirm worker feature settings and preserve the learner hold. Database grants expand existing credentials even with feature flags off. Do not copy credentials into chat or GitHub.

## Proposed owner-executed sequence
Use a separately approved owner connection, not the worker's restricted login. Pin and review migrations/011-course-requests.sql from the approved PR revision. Use public as the explicit execution search_path and stop on the first SQL error. The migration already contains BEGIN and COMMIT: do not claim migration plus subsequent grants are one atomic transaction or nest it in a surrounding transaction.

1. Apply the reviewed migration 011 only after live approval.
2. After its successful commit, apply the following separately approved grants in their own transaction:

```sql
BEGIN;
GRANT SELECT ON TABLE public.certification_course_enrollments TO certification_registration_pilot;
GRANT INSERT (discord_user_id, course_key, status, assigned_at, assigned_by) ON TABLE public.certification_course_enrollments TO certification_registration_pilot;
GRANT UPDATE (course_key) ON TABLE public.certification_course_enrollments TO certification_registration_pilot;
GRANT INSERT (created_at) ON TABLE public.certification_audit_events TO certification_registration_pilot;
GRANT SELECT, INSERT, UPDATE ON TABLE public.certification_course_requests TO certification_registration_pilot;
COMMIT;
```

No DELETE, ownership, schema CREATE, audit UPDATE, or role membership is proposed. These grants cover the new request service, not every legacy admin or course-completion operation.

## Post-change verification and release gates
Verify effective privileges using the actual application connection. Run the existing request-readiness validator through that connection after the approved code is available; verify the pending-request unique index and enabled immutability trigger. A pure BEGIN READ ONLY transaction cannot test SELECT FOR UPDATE; any lock probe needs separate approval and must use a no-row predicate without learner data. Do not create synthetic learner records in the academy database. Keep request/student feature activation separate from schema approval. Owner Discord acceptance, deployment, merge and student activation each remain separately gated.

## Failure and recovery
If migration execution fails, stop and confirm transaction rollback before retrying. If migration committed but grants failed, leave feature settings unchanged, preserve the new objects and reconcile permissions; do not blindly rerun CREATE statements. If requests have been recorded, preserve records and audit history. No automatic DROP, DELETE or blanket REVOKE is authorized. Restore only the exact grants changed by this release after checking the captured baseline and dependencies. No full-programme or report-submission authorization sign-off is implied.
