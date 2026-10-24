# EH-WEB-04 — Repair a local authorization decision

Draft practical, not published. Requires EH-WEB-CAPSTONE and the Linux terminal lessons. Proposed ID, not runtime registration. Uses a student-owned clean guest, Python 3 and synthetic in-memory records. No network connection or hosted target is required.

## Outcomes
Translate a permission policy into executable checks, reproduce an ownership defect, make a narrow repair and explain the limits of passing unit tests.

## Scope and prerequisites
Only the supplied local policy.py and test_policy.py copies are exercise code. They open no sockets, read no credential store and connect to no database. The starter is deliberately incorrect and must never be imported into the academy application. It is a Boolean policy model, not an authentication system, web service or data-enforcement boundary.

You need Python 3 with its standard library and a way to edit a small text file. No pip installation, sudo or package download is part of this exercise. Confirm `python3 --version` in your guest; author checks used Python 3.12.8, not a validated compatibility matrix. If Python is absent, use the approved provisioning process rather than reconnecting an isolated exercise guest ad hoc.

Transfer the two reviewed fixture files into a fresh disposable guest directory through the approved offline course-material procedure. Preserve filenames and keep them together. Exact media-transfer instructions remain platform-validation work; do not enable shared folders or internet access as an undocumented workaround. Do not run an unreviewed repository-wide installer.

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

## What the result proves
A passing suite supports consistency with its tested examples. It does not establish secure authentication, token validation, input validation, HTTP enforcement, database isolation or protection of every endpoint. The function returns a decision but does not retrieve or modify any actual submission. Do not claim real data was accessed or that a production vulnerability was exploited.

## Deliverables and review
Submit a scope statement, policy explanation, genuine starter and repaired results, minimal repair diff, added cases and limitations. Use fabricated identities only. A reviewer checks reasoning and preservation of both allow and deny boundaries, not just a green test output. Formal pass criteria and independent assessor calibration remain pending. Leave the exercise files clearly labelled as teaching code; do not deploy them.

## Source basis
OWASP recommends deny-by-default decisions, authoritative context and authorization testing:
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Patterns_Cheat_Sheet.html
https://devguide.owasp.org/en/04-design/02-web-app-checklist/07-access-controls/

See OFFLINE-AUTHORIZATION-VALIDATION.md for the limited local execution record.
