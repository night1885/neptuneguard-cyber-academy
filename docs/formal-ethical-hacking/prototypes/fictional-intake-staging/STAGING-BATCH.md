# Consolidated fictional staging pilot — source candidate

Implementation base: 6b8f812591877e94462f260a103c5b80be489c92.
Publication groups: d9302733 (database/configuration), e361c9cc (runtime),
38e4db69 (tests). The final coordinator/docs/workflow group completes source publication,
not release readiness. Read REVIEW-UPDATE.md for review findings and evidence limits.

## Scope and defaults
The manifest example is disabled and contains null target identifiers. The existing npm
start, academy runtime, disposable-CI guards, enrollment and account cleanup are unchanged.
No schema migration, bootstrap, Discord publication or pilot launch runs merely by importing
these modules. Reviewer delivery remains unsupported and fails closed.

The pilot assembles the existing owner/lifecycle/session/verifier/journey/coordinator with
staging storage, restricted-channel operations, bounded source reads and retention work.
A dedicated 3..50-member staging guild is required. The configured reviewer must own it;
operator and reviewer must differ. Outsider escalation permissions, incomplete member lists,
unexpected channel overwrites and missing bot permissions fail closed. These are repeated
observations, not atomic cross-service authorization or proof of physical separation.

## Validation gate
A selected local run passed 30 tests, zero failures/skips/cancellations. It includes the
real application stack through startup, intake, receipt recovery and shutdown with scripted
SDK and database transports. Nineteen selected JavaScript files passed syntax checks.
This was not a full repository checkout/regression or actual SDK/TLS/PostgreSQL execution.
The SQL contract and two-connection lock regression have not executed locally.

The new workflow supports a marked push to feat/fictional-intake-staging. The commit must
contain [fi-stage-validate]; otherwise automatic jobs are skipped. Manual dispatch is also
configured, subject to GitHub's default-branch workflow availability rules. The marked
publication push requires explicit approval for four disposable jobs: Node 20/22 x
PostgreSQL 16/18, 15-minute timeout per job, read-only repository permission. Those jobs
may consume Actions minutes. All staging *.test.mjs run, with SQL explicitly enabled only
against the newly created local fi_stage_test service and fixture-only credentials.
No production secrets, protected environment or existing database is used by that workflow.
Do not infer CI success from the source, syntax checks, local models, a queued run or a commit.

## Future staging installation — separately approved live operations
Review schema and actual CI results first. staging-schema.sql and staging-bootstrap.sql
require explicit admin, worker, staging database and excluded production database variables.
Bootstrap additionally requires a record UUID, guild, learner, reviewer, demo scope and
finite grant deadline. There is no seed default, database/role creation in those scripts,
automatic academy migration or lesson assignment. Runtime rejects elevated/direct-table/
schema-CREATE worker privileges, but role membership and actual backend isolation still
require independent review. SECURITY DEFINER actor arguments trust the authenticated bot
service; they are not cryptographic Discord identity. Server log/error/backup exposure is
not solved by a neutral application error.

The launcher requires explicit manifest metadata, reviewerId, recordId, expectedRole and an
already approved bot-authored entryMessageId containing nmi:prepare/nmr:list. entry-payload.json
is an unsent SDK-format draft. Startup does not send or update that entry message.
New launcher-only environment names: FICTIONAL_STAGE_RUN must literally be true;
FICTIONAL_STAGE_TOKEN and FICTIONAL_STAGE_DB_PASSWORD are required; FICTIONAL_STAGE_DB_CA is
optional. No DISCORD_TOKEN or DATABASE_URL fallback. Credential provenance must be resolved
before any live start: a wrong token may contact a wrong bot before identity rejection.
GuildMembers and MessageContent require separately approved Discord capabilities. The
launcher disables MessageManager caching; this does not purge heaps, transport buffers,
crash files, logs, exports or backups. Trusted test constructor/clock seams are not deployment
authorization or live identity proof.

No-argument CLI after source installation:
  node docs/formal-ethical-hacking/prototypes/fictional-intake-staging/staging-pilot.mjs
It reports disabled. An enabled invocation connects to services and requires separate approval.

## Retention and stop boundaries
Draft deadlines are source creation +24h. Report deadlines are trusted server submission
+24h; replay/recovery does not extend them. The preview timer is capped at the original draft
deadline. SQL samples time after acquiring the record lock. Source reuse for a different
submission is rejected; a new report needs a new source message. Later reports do not
extend earlier reports. Work records/accounts and whole channels are not deleted under a
report deadline. Learner access closes before an expired channel association is forgotten.

Draft discovery projects operator message IDs/timestamps, but Discord transports full
message objects. It is not a provider-side metadata-only API. Maximum ten pages of 100;
incomplete scans block admission rather than claiming erasure. Replies/references, forwards,
attachments and other unsupported message forms are not accepted as source reports.
Bodies remain limited to 2,000 Unicode code points/8,192 UTF-8 bytes.

Expired database payload redaction is independent of external source deletion. Discord
unknown outcomes stay pending, not success; outstanding identifiers, backup/log/export/cache
copies and restore-time expiry need approved recovery/retention treatment. Failure is not
permission for indefinite metadata retention. Polling/operational timeouts are not grace
periods or a guarantee of deletion precisely at the deadline. SQL access denial is not erasure.

Retention operations have watchdogs; unhealthy work quarantines admission. Late work cannot
start subsequent metadata writes/erasure after retirement. Abort listeners are removed.
Entry validation and caller-visible cleanup are bounded. A stuck teardown returns cleanup
attention, not completion. Physical requests/commits already begun can finish externally;
hard cancellation/drain, real privacy, performance and live stop/rollback remain unproven.
The existing 1000ms coordinator provider ceiling must be measured with actual SDK/SQL work.

Issue #30 remains incomplete. operationalReady stays false. No PR, merge, deployment,
real learner collection or production operation is authorized by this source batch.
