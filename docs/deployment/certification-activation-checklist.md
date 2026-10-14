# Certification activation preparation — not authorization

Status: preparation only. This document does not authorize merge, publication, production migration, configuration change, deployment or activation. The branch contains runtime code, migrations, tests and documentation; it is not documentation-only.

## Historical baseline — not a current production inspection
PR #1 merged as 117f17e0a3c952cc9e91e8d7ab23d79f5e903900. Earlier baseline notes recorded Render deployment dep-db6j2c59fdbs73flsvk0 on worker srv-db1ula3tqb8s73bcqdc0 as live, with startup logs reporting the academy database ready and bot online. A user-provided Discord transcript exercised profile readiness, catalog, Linux path selection, course pagination, Module 1 lesson/lab/progress and Module 2 overview/progress without displayed errors. Path selection was not wholly read-only. These observations do not verify new quiz awards, unlocking, certification flows or current shutdown/restart behavior.

Previously approved settings were CERTIFICATION_ENABLED=false and CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED=false. They are historical observations, not newly verified environment values. The earlier rollout proceeded with explicit operator acceptance of incomplete reviews; those reviews are not retroactively complete. Reinspect current production before any release decision.

## Verified candidate and evidence
Evidence snapshot: candidate 8d1682e345305931c559e68608ff3b867eb64b9b on feature/certification-activation-preparation, PR #2. Unit tests and PostgreSQL 16/18 jobs succeeded in Actions run 38518254206. Job conclusions were inspected; full raw-log and independent security review remain incomplete. The documentation commit containing this checklist requires its own exact-head CI check. The PR description was separately reconciled to this candidate; later heads must not inherit its evidence without checking.

### Branch implementation
- Routed submission rejects missing, malformed and below-16 reported age before enrollment checkout; eligible requests remain pending until owner approval. Age-unaware low-level factories must not become production bypasses.
- Migration 005 and age-aware writes store minimal self-reported eligibility confirmation, confirmation time and policy version, not independent age verification, birth date, identity documents or a raw-age column. Absent schema evidence uses NULL for all three evidence fields; test-fixture correction does not authorize legacy backfill.
- Approval and reinstatement require current evidence. Restricted learners can renew evidence without changing restriction status, permanent ID, original approval/acknowledgment or lab permissions. Reinstatement is separate.
- Owner-only private summaries distinguish current from missing, invalid or outdated evidence; learner self-status does not select eligibility metadata.
- Owner access actions have clear labels/effect explanations, reason forms, five-minute one-use confirmation tokens and contextual queue/page return navigation.
- Owner reads share a default 60-read/minute budget, one in-flight read per actor and a ten-second response deadline. A response deadline suppresses late replies, not database work; pending work keeps the read guard busy. Approval/access/submission mutations are excluded from this owner-read wrapper.

### Automated coverage completed at the evidence snapshot
- [x] Existing submission/renewal authentication, private-response, replay/restart, session-expiry, concurrency/idempotency and audit-rollback regressions passed with the suite. Restricted-role fixture grants are not a production least-privilege specification.
- [x] Disposable PostgreSQL contextual deny/suspend/revoke/reinstate through the router; cancellation without writes, simultaneous same-token replay, stale independent confirmation, permanent-ID/evidence preservation, lab non-restoration, missing-evidence rejection and audit-failure rollback.
- [x] Mocked owner-read lookup/selection budget sharing, exactly-once lookup admission, authorization boundaries, failures, timeout and late-response suppression.
- [x] Actual runtime/router with synthetic transport and pool double: detach after the default read deadline, late success/failure, stopped admission, repeated detach and waiting for pool close.
- [x] Actual certification PostgreSQL pool factory/read guard: pool close waits for a pending timed-out read ending successfully or by statement timeout; no late second reply.

These checked items are automated coverage only, not live Discord or production sign-off. Existing disposable process tests exercise generic SIGTERM/SIGINT shutdown and watchdog behavior; they do not establish an end-to-end timed-out-read process-signal or hosting-provider restart result. Real network partitions remain untested by these batches.

## Policy and learner-facing gates
- [x] Record selected policy: minimum enrollment age 16, under-16 registration prohibited, no separate parent/guardian approval step selected; own acknowledgment, comprehension and owner approval required. This is not a finding of legal sufficiency for ages 16–17.
- [ ] Obtain legal review and operator approval of the acknowledgment-only agreement; DRAFT-2 is not approved learner content. Counsel must assess the selected age policy and any required changes before publication/activation.
- [ ] Approve final text, effective date, immutable version and exact UTF-8 content hash; never publish synthetic fixtures.
- [ ] Approve privacy notice and retention/deletion/backups/lawful-preservation schedules for eligibility, acknowledgment, closed requests and audits, including start events; do not reuse retired uploaded-document schedules.
- [ ] Verify explicit electronic-acknowledgment intent, agreement-copy access, accessibility and attribution in the actual flow.
- [ ] Approve one to three comprehension questions, formats, server-side key and check version; do not expose keys in learner messages/logs.
- [ ] Reconcile remaining agreement, rollout and security documents; review legacy-record remediation without fabricated evidence, bulk eligibility backfill or automatic restoration.

## Database and Discord gates
- [ ] Complete raw-test-report, security, environment/TLS/privilege, rollback and configuration review.
- [ ] Resolve actual worker database binding and proposed certification database/role; verify memberships, defaults, functions, search path, TLS endpoint/CA, backups and migration ownership. Inspection-session TLS/resource names do not prove worker configuration.
- [ ] Review migrations 001–005 and separately approve exact target/execution; no automatic production migrations or production disposable-role tests.
- [ ] Provision/verify approved restricted runtime account separately from migration ownership; review agreement FOR SHARE privileges and immutable-trigger dependencies rather than copying fixture grants.
- [ ] Approve explicit CERTIFICATION_DATABASE_URL and verified TLS through secret configuration, not Git/chat; academy credentials are not an assumed fallback.
- [ ] Resolve owner/guild/admin-channel/bot identities and inspect member/role overwrites, private replies and DM behavior.
- [ ] Select controlled test context and learner; separately approve messages, record writes, migrations, configuration and restart effects. No new paid staging resources are authorized.

## Controlled live verification — still open
- [ ] Verify missing prerequisites fail closed without publication or access grants.
- [ ] Exercise under-16 rejection, acknowledgment/comprehension, pending submission, owner evidence review/approval, permanent-ID delivery and authenticated status.
- [ ] Exercise non-owner/foreign-guild denial, replay, expiry/restart invalidation, uncertain outcomes, suspension/revocation, restricted renewal and separate reinstatement.
- [ ] Verify appropriately blocked legacy records lacking current evidence and reviewed remediation; never fabricate or automatically restore.
- [ ] Verify no automatic lab authorization/certificate award and no lab restoration on reinstatement; provider-session termination needs separate integration and approval.
- [ ] Verify queue/page navigation, reason forms, confirmations, stale/error results and mobile/accessibility behavior with actual Discord clients.
- [ ] Verify scoped process shutdown/restart, hosting deadline behavior and persisted-status reconciliation; distinguish real signal/network-failure tests from pool-drain and runtime-double tests. A response timeout does not establish operation failure.

## Separate final approvals
- [ ] Review exact candidate and CI after all implementation/documentation changes.
- [ ] Separately approve exact merge, production database/migrations and deployment commit/service.
- [ ] Separately approve agreement insertion/publication and immutable version/hash.
- [ ] Separately approve enrollment manifest, secret/configuration revision, flags and expected restart/deployment effects.
- [ ] Separately approve dashboard/enrollment entry and destination.
- [ ] Record activation/monitoring, rollback target and unresolved outcomes; never automatically delete enrollment/audit records or reverse migrations on rollback.

This checklist does not settle legal/retention decisions or certify compliance, security or activation readiness. This documentation update performs no production operation. Course development remains a separate, paused workstream.
