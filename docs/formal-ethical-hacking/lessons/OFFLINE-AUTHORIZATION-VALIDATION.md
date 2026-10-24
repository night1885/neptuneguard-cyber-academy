# Offline authorization practical — local execution record

Draft batch: EH-WEB-04 plus a standalone deliberately flawed policy model and visible tests. No academy application imports, runtime integration, publication, network service or hosting is added. Community Learning and existing release gates remain unchanged.

## What was executed
In the authoring sandbox under Python 3.12.8, the exact supplied starter and visible test file were written into a temporary directory and executed with `python -m unittest -v test_policy`.

The suite contains one test method and 12 subtest cases. The starter exited 1 and produced exactly two assertion failures: other_student_read and other_student_edit. Both incorrectly returned True where the policy expected False. The remaining ten cases produced no assertion failure.

A temporary reference repair added the missing ownership condition. With interpreter caches cleared, the same suite exited 0 and reported OK. The repair is not included in the learner starter files. This records local author validation, not a real student's work.

## Limits
No student-guest compatibility test, novice walkthrough, transfer procedure, editor workflow or additional independent learner cases were executed. No browser, authentication adapter, HTTP endpoint, database or academy service was involved. These are local checks, not repository CI or a course release approval. The model assumes well-formed trusted records and is not hardened against arbitrary untrusted input.

A downloadable JSON authoring record was generated separately; it is not automatically committed or collected as learner evidence.

## Release requirements
Review fixture isolation and licensing; reproduce as an ordinary account on supported guests; provide tested offline material transfer and editor instructions; verify the Python bridge with beginners; review accessibility and private evidence handling; calibrate assessors; and register lesson metadata only through a separately reviewed integration. Keep all fixture code outside application runtime paths.

Passing policy unit tests does not prove that an application enforces those decisions at every resource entry point. Authentication, trusted context, enforcement and integration tests remain separate responsibilities.

Source basis:
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Patterns_Cheat_Sheet.html
https://devguide.owasp.org/en/04-design/02-web-app-checklist/07-access-controls/
