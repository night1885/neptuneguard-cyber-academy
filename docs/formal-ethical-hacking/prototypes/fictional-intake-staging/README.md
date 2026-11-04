# Fictional intake staging implementation candidate

Source-only configuration foundation on feat/fictional-intake-staging, prepared against 97e2b25ba2ef8e3f7df4d16301510998a7e0e68b. This directory is not a deployable launcher.

The profile inspector is pure and default-off. Enabled input requires literal true, fictional-intake-staging mode, a fictional-only declaration, explicit staging guild/bot/entry/operator IDs, production exclusion guild/bot IDs and database host/port/name metadata for each environment. These are proposed configuration names, not supported environment variables. It accepts no credentials and creates no client, pool, listener or message. It does not read process.env. Existing review-only staging and disposable-CI adapter guards remain unchanged.

Operational readiness always remains false. Different strings do not establish actual Discord or database isolation; DNS aliases, actual backend privileges, channel membership, bot identity, operator authority and fictional content require separate checks. Host/database metadata supports a conservative subset, not arbitrary connection URLs or IPv6 literals. Inputs are trusted configuration, not a public authentication boundary.

Preparation: all 27 local unit tests passed on Node 20.20.1 with zero failures/skips/cancellations. Tests use fictional IDs and .invalid hosts. No full-checkout integration, committed-head CI, actual database/Discord execution or independent review is claimed. Reproduce with node --test docs/formal-ethical-hacking/prototypes/fictional-intake-staging/fictional-intake-staging-profile.test.mjs. No workflow is added by this foundation commit.

Remaining implementation: dedicated default-off launcher, staging-specific providers/storage, actual identity/permission/backend checks, scoped fictional walkthrough and stop/rollback behavior. Real staging targets are unresolved. No existing npm start or runtime is wired. Keep these changes on the same implementation branch; this foundation alone is not a release milestone or live-readiness proof.

No policy, retention deadline, SQL fixture, production schema, dependency, account cleanup or service setting change. Issue #30 remains incomplete. Exact writes and later PR, merge, provisioning, deployment, database operations, Discord publication and activation require separate approvals. No paid resources or live operations are authorized by this commit.
