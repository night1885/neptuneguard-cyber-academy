# Reviewed consolidated staging batch

Implementation base: 6b8f812591877e94462f260a103c5b80be489c92. Database/runtime/test publication
is staged through 38e4db69. This final group is intended to finish source publication and
start the explicitly approved disposable CI gate, not deploy or certify the pilot.
The fourteen uploaded source hashes matched the original validation manifest before review;
the uploaded coordinator matched its baseline/patch. Reviewed sources intentionally differ.

## Corrections included
1. Launcher verification passed a record binding without actor/guild/action to journalRead.
   The launcher now reconstructs that context. Earlier subsystem and credential-failure tests
   did not exercise the successful launcher path; the new full scripted pilot test does.
2. A stalled due/scan/claim/delete operation could remain pending indefinitely while intake
   stayed available. Per-operation watchdogs quarantine admission. Late results cannot start
   subsequent metadata registration/erasure after retirement. Per-operation abort listeners
   are removed, avoiding an indefinitely growing stop-promise subscription list.
3. Cleanup previously waited for stalled retention before closing owned resources. Logical
   retirement now releases waits; disposal and teardown are attempted independently. An
   overall bounded stop returns cleanup attention if physical teardown cannot finish. It
   does not claim cancellation or erasure merely because application waiting stopped.
4. Entry verification could hang and readiness could be reported prematurely. Entry checks
   are bounded; public readiness waits for success. Stop prevents late listener installation
   and subsequent entry requests after retirement.
5. SQL sampled authority/deadline time before acquiring the record lock. It now samples after
   that lock. A real two-connection regression asserts a pre-deadline request observed waiting
   for the lock is denied after release beyond grant expiry. That SQL regression is unrun here.
6. The proposed manual-only workflow was absent on the default branch. The revised draft
   supports staging-branch pushes gated by [fi-stage-validate]. Four Node 20/22 x PostgreSQL
   16/18 disposable jobs, each capped at 15 minutes, read-only repository permission and no
   production secrets. Publishing the marked commit requires explicit CI-side-effect approval.
   Manual dispatch remains configured subject to GitHub default-branch availability rules.
   Existing workflows are unchanged; their triggers must also be considered before a push.

## Evidence available before the final publication
One selected local run passed 30 tests, zero failures/skips/cancellations, Node 20.20.1
with strict unhandled-rejection checking: fourteen subsystem cases, five original launcher/
default-off/configuration/credential-failure/CLI cases, and eleven new retention/full-pilot/
entry/cleanup regression cases. The real owner/lifecycle/session/verifier/journey/boundaries,
coordinator and candidate adapters run through startup, prepare, preview, submit, receipt list/
recovery and once-only shutdown. No runtime import rewriting or fake journey is used. SDK
constructors/events and the PostgreSQL contract model remain scripted. Default actual SDK
imports, TLS/cache/intents and real SQL are not exercised by those constructor seams.

Four recovered core modules matched GitHub blob hashes at the base. Three journey/boundary
copies matched their recorded baseline blobs; uploaded profile and coordinator copies were
also verified. This is an assembled selected-source workspace, not a full repository checkout
or repository-wide regression run. Nineteen selected JavaScript files passed syntax checks.
The final YAML parsed and its branch/commit-marker/matrix guards were inspected. Historical
14/39/44/58 results are not added to this combined local count.

Actual PostgreSQL contract/lock tests were written and syntax checked, not run. SQL was not
parsed/executed: local psql/PostgreSQL/container tooling is unavailable. No actual Discord
connection, GitHub CI execution or deployment was performed by the local review. After an
approved marked push, a real workflow result must replace these pending gates; a successful
commit or queued job is not a passing test result. The local tests are retained as evidence,
not substitutes for actual SQL permissions/concurrency, real SDK behavior or independent review.

## Constraints not removed by the fixes
Default-off and no production credential fallback remain. Explicit staging identities,
restricted secrets, finite record grant, owner/reviewer, bot capabilities, approved entry
message and isolated DB must still be resolved. Missing targets are not replaced with academy
targets. Record/enrollment/account cleanup is separate from report erasure. Reviewer delivery
remains unsupported. This is a fictional intake/recovery/retention candidate, not a complete
reviewer workflow. Backup/log/export/cache/restore handling and deletion-failure metadata
need approved treatment and validation before real intake.

Operational watchdogs do not extend source/report deadlines. They are not physical retention
grace periods. Logical timeouts cannot undo already initiated requests, imports or DB commits.
A stuck teardown returns attention rather than success. Admission stays quarantined after an
unhealthy pass; operators reconcile and restart rather than infer erasure from an unavailable
UI. Existing protected provider/heap/backup copies are outside local model proof.

The default 5-second operation/cleanup and 1-second poll settings, complete roster audits and
1000ms coordinator provider ceiling require measurement under actual SDK/SQL conditions.
Trusted test constructors/clocks/short budgets are not an alternative deployment authorization.
Live privacy/authority checks and an actual stop/rollback walkthrough remain required.

## Next gate
Run the complete source batch in the approved disposable CI matrix. Review and fix failures
without weakening the isolation/retention guards. No PR, merge, live staging provisioning,
academy migration, real learner intake or production deployment is included. operationalReady
remains false; issue #30 remains open/incomplete.
