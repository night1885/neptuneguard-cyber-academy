# Pinned web composition - disposable PostgreSQL acceptance extension

Prepared against ccc6572ec2c52d50b7b365fdc7d7555545f3e695. This batch changes only the existing guarded integration test and adds this note. It changes no composition/core/adapter, schema, dependency, workflow, startup, credential configuration, Discord route or live resource.

## Prepared connected coverage - not yet executed

The original nine sequential subtests are preserved. Four additional subtests call the actual createPinnedWebRehearsal factory with the existing restricted synthetic worker pools:

1. Save and resume through the actual pinned factory/core/lifecycle/adapter; inspect the committed row's derived content_revision, page and revision; verify resumed text against the pinned HTTP SHA-256. The older arbitrary-revision namespace must remain empty for that subject.
2. Save in the parent, stop its composition, and resume through the actual pinned factory in a fresh Node process. The child emits only outcome/page/revision/content digest, not document text. This does not restart or crash PostgreSQL or validate power-loss durability.
3. Two compositions using separate worker pools concurrently attempt the initial save. Require one saved result, one conflict and one committed row at revision 1. This is selected contention coverage, not a load test or a complete fairness policy.
4. A synthetic revoked authorization and a same-size modified HTTP copy must return unavailable without issuing a worker query or creating a bookmark. Restore the exact owned temporary copy and require a successful control save. No repository lesson is edited, and no broad filesystem target is used.

There are now thirteen planned child subtests inside one parent acceptance test. Test-runner totals can include the parent separately; these are not thirteen independently completed acceptance results.

## Isolation and lifecycle

The existing literal WEB_REVIEW_DISPOSABLE_CI flag, CI flag, exact synthetic loopback owner URL, explicit PostgreSQL 16/18 major, database/owner identity and server-major checks remain intact. pg and the pinned module are dynamically imported only after the environment gates. The existing fixture schema, role creation and worker grants are unchanged and run only inside the disposable CI service database. Never substitute an academy/intake URL or connected service for this fixture.

The new composition uses the derived snapshot namespace rather than a supplied contentRevision. Its provider deadline stays within the existing 1000 ms ceiling and shutdown drain within 2000 ms. Each new composition must report drained:true before normal test teardown; it does not own or close shared pools. The parent retains pool teardown and the service container supplies database disposal. File-copy cleanup applies only to test-created temporary directories. A drain result does not establish physical cancellation or server crash durability.

Synthetic authorization is a trusted test port, not Discord membership or transaction-coupled revocation proof. The test does not inject real packet loss, reconcile uncertain writes, migrate old snapshots or implement retention/deletion policy. Existing lost-response and rollback tests remain narrower observations.

## Local validation actually performed

On 2026-11-01 local time, Node v20.20.1 syntax-checked the extended test and a materialized version of the new child script. The original test blob matched e4b22c41c1dfe59adba66ef20a0f5fef08204886; the adapter used for local import checks matched 427b44bee9e012d2f42efca5cc7231bc93b0af7e. Preservation of the original nine test bodies was checked.

Default-off execution produced one skipped parent, zero passed tests and zero failures. Three separate invocations rejected a wrong URL, missing CI admission and unsupported matrix major before dependency import or connection. Those intentional guard rejections are not PostgreSQL passes. No dependency installation, SQL parser/server, schema operation, connection, connected child process or new integration subtest ran locally.

The unchanged existing workflow already runs this named integration file sequentially after its contract suites on Node 20/22 x PostgreSQL 16/18 for applicable push/PR events. No new workflow or repository-write permission is requested. Publishing the approved source may consume CI minutes and trigger existing PR automation. Inspect the exact new head and both relevant matrix runs before claiming real composition acceptance. The prior forty green check runs cover only ccc6572, not this extension.

Independent review, save reconciliation, stale-version handling, learner/staff separation, private Discord integration, accessibility and release/staging/rollback approval remain open. No merge, live database operation, learner collection, deployment or award is authorized by this test batch.
