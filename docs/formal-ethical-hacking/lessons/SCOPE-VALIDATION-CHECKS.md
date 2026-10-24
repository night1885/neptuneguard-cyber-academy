# Offline scope predicate — local author validation

Draft batch: EH-AUTO-01, a deliberately flawed pure input predicate and visible tests. No target is contacted, hostname resolved, scan performed, live permission granted or academy runtime changed. Hosting, publication, Community Learning and existing release gates remain unchanged. The reading-route index is not modified by this batch.

## Executed checks
Executed the starter and visible suite in a temporary authoring directory under Python 3.12.8. One unittest method contains 12 subcases. The starter exited 1 with six assertion failures: neighbor, wrong_port, string_port, boolean_port, negative_port and oversized_port. Six other cases produced no assertion failure.

A temporary reference repair compared parsed addresses exactly and required an actual int port in range, equal to 8000. With a fresh interpreter and bytecode writing disabled, the same suite passed and exited 0. The repair is not included in the learner starter.

## Limits
The checks cover the stated synthetic address/port contract only. No execution enforcement, trusted configuration, subject identity, protocol selection, time window, request budget, revocation, DNS, proxy behavior, network boundary, supported student guest or CI was validated. Independent learner additions and novice/editor workflows were not executed.

A downloadable JSON author-check record was generated separately and is not automatically committed as CI or learner evidence. Passing these checks is not authorization or a release approval.

## Before release
Reproduce on supported guests; verify input-type and version behavior; test the independent cases and Python bridge with beginners; review private submissions, accessibility and assessor calibration; and register metadata/navigation separately. Keep fixtures outside application runtime and do not wire the repaired predicate to real network tools on the basis of this teaching exercise.

Source basis:
https://docs.python.org/3/library/ipaddress.html
https://devguide.owasp.org/en/04-design/02-web-app-checklist/05-validate-inputs/
