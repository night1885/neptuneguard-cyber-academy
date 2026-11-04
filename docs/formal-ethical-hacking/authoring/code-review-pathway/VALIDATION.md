# Code-review pathway — integration authoring record

Draft-maintainer-only. runtimeIntegration:false. publishable:false.
Baseline b954cd2fed33e76564f150313ab2a36e1611c6e8. Six supporting documents and one
programme-blueprint navigation addition; no canonical catalogue/prerequisite mutation.
This is a revised integration draft of the previously delivered standalone pathway.

## Source and prerequisite reconciliation

The current blueprint, ownership lab and update lab were read from the course branch.
The route explicitly retains ownership's EH-WEB-01 through EH-WEB-06 plus Python/SQL
reading requirements and update's additional EH-WEB-08 requirement. Neither synthetic
PATCH nor loopback scope is added to an earlier network exercise. The target directory
was absent from the inspected authoring inventory; no existing pathway files are replaced.

Causal descriptions were compared with previously inspected pinned application/test source:
application_lab/application_repaired, update_lab/update_repaired and their named tests.
This is author source reconciliation, not independent semantic review or a complete audit.
The instructor notes explicitly distinguish fictional harness identity from authentication.

## Checks performed for the proposed write

New-document local links and the added blueprint link were resolved within a virtual
reviewed file set containing the six proposed files and the two fetched lab documents.
Existing unrelated blueprint links were not revalidated. Required draft flags, document
headings, source anchors and the prerequisite-preservation text were checked. The existing
blueprint bytes matched its inspected Git blob before appending one section; the original
text was preserved. These structural checks are not full-checkout authoring tests.

No teaching fixture, runner, CI, learner hardware, private workflow, student task or reviewer
calibration ran in this documentation-integration batch. Historical test counts are labelled
expectations, never new executions. No production security or course-readiness percentage
is inferred. External OWASP sources in README provide background, not endorsement.

## Acceptance still required

Independent semantic review, clean learner/reviewer walkthrough, accessible private delivery,
original-task/assessment calibration and supported setup reproduction. Collective registry
and full-checkout checks remain outstanding. No runtime handler, migration, database,
learner data, publication, enrollment, award or Community Learning change is included.

## 2026-11-04 — bounded maintainer repair/retest checkpoint

This dated addendum records later execution evidence; the original integration-batch
statements above remain historical. Source checkpoint: 9bcccf286f0288c00e5a2d345880f485a1d20793.
The preceding assistant-hosted executions reconstructed connector-retrieved UTF-8 source,
verified Git blob IDs, and ran existing contracts in fresh local Python subprocesses using
temporary working copies, fictional actors/records and in-memory SQLite. This was not a
full checkout, extracted learner archive, Ubuntu guest walkthrough or learner assessment.

| Contract | Original starter | Disposable narrow repair | Restored starter |
|---|---|---|---|
| Read: test_application.py | 20 methods; 4 failures | 20 methods; 0 failures | Same 4 failures |
| Update: test_updates.py | 27 methods; 3 failures | 27 methods; 0 failures | Same 3 failures |

All six recorded runs had zero errors and zero skips. Repeated runs are not additional
independent coverage. Read failures were test_nonowner, test_nonowner_body,
test_head_nonowner and test_unknown_same_denial. Update failures were test_owner_field,
test_course_field and test_state_field.

The disposable read repair added actor.subject_id == note['owner'] to the student branch.
The disposable update repair restricted the make_app writable-field configuration to text.
Existing tests and dependencies stayed unchanged within each cycle; legitimate-use controls
remained in those suites. Restoring each starter reproduced its original selected failures.
No repository teaching starter or reference implementation was edited.

Verified source Git blobs:
- application_lab.py: 828353b64c1340b7311f301d25f7b1303ad86a83
- application_repaired.py: a0bb23e66156599fe2c4f27480577b884827e8d0
- test_application.py: 06532c5c90e06061722a02380ec39b3fb08fe1c8
- update_lab.py: a53a0196b0269abcd05b6e609125cfa04d1c4d77
- test_updates.py: 3d635596bbb05292a39dacb354abe4256eb3b15c

Separate downloadable execution records and a technical/stakeholder handover were supplied
in the conversation; they are not committed repository artifacts or independent reviews.
This addendum consolidates those reported executions, not a new rerun. Known solution
exposure informed the assistant-authored repairs; no learner independence is established.

No CLI/demo, supplemental post-commit failure suite, real authentication, concurrent-writer
test, durable-storage failure, learner hardware or private reviewer workflow was exercised
by these two core contract cycles. Selected rollback simulation is not crash-recovery proof.
Unit-test success does not establish complete application security or supported setup coverage.

WP-C overall acceptance remains open under the gates above. This documentation checkpoint
adds no prerequisite, marking threshold, lesson reward, runtime integration, publication,
merge, deployment, external database change or programme-certification decision.

## 2026-11-04 — supplemental update stored-state observations

A subsequent assistant-led source review identified that the three starter property tests
stop at their failing response assertion, before their stored-field assertion. Their failure
counts alone therefore do not record the starter's resulting stored fields. This is an
evidence limitation, not a new independent review or a change to the existing contract.

A separate supplemental maintainer harness then captured status/body/headers and the complete
selected note-a row before and after each attempt. It reused the application_lab.py,
application_repaired.py and update_lab.py Git blobs listed above, reconstructed from the
connector-supplied text and verified before execution. Source checkpoint for this evidence:
1b621912c4d94e0af081a69801497c7adaa00cb4. Predictions were declared before this supplemental
execution; they are not retroactive predictions for the earlier contract runs.

| Case | Original starter | Disposable text-only repair |
|---|---|---|
| owner=student-b | 200 OK; owner/text changed; revision 0 to 1 | 400 Bad Request; entire selected row unchanged |
| course=course-b | 200 OK; course/text changed; revision 0 to 1 | 400 Bad Request; entire selected row unchanged |
| state=submitted | 200 OK; state/text changed; revision 0 to 1 | 400 Bad Request; entire selected row unchanged |
| Legitimate text edit | 200 OK; only text/revision changed | 200 OK; only text/revision changed |

Each case used a fresh fictional application and in-memory database. Three fresh local
subprocesses exercised original starter, disposable text-only factory repair and restored
starter: four scenarios per variant, twelve observations total. All twelve satisfied their
explicit expected response/full-row comparisons. Restored-starter observations exactly
matched the first starter observations. This was not twelve distinct contract requirements
or a rerun of test_updates.py. The supplemental runner did not modify the existing tests.

The downloadable JSON record includes the supplemental runner, declared predictions,
source fingerprints and full before/after rows; a CSV comparison was also supplied in the
conversation. Neither is committed by this documentation-only addendum. Temporary working
copies were removed after execution. No repository fixture or external service changed.

This closes the selected starter/repaired stored-state observation gap only. Complete
selected-row equality is not whole-database, external-side-effect, concurrency, durability
or retry assurance. Known reference exposure remains disclosed. No Copilot request or
independent reviewer approval occurred. The existing WP-C acceptance, learner-workflow,
supported-setup and programme-certification gates remain open.

## 2026-11-04 — extracted repair-bundle execution

Later maintainer execution used selected source bytes at checkpoint
a01fdb212d0cad893b8a9b9ba83aeec2b77b8502, not a full Git checkout. The unchanged builder
wp_c_bundle.py was Git-blob verified as 3df41d712a306cacfe3cb93e23aa20d67017f026;
the blank template was verified as 1352812155feafa4116579e7fd37e9e4bacaa714.
All five application/test inputs matched the Git blobs listed above. Default builder pins
were used without overrides. The manifest's historical baseline was left unchanged; it is
not authenticated provenance for the inspected checkpoint.

Both repair-stage archives were built, integrity/membership/manifest hashes checked and
extracted separately. The selected-source construction tree was removed before execution.
Application/test import origins were verified inside each extraction directory. Python-
prefixed environment variables were removed except explicit PYTHONNOUSERSITE=1; this is
not a security sandbox. The README contract argv was executed directly in fresh processes:
- read-repair: python3 -B -m unittest -v test_application
- update-repair: python3 -B -m unittest -v test_updates

| Stage | Starter | Disposable repair | Restored starter |
|---|---|---|---|
| read-repair | 20 methods; 4 intended failures; exit 1 | 20 methods; 0 failures; exit 0 | Same 4 failures; exit 1 |
| update-repair | 27 methods; 3 intended failures; exit 1 | 27 methods; 0 failures; exit 0 | Same 3 failures; exit 1 |

All six invocations had zero errors and zero skips. Expected failure names matched the
previous contract runs; no import/syntax/dependency failure was counted as reproduction.
Only the designated extracted starter received its previously described narrow repair.
Every noneditable archive member remained byte-identical, including tests, dependencies,
README and manifest. Original starter bytes were restored and rechecked before temporary
archives/extractions were removed. The manifest describes the archived originals, not an
edited working copy. Repeated invocations do not add independent requirements coverage.

The execution JSON and CSV summary were supplied as downloadable conversation artifacts,
not committed by this documentation update. This closes selected repair-stage packaged
execution in the maintainer environment only. Starter-only read/update archives and the
README shell printf wrapper were not exercised. Ubuntu learner compatibility, accessibility,
private delivery, independent review and programme acceptance remain unestablished. No
repository fixture/test, CI, runtime, external service or release flag changed in that run.
