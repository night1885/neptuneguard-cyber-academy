# Certification activation preparation — not authorization

Status: preparation only. No publication, production migration, configuration change, deployment, or activation is authorized by this document. The branch contains runtime code, tests, and documentation; it is not documentation-only.

## Recorded baseline
PR #1 merged as 117f17e0a3c952cc9e91e8d7ab23d79f5e903900. Render deployment dep-db6j2c59fdbs73flsvk0 on academy worker srv-db1ula3tqb8s73bcqdc0 was verified live in the earlier baseline review. Startup logs reported the academy database ready and bot online. A user-provided Discord transcript exercised profile readiness, catalog, Linux path selection, course pagination, Module 1 lesson/lab/progress, and Module 2 overview/progress without displayed errors. Path selection was part of the test, so it was not wholly read-only. This does not verify new quiz awards, unlocking, certification flows, or real shutdown/restart. This document update does not re-inspect current production.

The last approved configuration set CERTIFICATION_ENABLED=false and CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED=false. No subsequent activation is authorized. The production rollout proceeded with explicit operator acceptance of incomplete pre-rollout reviews; those reviews are not retroactively complete.

## Branch implementation and evidence
Reviewed source head: 5dac39854e4a60a20ac9c6bbfd045368c0cfc1ae, PR #2 on feature/certification-activation-preparation. Unit tests and PostgreSQL 16/18 jobs completed successfully in Actions run 38455671816. These are job-level conclusions, not full raw-log review, controlled live Discord verification, legal approval, or production readiness. A subsequent documentation commit needs its own exact-head CI check.

- The routed submission path rejects missing, malformed, and below-16 reported age before enrollment checkout. Eligible submission remains pending until separate owner approval. The original low-level age-unaware factories must not become production bypasses.
- Migration 005 and age-aware writes implement minimal eligibility confirmation, confirmation time, and policy version. This is self-report evidence, not independent age verification. No date of birth, identity document, or raw-age column is introduced by this mechanism.
- Approval and reinstatement use eligibility evidence checks. Matching suspended/revoked learners may renew evidence without changing restriction status, permanent ID, approval/acknowledgment fields, or lab permissions. Owner reinstatement remains separate.
- Owner status lookups show a private current-versus-missing/invalid/outdated evidence summary. Learner own-status lookups do not select eligibility metadata.
- Disposable PostgreSQL renewal tests cover concurrency, idempotency, preserved records, and audit-failure rollback. The explicit-opt-in restricted-role fixture exercises renewal before separate owner reinstatement; its grants are not a production least-privilege specification.
- Mocked interaction tests cover authentication, private replies, replay/restart invalidation, exact 15-minute session expiry, and uncertain response deadlines with suppressed late replies. Deadline tests do not prove real network-partition recovery.

See the implementation and tests themselves for exact scope; documentation and green CI do not replace independent review. Other historical preparation documents and the PR description still need reconciliation.

## Policy and learner-facing gates
- [ ] Obtain legal review and operator approval of the revised acknowledgment-only agreement; DRAFT-2 is not approved learner content.
- [x] Record the selected policy stated in PR #2: minimum enrollment age 16; people under 16 may not register; no separate parent/guardian approval step is selected. Eligible learners still require their own acknowledgment, comprehension check, and explicit owner approval. This corrects the older guardian-consent checklist entry; it is not a new policy selection or a finding of legal sufficiency for ages 16–17.
- [ ] Have counsel assess the selected policy and agree any required changes before publication or activation. Do not imply that self-reported age establishes legal capacity or verified age.
- [ ] Approve privacy notice and retention/deletion schedules for eligibility and acknowledgment metadata, closed requests, audit records, backups, and lawful preservation. Specify start events; do not reuse retired uploaded-document schedules.
- [ ] Verify explicit electronic-acknowledgment intent, agreement-copy access, accessibility, and attribution in the actual learner flow.
- [ ] Approve one to three comprehension questions, their answer formats, server-side answer key, and check version. Never place the answer key in learner messages or logs.
- [ ] Approve final agreement text, effective date, version, and exact UTF-8 content hash; do not publish synthetic test fixtures.
- [ ] Reconcile agreement, rollout, security preparation documents, and PR description with the selected policy and current implementation.

## Database and Discord gates
- [ ] Complete outstanding raw-test-report, security, existing environment/TLS/privilege, and rollback/configuration reviews.
- [ ] Resolve the worker's actual database binding and proposed certification database/role; verify memberships, defaults, functions, search path, TLS endpoint/CA, backups, and migration ownership. Resource names and inspection-session TLS do not prove worker configuration.
- [ ] Review migrations 001–005 and separately approve exact target and execution. No automatic production migrations or production disposable-role tests.
- [ ] Provision and verify an approved restricted runtime account separately from migration ownership. Review agreement FOR SHARE lock privilege and immutable-trigger dependency without blindly copying fixture grants.
- [ ] Approve CERTIFICATION_DATABASE_URL and verified TLS settings through secret configuration, never Git or chat; do not assume academy credentials are an acceptable fallback.
- [ ] Resolve actual owner, guild, admin channel, and bot identity; inspect relevant role/member overwrites and private-response/DM behavior.
- [ ] Select controlled test context and designated test learner. Approve messages, test-record writes, migrations, configuration updates, and restart effects explicitly before execution. No new paid staging resources are authorized by this checklist.

## Controlled flow verification
All items below concern controlled live verification, not merely mocked or disposable CI results.

- [ ] Verify missing prerequisites fail closed without publishing or granting access.
- [ ] Exercise under-16 rejection, valid acknowledgment/comprehension, pending submission, owner eligibility review, owner approval, permanent-ID delivery, and authenticated status review.
- [ ] Exercise non-owner/foreign-guild denial, replay, expiry, restart-invalidated sessions, uncertain outcomes, suspension, revocation, restricted renewal, and separate owner reinstatement.
- [ ] Verify approved/restricted legacy records lacking current evidence remain appropriately blocked and have a reviewed remediation path; do not bulk-backfill confirmation or restore access automatically.
- [ ] Verify no automatic lab authorization or certificate award and no restored lab permission on reinstatement. Provider-session termination requires separate integration and approval.
- [ ] Verify real scoped shutdown/restart and persisted-status reconciliation without assuming a timeout proves failure.

## Separate final approvals
- [ ] Review exact candidate code and CI after all implementation/documentation changes.
- [ ] Separately approve agreement insertion/publication and immutable version/hash.
- [ ] Separately approve exact enrollment manifest, secret/configuration revision, service, flags, and expected restart/deployment effects.
- [ ] Separately approve dashboard/enrollment-entry publication and exact destination.
- [ ] Record activation results, monitoring, rollback target, and unresolved outcomes. Do not delete enrollment/audit records or reverse migrations automatically during rollback.

This checklist neither settles remaining legal/retention decisions nor certifies compliance, security, or activation readiness. This update performs no production operation.
