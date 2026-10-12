# Certification rollout and rollback handoff

## Verified code snapshot

181f06a13b25ccd75b41db4915bfc93689ad55a6 passed both unit-test and both PostgreSQL CI runs. This handoff is a documentation/template patch and requires its own exact-head CI check before approval. It is not deployment authorization. The PR remains draft and the production host, database, bot/server, and secret configuration have not been resolved. No deployment date is established.

## Scope freeze

The enrollment/owner-approval build is ready for deployment preparation, not automatic launch. Do not expand optional features to postpone the environment review. Outstanding security, policy, migration, and actual Discord-flow gates remain mandatory. Hosted-lab session termination and certificate awards are not enabled by enrollment approval.

## Environment inventory required

Record hosting provider, exact service ID, current deployed commit, auto-deploy/branch behavior, bot identity, target guild, admin channel, verified role, database instance, migration owner, runtime account/grants, and provider TLS endpoint/CA. Confirm whether the first destination is isolated staging or a reviewed production deployment with certification disabled. Do not reuse a production bot/database for disposable tests.

Use .env.certification.example as a reference only. It contains no secrets and is not automatically loaded. Set actual credentials through the hosting secret store. The academy still requires DISCORD_TOKEN, GUILD_ID, VERIFIED_ROLE_ID, and DATABASE_URL. Set both certification flags false for the initial reviewed deployment. Do not place the disposable PostgreSQL test URL or role-DDL opt-in on production.

When later enabling certification, supply CERTIFICATION_DATABASE_URL using the reviewed restricted account; it has no fallback to DATABASE_URL. TLS defaults to verify-full. Approve any custom CA and verify a real controlled handshake. TLS-off is rejected for non-loopback certification connections. Explicitly set the owner/channel IDs instead of relying on defaults. Do not publish a synthetic agreement or comprehension fixture.

The existing academy pool's credentials/TLS in index.js are unchanged by the certification configuration patch. They require their own target-environment review. An isolated URL does not prove that the account is actually least-privileged. Agreement FOR SHARE needs the reviewed column-level UPDATE privilege while enabled immutable triggers prevent mutations. Migration ownership must remain separate from the runtime account.

## Review and deployment gates

1. Review the complete branch diff, raw test reports, and final CI for the exact candidate commit; targeted tests are not a full audit. Verify production TLS/grants, existing academy initialization permissions, and a rollback target.
2. Resolve and review the exact hosting service and configuration. Explicitly approve merge, if required by the hosting branch configuration, separately from deployment. Do not assume merging will not trigger auto-deploy.
3. For isolated staging, approve its bot/server/database and any migrations separately. For disabled production deployment, do not activate certification or publish its dashboard; retain both false flags. Certification migrations are not automatically applied by this code.
4. Use the reviewed deployment mechanism to deploy the approved commit/configuration. Capture deployment ID, commit, configuration revision, health results, and rollback target. No tool or command in this document has been executed by preparing it.

## Commands and side effects

The package requires Node >=20; CI tests Node 22. Use the reviewed CI-compatible runtime. Dependency installation is npm ci --ignore-scripts. The start command is npm start, which runs node index.js.

Starting the bot is NOT an offline or read-only preflight: it logs into Discord and the existing academy initializeDatabase function issues CREATE TABLE IF NOT EXISTS for learner tables. That existing behavior is preserved. Do not run npm start against production as an unapproved smoke check. Do not run npm run deploy-commands as part of startup; slash-command changes need separate approval.

Use GitHub CI for automated certification suites. The role test can create/drop cluster-wide roles and is only for a dedicated disposable PostgreSQL cluster with explicit opt-in. A local database named certification_test is not proof of isolation. Never run that suite against a shared production cluster.

## Initial smoke test

After the approved disabled deployment, check startup logs without exposing tokens/URLs, bot connectivity, an existing academy read path, and graceful restart/shutdown on the selected test/service environment. Confirm certification registers no additional listener/pool when disabled and no certification dashboard was published. Any XP/profile mutation smoke test needs a designated test learner and explicit scope. Record results; do not infer live behavior from mock CI tests.

## Enrollment activation is a separate step

Before activation, approve the actual agreement, eligibility/age and retention policy, comprehension manifest, migrations and restricted account, TLS, actual role/member overwrites, private replies/DM behavior, and full learner/owner flow. Test pending submission, approval, status reconciliation, suspension/revocation/reinstatement, restart-invalidated sessions, and uncertain outcomes in the controlled environment. Separately approve dashboard publication and the exact activation configuration.

## Rollback and uncertain outcomes

Before rollout, record the last reviewed deployed commit/configuration. If a rollout fails, use the approved platform procedure to restore that commit and its compatible configuration. Disable certification and submission flags through an approved configuration change before restart if needed. Do not automatically reverse migrations or delete enrollment/audit data.

A response timeout, forced shutdown, failed COMMIT/rollback, or disconnected process does not prove a remote write failed. Inspect persisted status before retrying submissions/approvals/access changes. Review active lab-provider sessions separately; authorization-row changes do not terminate them. Verify academy availability after rollback and record any unresolved outcomes.

## Approval record

Keep candidate commit, CI results, review approval, migration approval, target/service IDs, secret/configuration revision identifiers (not secret values), test results, deployment approval, deployment ID, publication/activation approvals, and rollback evidence together. A green branch or this document alone does not authorize deployment or launch.
