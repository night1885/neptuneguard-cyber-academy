# EH-WEB-04 — Repair a local authorization decision

Draft practical, not published. Requires EH-WEB-CAPSTONE and the Linux terminal lessons. Proposed ID, not runtime registration. Uses a student-owned clean guest, Python 3 and synthetic in-memory records. No network connection or hosted target is required.

## Outcomes
Translate a permission policy into executable checks, reproduce an ownership defect, make a narrow repair and explain the limits of passing unit tests.

## Scope and prerequisites
Only the supplied local policy.py and test_policy.py copies, plus the reviewed test_regression_workshop.py copy if using the optional linked workshop, are exercise code. They open no sockets, read no credential store and connect to no database. The starter is deliberately incorrect and must never be imported into the academy application. It is a Boolean policy model, not an authentication system, web service or data-enforcement boundary.

You need Python 3 with its standard library and a way to edit a small text file. No pip installation, sudo or package download is part of this exercise. Confirm `python3 --version` in your guest; author checks used Python 3.12.8, not a validated compatibility matrix. If Python is absent, use the approved provisioning process rather than reconnecting an isolated exercise guest ad hoc.

Transfer the two reviewed fixture files into a fresh disposable guest directory through the approved offline course-material procedure. Preserve filenames and keep them together. Exact media-transfer instructions remain platform-validation work; do not enable shared folders or internet access as an undocumented workaround. Do not run an unreviewed repository-wide installer. The optional workshop's third reviewed file uses the same approved transfer route.

## Short Python reading bridge
A function is a named operation receiving inputs and returning a result. Here allowed receives a subject, action and submission, then returns True or False. Equality uses ==; assignment uses =. An and expression requires each condition to hold. Indentation defines blocks. `in` checks membership. None represents the absent subject in this model.

The dataclasses are small records. Subject has an ID, role and course tuple; Submission has owner ID, course and state. A one-item tuple includes a trailing comma. Frozen records prevent ordinary field reassignment but do not prove identity or trust. Python annotations describe intended types; they do not authenticate input or enforce all runtime validation.

Read both files before execution. If you cannot yet explain this bridge or use an editor comfortably, complete the [guided Python reading walkthrough](PYTHON-READING-BRIDGE.md) first; no independent Python proficiency is implied by the earlier terminal lessons. That walkthrough uses separate, correct starter files whose tests should pass. Return here afterward: this authorization starter is deliberately defective and its initial policy tests should fail. Completing the walkthrough does not replace EH-WEB-CAPSTONE or this lesson's actual scope and setup checks.

## Policy for this fixture
- A student can read or edit only their own draft in an enrolled course.
- A student cannot read another student's draft, even in the same course.
- No student action on a submitted record is allowed by this deliberately narrow policy.
- An instructor can read draft or submitted records only in an assigned course.
- An instructor cannot edit or delete records under this policy.
- Anonymous subjects, unknown roles, unknown states and unlisted actions are denied.

The subject records are trusted test inputs for this exercise only. Real applications need authenticated context, authoritative resource attributes and enforcement before data access. This fictional policy is not an academy production policy or a permission grant.

## Predict, run, explain
In the fixture directory, run:
```sh
python3 -m unittest -v test_policy
result=$?
printf 'test status=%s\n' "$result"
```
Before running, predict the decisions for the owner and another student in the same course. Capture the actual result. The starter is intended to fail policy expectations; an initial red result is evidence of reproduction, not a reason to change expected values.

The runner contains one test method with 12 subtest cases. It may report Ran 1 test while identifying individual failing cases. Do not describe this as 12 independent unittest methods. Distinguish an assertion failure from an import error or missing Python executable.

## Repair and regression
Explain which policy condition is missing. Edit only policy.py to make the decision match the policy. Keep the visible test expectations unchanged. Do not return False for every request: legitimate owner and assigned-instructor cases must still work. Do not add case-name checks or hard-code the synthetic student IDs.

Rerun the same command and save the before/after observations and a minimal diff. Add at least three policy-derived cases: an instructor editing a draft, an instructor reading a submitted record in their assigned course, and an owner attempting to read a submitted record. Predict each result before running. These visible checks are learning aids, not protected exam answers or a complete security suite.

### Optional deeper regression checks
After the original repair and case-design work, use the [regression workshop](AUTHORIZATION-REGRESSION-WORKSHOP.md). Its reviewed third local file adds six test methods/eight decision examples, including renamed owner/nonowner checks and instructor lifecycle/action boundaries. It does not replace your own added cases or add compulsory assessment criteria. Its counterexample experiments use disposable teaching copies only. See [the separate local author checks](AUTHORIZATION-REGRESSION-VALIDATION.md); no repaired or counterexample policy implementation is installed into the repository.

## What the result proves
A passing suite supports consistency with its tested examples. It does not establish secure authentication, token validation, input validation, HTTP enforcement, database isolation or protection of every endpoint. The function returns a decision but does not retrieve or modify any actual submission. Do not claim real data was accessed or that a production vulnerability was exploited.

## Deliverables and review
Submit a scope statement, policy explanation, genuine starter and repaired results, minimal repair diff, added cases and limitations. Use fabricated identities only. A reviewer checks reasoning and preservation of both allow and deny boundaries, not just a green test output. Formal pass criteria and independent assessor calibration remain pending. Leave the exercise files clearly labelled as teaching code; do not deploy them.

## Source basis
OWASP recommends deny-by-default decisions, authoritative context and authorization testing:
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Patterns_Cheat_Sheet.html
https://devguide.owasp.org/en/04-design/02-web-app-checklist/07-access-controls/

See OFFLINE-AUTHORIZATION-VALIDATION.md for the limited local execution record.

## Expanded teaching: repair the rule, not the test result

This supplement stays inside the original disposable local authorization exercise. The published starter remains deliberately defective. Only the existing lesson's permitted local copies and optional reviewed workshop are in scope; no production import, account, database or HTTP operation is introduced.

### Map the policy into separate conditions

The function returns a Boolean for supplied in-memory records. It does not authenticate those records or retrieve a submission. Treat Subject and Submission as trusted teaching inputs, not as evidence of a real identity or resource owner.

Read the early denial first: an absent subject or a state outside the known draft/submitted set is rejected. Next read the instructor branch, which requires the read action and the assigned course. Finally read the student branch, which requires a listed student action, course membership and draft state.

Compare that last branch with the written student policy. It does not yet establish that the resource's owner matches the subject. A condition can be individually sensible while the conjunction is incomplete. This is why checking only for a student role and an enrolled course leaves the ownership boundary unresolved.

### Trace the missing distinction — static prediction

The existing ALICE and BOB teaching records have the same role and course but different subject identifiers. DRAFT belongs to ALICE's identifier. In the unmodified student branch, the checked role, action, course and state can therefore be identical for owner and nonowner.

This predicts why the starter may permit BOB's read and edit when the test policy expects denial. It is a source-reading prediction, not your guest execution result. Run only the original bounded local procedure and keep the real output separate from this explanation.

A correct repair makes the student decision depend on the ownership relationship as well as the existing allowed action, enrollment and draft conditions. Compare the subject's identifier with the resource's owner attribute; do not hard-code the displayed ALICE or BOB labels into the decision.

### Preserve legitimate work while closing the gap

Returning False for everything eliminates this one unwanted allow but also rejects the legitimate owner and assigned-instructor examples. That is not policy compliance. Returning True preserves legitimate work while discarding denial boundaries. Both shortcuts avoid the actual reasoning task.

An ownership comparison must not accidentally become a global requirement for the instructor branch. The fixture permits assigned instructors to read submissions they do not own. Likewise, adding ownership does not waive the student's draft-only rule or grant edit/delete actions to instructors.

Keep the repair narrow enough to explain in terms of the written policy. A minimal diff helps the reviewer connect a changed condition to its intended effect. Small size is not proof of correctness, but a large unrelated rewrite makes causal explanation and regression review harder.

### Predict before rerunning the unchanged expectations

Use the existing test names to connect each observation to a policy boundary. The original suite contains one method with twelve subtest examples, not twelve independent methods. A failed subtest can identify a specific scenario while the summary still reports one test method.

Do not change expected values to agree with the defective function. The purpose of the test is to compare implementation with policy, not redefine policy around observed output. If the written rule itself seems ambiguous, record that question rather than silently changing the exercise.

The linked optional workshop adds its own reviewed checks and counterexample activity. This supplement neither replaces it nor introduces a new mutation experiment. Preserve the original requirement to design the additional policy-derived cases yourself; optional visible examples do not cancel that work.

### Interpret failures before changing logic

An assertion failure means the test compared an actual result with an expectation and they did not agree. A failed import, missing Python interpreter or syntax/indentation problem can prevent the intended decision from being tested at all. These are different blockers.

If an edit creates a syntax error, restore a valid local teaching copy and inspect the change within the approved procedure. Do not install packages, run a repository-wide installer or change the guest network to solve a problem that is actually in the local file.

When a test appears unexpectedly green, inspect whether the named suite actually ran and whether expectations were preserved. A successful command that ran no relevant cases does not establish the intended repair. Record real counts honestly if your added cases change them.

### Design cases from the boundaries, not the names

Ask which policy dimension changes: ownership, action, course, lifecycle state or subject role. Hold the other relevant facts steady when explaining why a particular distinction matters. A same-course nonowner is important because a course-only check cannot distinguish that record from the permitted owner example.

The required instructor-edit, instructor-submitted-read and owner-submitted-read cases probe different boundaries. Their expected decisions follow from this lesson's deliberately narrow policy, not an assumption that an instructor can do everything or that every owner can read every state.

Tests with renamed fictional identities can expose dependence on a particular demonstration label, but passing them does not prove the implementation never hard-codes anything. Explain both what the case challenges and what remains outside its coverage.

### Separate decision testing from enforcement testing

A Boolean True is not a real file or database read. A Boolean False does not prove that a web handler checked it before releasing data. The model has no HTTP handler, authenticated session or data-access layer, so those enforcement claims cannot follow from its passing suite.

The useful learning result is narrower: the reviewed local function agrees with the tested policy examples after the stated change. Preserve that boundary when describing the repair in a report. Do not report that another learner's data was retrieved or that an academy vulnerability was exploited.

### Formative questions with explained answers

1. Why do owner and nonowner predictions coincide in the starter? The student branch lacks the ownership condition while the other relevant fields can match.
2. Why is deny-all not an adequate repair? It breaks explicitly permitted owner and instructor work.
3. Why not require ownership for every role? Assigned instructors have a different permitted read rule under this fixture's policy.
4. Does an import error reproduce the ownership defect? No. It does not establish that the intended decision was evaluated.
5. What does a passing suite leave unproven? Authentication, HTTP enforcement, database isolation, untested inputs and complete policy coverage.

Technical basis: Python unittest documentation, https://docs.python.org/3/library/unittest.html , and the original fixture policy. This supplement adds no command, changes no fixture or test expectation, and claims no new learner execution, supported-platform reproduction or assessor calibration.
