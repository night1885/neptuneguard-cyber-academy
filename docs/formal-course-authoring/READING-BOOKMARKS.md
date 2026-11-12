# Formal reading bookmarks: unapplied runtime candidate

This batch implements a database-backed reading-location service, not the complete private learner journey. It is default-off, has no startup/router import, registers no course, and applies no migration or grants. The SQL is deliberately outside migrations/. Do not wire it to learner buttons before the full release criteria and policy/retention review are met.

## Contract
createFormalReadingBookmarks accepts an explicit enabled switch, a reviewed PostgreSQL pool, transaction-bound authorizer and immutable-copied student-package metadata. Metadata names only the two intended formal course keys, a SHA-256 publication revision and approved lesson/page bounds; it is not an approval of the underlying teaching. Never pass the owner-review HTML or its answer discussions as a student package.

load takes actorId/courseKey; save additionally takes revision, lessonKey, pageIndex and expectedVersion. The transport must derive the actor from an authenticated Discord interaction, enforce current guild/member authority and private actor/course/message binding, and never accept a subject ID from a learner-supplied form. This database component itself does not authenticate a Discord user or enforce message privacy. No existing authorizer/legacy route is weakened.

The provided authorizer adapter reuses createCertificationCourseLifecycle.getCourseAuthorization on the same transaction connection. Enrollment and assignment row locks precede that check and bookmark access. Approved account, acknowledgment/agreement, active assignment and non-closure checks remain in the existing service. The configured application schema/search_path, pool timeouts and restricted runtime role need separate startup validation before activation.

## Save/Resume semantics
Positions are scoped to Discord actor, course and the currently authorized student identity. A missing row returns empty/version 0. Versions implement compare-and-swap: competing stale writes conflict rather than silently overwrite. An exact immediate repeated save returns the prior version without another write. This is not a general action receipt or replay-protection system.

A changed publication returns revision_changed with no old lesson cursor; the UI must reopen an overview and require a new explicit save against current metadata. Revoked/closed/expired admission or changed student identity must not expose an old location. Save is reading convenience only: it records no learning completion, capstone result, lab permission, assessment, certificate, XP or badge. It may move backward as well as forward.

Failures return neutral unavailable/conflict responses. COMMIT transport failure can leave an unknown save outcome; the connection is discarded and no automatic write retry occurs. Reload before deciding whether to retry. Disposal blocks new work but cannot undo a COMMIT already issued; integration needs the existing shutdown/drain policy. No distributed instantaneous revocation or cancellation guarantee is claimed.

## Schema and privacy
reading-bookmarks-schema.sql proposes one row per actor/course with student binding, publication, lesson/page, version and timestamp. It depends on the existing course-assignment key. It creates no roles, grants or assignments and uses restrictive deletion, not automatic retention cleanup. Retention, erasure and account-reissue policy must be reviewed before any real bookmark is stored. No report bodies, credentials, answers or message/session tokens belong in this table.

## Validation
Run node --test formal-reading-bookmarks.test.mjs. Twenty-one selected unit tests passed locally on Node v20.20.1 using explicit database/authorization test doubles. Those tests do not prove PostgreSQL persistence, locking, schema/role correctness, Discord delivery or an existing runtime integration. The schema and real authorization adapter have not been executed locally against PostgreSQL.

The added GitHub workflow uses disposable loopback PostgreSQL 16/18 containers and Node 22, installs the existing lockfile with lifecycle scripts disabled, runs the unit suite, then requires native tests. Those tests use a new synthetic schema and restricted direct-login role to exercise the actual schema and existing admission service, instance recreation, exact duplicates, concurrent stale saves, revocation and acknowledgment/closure checks. They are unapplied/unexecuted hosted work until the new-head CI results are inspected. Test setup tables are minimal synthetic counterparts, not validation of every production migration or deployed role. The native file skips without explicit opt-in; CI explicitly requires the profile before invoking it.

No production database, Discord API, credentials, feature flag, actual student package, live learner record, course registry, Community Learning path, merge, deployment or certificate operation is changed. This advances the Save/Resume storage prerequisite only; the in-place buttons, full student content, private adapter wiring and end-to-end acceptance remain release work.
