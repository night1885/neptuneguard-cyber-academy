# Limited-data enrollment release handoff

Status: preparation only. This document authorizes no merge, database write, environment change, deployment, deletion, learner notification, dashboard publication, or enrollment activation.

## Candidate and review

PR #5 integrates Discord-account acknowledgment and self-declared age 18 eligibility. All five reported CI jobs passed at a8af62e4ce8bddbc51d32c2963db7086ca18984a: age-declaration, certification-unit-tests, dashboard-unit-tests, and PostgreSQL 16 and 18 integration jobs. Recheck the exact final head after further changes. A requested automated review is not a completed review or approval; inspect completed reviews and inline findings before merging.

This is not the full remaining dashboard feature set, hosted-lab lifecycle integration, or certificate issuance. The older certification-rollout.md remains background guidance; its historical snapshot and initially-disabled rollout do not establish current production state.

## Confirm the production target afresh

Previously identified target: Render workspace tea-db1p6jp42hec73dnfs4g, academy worker srv-db1ula3tqb8s73bcqdc0, repository night1885/neptuneguard-cyber-academy, branch main. Auto-deploy was off when inspected. Reverify service, branch, auto-deploy behavior, deployed commit, flags, database identity, restricted runtime account, and separate migration-owner account before any production write. Do not expose credential values. Do not alter the separate discord-code-verification-bot service.

## Legacy-record compatibility is a release gate

Migration 005 adds eligibility fields and a constraint for discord_account acknowledgment. It does not backfill or convert existing rows. The new course-authorization, approval, and reinstatement checks reject incomplete account acknowledgment and missing positive age eligibility. Existing typed-name or other legacy records may therefore lose authorization under the new code even if their stored status says approved.

Before rollout, obtain a read-only aggregate inventory by status and acknowledgment method, including counts lacking the new declaration. Do not export names or identity documents. Determine whether approved, pending, suspended, or revoked records require a reviewed transition plan. Do not silently set age_eligible, fabricate acknowledgment, reset access, replace student IDs, erase identity fields, or mass-notify learners. Any transition or deletion requires separate explicit approval. If affected records exist without an approved safe transition, stop rollout. CI fixtures are not evidence that production has no legacy records.

## Migration and deployment ordering

1. Finish review, verify exact-head CI, record the deployed rollback commit and compatible configuration, and review backup/recovery and migration lock/maintenance requirements.
2. Obtain explicit approval for merge separately. Recheck auto-deploy before merge; do not let a merge trigger an unapproved deployment.
3. Resolve the exact certification database and migration-owner target. Review and separately approve migration 005's complete SQL. Apply it before starting the new certification runtime. Do not use the restricted runtime account as migration owner.
4. Verify the three new columns and the validated certification_account_acknowledgment_required constraint, along with existing immutable-ID and agreement safeguards. A file committed to GitHub is not an applied migration.
5. Separately approve and deploy the exact reviewed commit/configuration. Keep enrollment submission disabled. The new runtime requires migration 005 even when new submissions are disabled; deploying first can make certification unavailable.
6. Inspect sanitized logs, bot connectivity, startup readiness, and private owner-dashboard navigation. Read-only smoke checks must not be presented as end-to-end mutation tests. Do not create production test learners or exercise record-changing controls without approved scope.

The migration is designed to leave legacy signing records unchanged, but compatibility and operational impact must still be checked against the real target. Do not infer backup availability, lock duration, least privilege, or TLS correctness from CI.

## Rollback

Record the last known working deployed commit and configuration before changes. Review compatibility before restoring that code. Do not automatically drop the new columns/constraint, undo acknowledgment, or delete enrollment/audit records. Configuration changes, service restarts, and rollback deployments require their own resolved approvals. Check persisted outcomes before retrying uncertain writes. Lab permission changes do not terminate provider sessions.

## Enrollment activation remains separate

Before opening enrollment, revise and approve agreement/privacy wording, settle retention/deletion and lawful-preservation rules for permitted Discord-linked metadata, approve the real comprehension manifest, and verify the controlled learner/owner lifecycle. Age 18 eligibility is self-declared, not independently verified or matched against Discord signup data. Do not collect legal names, actual ages, birth dates, contact details, identity documents, signed uploads, or video recordings through enrollment. The owner's separate video check must not feed these materials into the application.

Record code review, final candidate/checks, migration approval and verification, deployment approval/ID, smoke-test results, unresolved issues, rollback evidence, and any later activation approval. Passing CI or this handoff alone does not authorize launch.
