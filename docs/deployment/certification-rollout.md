# Certification rollout and rollback handoff

## Verified preparation snapshot

Candidate 4927b3936cfc61df86b1c5184fb56e8e2debb5d3 passed certification unit tests and PostgreSQL 16/18 jobs in Actions run 38519100884. This handoff update needs its own exact-head CI check. Job conclusions are not full raw-log/security review or launch authorization. PR #2 remains a preparation draft as last inspected. No deployment date is established. See certification-activation-checklist.md for the consolidated gates and evidence limits.

Earlier records identified the Render academy worker srv-db1ula3tqb8s73bcqdc0 and main baseline 117f17e0a3c952cc9e91e8d7ab23d79f5e903900, with auto-deploy off and certification/submission flags false. These are historical observations, not a fresh production inspection. Reverify actual deployed commit, branch/auto-deploy behavior, environment and database binding before any release decision.

## Scope freeze and selected policy

The enrollment/owner-approval build is in deployment preparation, not automatic launch. Do not add optional features to postpone environment review. Outstanding security, policy, migration and actual Discord-flow gates remain mandatory. Enrollment approval neither enables provider-session termination nor awards certificates. Course development is a separate paused workstream.

Recorded policy: minimum certification enrollment age 16, under-16 registration prohibited, no separate parent/guardian approval step selected. Eligible learners need their own acknowledgment, comprehension check and explicit owner approval. Self-reported eligibility is not verified age or legal-capacity evidence. Legal sufficiency for ages 16–17 remains unresolved; DRAFT-2 is not approved learner content. Final agreement, privacy/retention, effective date, immutable version/hash and comprehension content need separate approval.

## Environment inventory required

Record exact hosting service ID, current deployed commit/configuration revision, auto-deploy/branch behavior, bot identity, guild, admin channel, verified role, database instance/binding, migration owner, runtime account/grants, TLS endpoint/CA, backups and rollback target. Choose explicitly approved isolated staging or reviewed disabled production deployment. Historical resource identification does not verify current settings or approve a target. Do not use production bot/database for disposable tests or create paid staging resources without approval.

Use .env.certification.example as a reference only; it contains no secrets and is not automatically loaded. Set credentials through the hosting secret store. The academy requires DISCORD_TOKEN, GUILD_ID, VERIFIED_ROLE_ID and DATABASE_URL. For an initial reviewed disabled deployment, retain CERTIFICATION_ENABLED=false and CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED=false. Never put the disposable test URL or role-DDL opt-in on production.

When later enabling certification, approve explicit CERTIFICATION_DATABASE_URL using a reviewed restricted account; there is no academy DATABASE_URL fallback. Review verified TLS and any custom CA with a controlled handshake; non-loopback TLS-off is rejected by certification configuration. Set owner/channel IDs explicitly. An isolated URL is not proof of least privilege. Review agreement FOR SHARE column privileges and immutable-trigger dependencies; keep migration ownership separate. Existing academy credentials/TLS and initialization permissions need their own environment review.

## Review and deployment gates

1. Review complete branch diff, raw test reports, security findings and CI on the exact release candidate. Automated coverage includes contextual access transactions, owner-read reliability, synthetic runtime shutdown and real PostgreSQL pool draining; it does not close live Discord, network-partition, timed-out-read process-signal, provider restart, production role/TLS or legal gates.
2. Resolve actual hosting service/configuration and confirm whether merge triggers deployment. Approve exact merge separately from exact deployment. A historical auto-deploy-off observation is not sufficient.
3. Review migrations 001–005, actual database target, backups, migration owner and restricted runtime account. Approve execution separately. This code does not automatically apply certification migrations. Never execute disposable role fixtures on production.
4. For staging, separately approve bot/server/database and side effects. For disabled production deployment, keep both certification flags false and do not publish enrollment/dashboard entry.
5. Deploy only the approved commit/configuration through the approved mechanism. Record deployment ID, commit, configuration revision, health results and rollback target. This document executes nothing.

## Commands and side effects

The package specifies Node >=20 and CI uses Node 22. Use the reviewed runtime. Dependency installation is npm ci --ignore-scripts. npm start runs node index.js.

Starting the bot is not offline/read-only preflight: it logs into Discord and existing academy initializeDatabase issues CREATE TABLE IF NOT EXISTS for learner tables. Do not run startup against production as an unapproved smoke check. Do not run npm run deploy-commands as part of startup; command changes need separate approval.

Use CI for certification suites. Role tests can create/drop cluster-wide roles and require a dedicated disposable cluster with explicit opt-in; a localhost database named certification_test does not prove cluster isolation. Do not run those suites against shared production.

## Initial smoke test

After an approved disabled deployment, inspect sanitized startup logs, connectivity, an existing academy read path and selected environment shutdown/restart. Verify disabled certification registers no additional listener/pool and no dashboard was published. XP/profile mutations require designated test learner and explicit scope. Record actual results rather than inferring them from CI.

## Activation is separate

Approve final agreement and policy/privacy/retention, comprehension manifest, migrations, restricted account and TLS before activation. Inspect actual role/member overwrites, private replies/DMs and mobile/accessibility. In the approved context verify under-16 rejection, acknowledgment/comprehension, pending submission, owner review/approval, permanent-ID delivery, authenticated status, cancel/replay/stale/expiry behavior, suspension/revocation, restricted renewal and separate reinstatement.

Review blocked legacy records missing evidence; never fabricate confirmations, bulk-backfill eligibility or restore access automatically. Verify no automatic lab/certificate grants and no lab restoration on reinstatement. Verify process shutdown/restart and persisted-state reconciliation, separately from synthetic-runtime and real-pool CI coverage. Approve exact entry destination/publication and activation configuration separately.

## Rollback and uncertain outcomes

Record reviewed compatible deployed commit/configuration and rollback procedure before rollout. A failed rollout requires approved restoration through the platform procedure. Disabling flags and restarting are separate approved configuration actions. Never automatically reverse migrations or delete enrollment/audit data.

A response timeout, forced shutdown, failed COMMIT/rollback or disconnected process does not prove a remote write failed. Inspect persisted status before retrying submissions, approvals or access changes. Owner-read deadlines suppress late replies but do not cancel queries. Review provider sessions separately; authorization rows do not terminate running sessions. Verify academy availability after rollback and record unresolved outcomes.

## Approval record

Keep candidate commit, exact-head CI, review evidence, target/service/database IDs, migration/merge/deployment approvals, secret revision identifiers (not values), controlled test results, deployment ID, publication/activation approvals, monitoring and rollback evidence together. Green CI or this handoff alone does not authorize production operations or launch.
