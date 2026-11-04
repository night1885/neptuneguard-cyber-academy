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
