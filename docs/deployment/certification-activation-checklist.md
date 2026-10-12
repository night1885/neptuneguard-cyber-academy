# Certification activation preparation — not authorization

Status: preparation only. No publication, migration, configuration change, deployment, or activation is authorized by this document.

## Recorded baseline
PR #1 merged as 117f17e0a3c952cc9e91e8d7ab23d79f5e903900. Render deployment dep-db6j2c59fdbs73flsvk0 on academy worker srv-db1ula3tqb8s73bcqdc0 was verified live. Startup logs reported the academy database ready and bot online. A user-provided Discord transcript exercised profile readiness, catalog, Linux path selection, course pagination, Module 1 lesson/lab/progress, and Module 2 overview/progress without displayed errors. Path selection was part of the test, so it was not wholly read-only. This does not verify new quiz awards, unlocking, certification flows, or real shutdown/restart.

The last approved configuration set CERTIFICATION_ENABLED=false and CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED=false. No subsequent activation is authorized. The production rollout proceeded with explicit operator acceptance of incomplete pre-rollout reviews; those reviews are not retroactively complete.

## Policy and learner-facing gates
- [ ] Obtain legal review and operator approval of the revised acknowledgment-only agreement; DRAFT-2 is not approved learner content.
- [ ] Select minimum age and any minors/guardian process; verify how the actual workflow enforces that decision.
- [ ] Approve a privacy notice and separate retention/deletion schedules, including start events, closed requests, audit records, backups, and lawful preservation. Do not reuse retired uploaded-document schedules.
- [ ] Verify explicit electronic-acknowledgment intent, agreement-copy access, accessibility, and attribution in the actual learner flow.
- [ ] Approve one to three comprehension questions, their answer formats, server-side answer key, and check version. Never place the answer key in learner messages or logs.
- [ ] Approve final agreement text, effective date, version, and exact UTF-8 content hash; do not publish synthetic test fixtures.

## Database and Discord gates
- [ ] Complete outstanding raw-test-report, security, existing environment/TLS/privilege, and rollback/configuration reviews.
- [ ] Resolve the worker's actual database binding and the proposed certification database/role; verify memberships, defaults, functions, search path, TLS endpoint/CA, backups, and migration ownership. A resource name or inspection-session TLS does not prove the worker's configuration.
- [ ] Review migrations 001–004 and separately approve their exact target and execution. No automatic migrations or production disposable-role tests.
- [ ] Provision and verify an approved restricted certification runtime account separately from migration ownership. Review the agreement FOR SHARE lock privilege and immutable-trigger dependency without blindly copying fixture grants.
- [ ] Approve CERTIFICATION_DATABASE_URL and verified TLS settings through secret configuration, never Git or chat; do not assume academy credentials are an acceptable fallback.
- [ ] Resolve actual owner, guild, admin channel, and bot identity; inspect every relevant role/member overwrite and private-response/DM behavior.
- [ ] Select a controlled test context and designated test learner. Approve any messages, test-record writes, migrations, configuration updates, and restart effects explicitly before execution. No new paid staging resources are authorized by this checklist.

## Controlled flow verification
- [ ] Verify missing prerequisites fail closed without publishing or granting access.
- [ ] Exercise acknowledgment, failed comprehension, pending submission, owner approval, permanent-ID delivery, and authenticated status review.
- [ ] Exercise non-owner/foreign-guild denial, replay, expiry, restart-invalidated sessions, uncertain outcomes, suspension, revocation, and reinstatement.
- [ ] Verify no automatic lab authorization or certificate award and no restored lab permission on reinstatement. Provider-session termination requires separate integration and approval.
- [ ] Verify real scoped shutdown/restart and persisted-status reconciliation without assuming a timeout proves failure.

## Separate final approvals
- [ ] Review exact candidate code and CI after any implementation changes.
- [ ] Separately approve agreement insertion/publication and its immutable version/hash.
- [ ] Separately approve the exact enrollment manifest, secret/configuration revision, service, flags, and expected restart/deployment effects.
- [ ] Separately approve dashboard/enrollment-entry publication and exact destination.
- [ ] Record activation results, monitoring, rollback target, and unresolved outcomes. Do not delete enrollment/audit records or reverse migrations automatically during rollback.

This preparation branch edits documentation only. It neither settles unresolved policy decisions nor certifies legal compliance, security, or activation readiness.
