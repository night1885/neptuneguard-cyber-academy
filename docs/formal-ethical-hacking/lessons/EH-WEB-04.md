# EH-WEB-04 — Repair a local authorization decision

Draft practical, not published. Requires EH-WEB-CAPSTONE and the Linux terminal lessons. This is authoring material, not activated runtime progression. Uses a student-owned clean guest, Python 3 and synthetic in-memory records. No network connection or hosted target is required. Community Learning is unchanged.

## Outcomes
Translate a permission policy into executable checks, reproduce an ownership defect, make a narrow repair and explain the limits of passing unit tests.

## Task and finish line
Read the supplied two-file fixture, predict its policy decisions, reproduce the intended assertion failure, make a narrow local repair, rerun the unchanged visible expectations and add the three existing policy-derived case categories. Finish with genuine before/after results, a minimal repair diff, your added-case observations and explicit limitations.

This is the first local policy-repair practical in this sequence, not a live portal, authentication adapter or HTTP access-control test. The paper capstone's conclusions are not execution evidence for this code. Do not deploy either the starter or your repair into the academy application.

## Scope and prerequisites
Only the supplied local policy.py and test_policy.py copies, plus the reviewed test_regression_workshop.py copy if using the optional linked workshop, are exercise code. They open no sockets, read no credential store and connect to no database. The starter is deliberately incorrect and must never be imported into the academy application. It is a Boolean policy model, not an authentication system, web service or data-enforcement boundary.

The repository source package is fixtures/offline-authorization relative to the formal course directory. This identifies the reviewed material; it does not instruct the learner to execute a repository-wide checkout or installer. The learner's approved offline transfer must produce the two named local files in the fresh fixture directory.

You need Python 3 with its standard library and a way to edit a small text file. No pip installation, sudo or package download is part of this exercise. Confirm `python3 --version` in your guest; author checks used Python 3.12.8, not a validated compatibility matrix. If Python is absent, use the approved provisioning process rather than reconnecting an isolated exercise guest ad hoc.

Transfer the two reviewed fixture files into a fresh disposable guest directory through the approved offline course-material procedure. Preserve filenames and keep them together. Exact media-transfer instructions remain platform-validation work; do not enable shared folders or internet access as an undocumented workaround. Do not run an unreviewed repository-wide installer. The optional workshop's third reviewed file uses the same approved transfer route.

Confirm the intended ordinary learner-guest session and exact local directory before execution. If the machine/account, source files or transfer route is uncertain, stop. A failure caused by missing material is not the intended reproduced policy defect, and elevated privileges are not a remedy.

## Short Python reading bridge
A function is a named operation receiving inputs and returning a result. Here allowed receives a subject, action and submission, then returns True or False. Equality uses ==; assignment uses =. An and expression requires each condition to hold. Indentation defines blocks. `in` checks membership. None represents the absent subject in this model.

The dataclasses are small records. Subject has an ID, role and course tuple; Submission has owner ID, course and state. A one-item tuple includes a trailing comma. Frozen records prevent ordinary field reassignment but do not prove identity or trust. Python annotations describe intended types; they do not authenticate input or enforce all runtime validation.

Read both files before execution. If you cannot yet explain this bridge or use an editor comfortably, complete the [guided Python reading walkthrough](PYTHON-READING-BRIDGE.md) first; no independent Python proficiency is implied by the earlier terminal lessons. That walkthrough uses separate, correct starter files whose tests should pass. Return here afterward: this authorization starter is deliberately defective and its initial policy tests should fail. Completing the walkthrough does not replace EH-WEB-CAPSTONE or this lesson's actual scope and setup checks.

### Trace inputs, decisions and assertions before editing
| Existing code component | What to identify | Limit |
|---|---|---|
| Subject | subject_id, role and the courses tuple | These are trusted fictional test inputs, not authenticated user claims |
| Submission | owner_id, course and state | These describe a synthetic record; the function does not fetch or modify a real submission |
| allowed | The guards, applicable role branch and returned Boolean | A decision return is not enforcement before actual data access |
| CASES | Each supplied name, subject, action, resource and expected Boolean | A case name is a test label, not a condition the repair should inspect |
| test_policy_matrix | Iteration over CASES, subTest context and assertIs comparison | One unittest method can contain multiple separately identified subtest examples |

For a selected visible example, state the expected decision from this fixture's policy first. Then trace the supplied values through the function's guards and relevant branch. Separate the expected policy result, the function's actual Boolean and the assertion comparing them. Explain which input relationship matters rather than copy a remembered patch. Do not infer the correct policy by changing expected values until the starter passes.

## Policy for this fixture
- A student can read or edit only their own draft in an enrolled course.
- A student cannot read another student's draft, even in the same course.
- No student action on a submitted record is allowed by this deliberately narrow policy.
- An instructor can read draft or submitted records only in an assigned course.
- An instructor cannot edit or delete records under this policy.
- Anonymous subjects, unknown roles, unknown states and unlisted actions are denied.

The subject records are trusted test inputs for this exercise only. Real applications need authenticated context, authoritative resource attributes and enforcement before data access. This fictional policy is not an academy production policy or a permission grant. Keep it distinct from the earlier paper policy; do not silently add or remove conditions by borrowing rules from another exercise.

## Predict, run, explain
In the fixture directory, run:
```sh
python3 -m unittest -v test_policy
result=$?
printf 'test status=%s\n' "$result"
```
Before running, predict the decisions for the owner and another student in the same course. Capture the actual result. The starter is intended to fail policy expectations; an initial red result is evidence of reproduction, not a reason to change expected values.

python3 selects the approved guest interpreter. -m unittest invokes its standard-library runner, -v requests verbose reporting and test_policy identifies the local test module. Keep the saved result assignment immediately after the runner: another command could replace $?. The later printf reports the saved status, not an HTTP status or proof that every inner example succeeded. Do not insert a pipeline and mistake its final program's status for the test runner's result.

The runner contains one test method with 12 subtest cases. It may report Ran 1 test while identifying individual failing cases. Do not describe this as 12 independent unittest methods. Distinguish an assertion failure from an import error or missing Python executable.

| Actual result category | What it indicates | Next bounded decision |
|---|---|---|
| Python executable unavailable | A provisioning/environment blocker | Stop and use the approved setup route; do not install arbitrary packages |
| Test module or policy import error | The supplied material, location or import setup was not ready | Check the reviewed filenames and directory with authorised support; do not call this defect reproduction |
| Syntax or unexpected runtime error | Execution did not complete the intended policy comparison cleanly | Inspect the local edit/source and preserve the error; do not treat it as the expected assertion mismatch |
| Assertion failure for a supplied policy example | The actual result differed from that example's expected Boolean | Trace the input and policy conditions before making the narrow repair |
| Completed suite with no assertion failures | The selected visible expectations matched in that run | Retain the positive/negative boundary checks and explain the untested areas |

The earlier author record observed other_student_read and other_student_edit failures. These names orient review of the supplied visible tests; they are not a required learner transcript or proof that a different failure has the same cause. Record your own results, including blockers and any unexpected difference.

## Repair and regression
Explain which policy condition is missing. Edit only policy.py to make the decision match the policy. Keep the visible test expectations unchanged. Do not return False for every request: legitimate owner and assigned-instructor cases must still work. Do not add case-name checks or hard-code the synthetic student IDs.

The repair should implement the applicable input relationship, not special-case the supplied labels or identities. Preserve allowed behaviour as well as denials. During the repair phase, changes belong in policy.py; the separate case-design phase may extend the local test_policy.py copy without changing the original twelve cases or their expected values. No additional learner fixture filename is introduced by this clarification.

Rerun the same command and save the before/after observations and a minimal diff. Add at least three policy-derived cases: an instructor editing a draft, an instructor reading a submitted record in their assigned course, and an owner attempting to read a submitted record. Predict each result before running. These visible checks are learning aids, not protected exam answers or a complete security suite.

For each added case, identify the rule and boundary it distinguishes and confirm that the runner actually executes it. A function written in a file but not discovered by the runner is not a completed test result. If you add subtests to an existing method, the method count need not increase; if you add test methods, report their actual count. Do not equate the number of decision examples with the number of unittest methods.

Use fresh, invented identities where appropriate rather than make a repair depend on the original IDs. Do not add real data, malformed-input experiments, another account, network calls or an HTTP wrapper to broaden this task. If a local edit appears not to be used, verify that the reviewed module/file and intended invocation are being used through the approved troubleshooting process; do not delete arbitrary files or overwrite evidence.

### Optional deeper regression checks
After the original repair and case-design work, use the [regression workshop](AUTHORIZATION-REGRESSION-WORKSHOP.md). Its reviewed third local file adds six test methods/eight decision examples, including renamed owner/nonowner checks and instructor lifecycle/action boundaries. It does not replace your own added cases or add compulsory assessment criteria. Its counterexample experiments use disposable teaching copies only. See [the separate local author checks](AUTHORIZATION-REGRESSION-VALIDATION.md); no repaired or counterexample policy implementation is installed into the repository.

## What the result proves
A passing suite supports consistency with its tested examples. It does not establish secure authentication, token validation, input validation, HTTP enforcement, database isolation or protection of every endpoint. The function returns a decision but does not retrieve or modify any actual submission. Do not claim real data was accessed or that a production vulnerability was exploited.

The model assumes well-formed trusted records. Do not describe its dataclasses, type hints or passing cases as an input-hardening boundary. A proposed future integration needs separate trusted-context and actual enforcement design; this lesson does not authorise installing teaching policy into application runtime paths.

## Deliverables and review
Submit a scope statement, policy explanation, genuine starter and repaired results, minimal repair diff, added cases and limitations. Use fabricated identities only. A reviewer checks reasoning and preservation of both allow and deny boundaries, not just a green test output. Formal pass criteria and independent assessor calibration remain pending. Leave the exercise files clearly labelled as teaching code; do not deploy them.

Keep expected outcomes, actual runner observations, interpretations and interventions distinguishable. Identify the original test method/subtest structure and how the added cases were executed. A blocker or partial result is reviewable but does not establish a completed repair. Feedback should identify the specific unsupported inference or missing case/observation and request a bounded correction, not a production test or a rewritten expected value.

Use the actual approved private submission route only when access, format, collection and retention rules exist. Do not put real learner records, credentials, personal source files or private feedback in the repository. A report, local green test or reading completion does not automatically grant progression, lab access, a grade or an award.

## Source basis and selected author recheck
OWASP recommends deny-by-default decisions, authoritative context and authorization testing:
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Patterns_Cheat_Sheet.html
https://devguide.owasp.org/en/04-design/02-web-app-checklist/07-access-controls/

See OFFLINE-AUTHORIZATION-VALIDATION.md for the preserved historical local execution record. It is not rewritten or relabelled as this expansion's result.

For this expansion, the starter and visible tests were verified against Git blobs 767a9b2c1638eab9ae8c1a3b62ee25c66d30f0d8 and 4f41460d3c378f42c544bdacabdec99a6414ba39 at source checkpoint d26ac2111bd1ca279355c22d468457dbf7f04053. Four selected author-only runs used separate private temporary directories under Python 3.12.8 with bytecode writing disabled:
- Exact starter: runner exit 1; one test method containing twelve subtests; exactly other_student_read and other_student_edit failed.
- Temporary reference repair: the unchanged visible suite exited 0. The reference implementation is not published in the learner starter or this lesson.
- Temporary reference plus three author methods covering the lesson's existing added-case categories: exit 0; four methods in total, comprising the original twelve subtests and three added decision examples, not fifteen independent methods. These are not a learner's independent cases.
- Author-only deny-all counterexample: exit 1; owner_read, owner_edit and assigned_instructor failed, showing why preserving legitimate allows matters. This is not an added learner task or repository implementation.

The original test expectations remained unchanged in every run. A separate downloadable execution record contains the selected scripts' command/result metadata, output and limits; it is not automatically a repository artifact or CI result. No reference repair, deny-all counterexample or author-extension module is installed into the learner fixture by this update.

The author sandbox ran with effective UID zero and was not the prescribed ordinary-account student guest. The exact Bash result-capture sequence, editor/transfer workflow, supported-guest compatibility, novice/accessibility performance, optional regression-workshop suite, actual learner independence and assessor calibration were not tested by these local runs. No browser, HTTP, authentication adapter, database or academy service was involved, and no full repository suite was run for this authoring expansion.

This changes only EH-WEB-04 teaching. The original starter/test files, optional workshop files, prerequisites, existing case-design task, canonical catalogue, reading profiles, runtime integration and publication flags are unchanged. No new permission, network target, Discord handler, database change, activation or deployment is introduced.
