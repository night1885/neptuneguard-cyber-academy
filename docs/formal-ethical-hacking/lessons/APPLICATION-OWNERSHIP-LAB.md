# Request → database → policy → response: ownership lab

Draft K05/K08/K14 bridge, not a canonical lesson, full web assessment, login implementation or deployment. Begin after EH-WEB-01 through EH-WEB-06 concepts and the offline Python/SQL reading support. Existing prerequisites and GET/HEAD network scopes do not change.

## What is new
The earlier Boolean model returns a policy decision only. This fixture also routes a request-shaped WSGI environment, selects a synthetic row from in-memory SQLite, applies a policy, constructs status/headers/body and tests the result. This is actual in-process application execution, not an HTTP exchange over a network. No listener, server adapter, browser, curl request or authentication middleware is supplied.

The harness uses setup_testing_defaults for fake testing values and supplies ng.actor as assumed trusted invented server context. An Actor dataclass is not authentication or proof of identity; its annotations/frozen fields do not create trust. HTTP_X_USER/HTTP_X_ROLE fields are deliberately not used to create that context. These tests validate the stated input distinction only, not a real login or proxy/header deployment. Never expose the fixture or import it into academy runtime.

## Setup
Transfer all five reviewed Python files from fixtures/application-ownership into a fresh disposable approved guest directory: application_lab.py, application_repaired.py, test_application.py, test_reference.py and test_cli.py. Python 3 with sqlite3/wsgiref must already be provisioned through the approved route. Author execution used Python 3.12.8 only; missing tools, transfer, support/recovery or private evidence handling are blockers, not a reason to install, elevate or reconnect. Commands assume an approved POSIX-style python3 launcher; other platforms require review.

Only invented actors and four invented notes are involved. Setup populates an in-memory database. The dependency-error test deliberately drops its own in-memory table; no real database, disk store, migration or deletion is involved. No actual academy identities, cookies, passwords, submissions or account tests belong here.

## Fictional read policy
Students may read only their own draft in an enrolled course. Assigned instructors may read draft/submitted notes for their course. Other roles, unrelated courses and student submitted-read attempts are denied. This narrow policy is not an academy production rule. Denied/absent records use the same selected 404 status/body; missing synthetic actor uses 403 without pretending an authentication challenge is implemented. Only GET and HEAD are supported; 405 includes Allow. Query strings are outside the fixture contract.

## Trace before running
Follow PATH_INFO to a bounded record key and a value-bound SELECT. SQL parameter binding does not establish ownership. Both starter and reference use the same lookup, so the intended repair is not to change escaping or SQL syntax. The starter checks role/course/state but omits owner equality. Follow the resulting private text into the response body. A correct status or hidden button would not repair a body that still discloses it.

The reference supplies a corrected policy to the same handler factory, adding owner equality in the student branch. This dependency is selected by trusted source code, not a request header. The handler applies it before returning the note. This is selected application-path enforcement under assumed identity, not a production identity/storage design.

## Reproduce the starter
After reading all files, in the disposable fixture directory:

```sh
python3 -B application_lab.py
result=$?
printf 'starter demo status=%s\n' "$result"
python3 -B -m unittest -v test_application
result=$?
printf 'starter test status=%s\n' "$result"
```

Expected demo: three in-process case summaries and boundary_met false, status 1. Expected tests: 20 methods, four assertion failure events, no test errors, status 1. Those four symptoms stem from one missing ownership condition; do not count them as four independently discovered vulnerabilities. An import/syntax failure is not the intended reproduction. Capture actual results immediately; final printf has its own status and is not a CI gate. -B is not isolation.

## Repair, then check the separate reference
Preserve original source and genuine results. Repair the student policy in your own local copy without hard-coding names, rejecting all access or changing expected values. Preserve assigned-instructor, owner, course and lifecycle controls. Then compare with the visible reference:

```sh
python3 -B application_repaired.py
result=$?
printf 'reference demo status=%s\n' "$result"
python3 -B -m unittest -v test_reference test_cli
result=$?
printf 'reference and CLI status=%s\n' "$result"
```

Expected reference demo: owner and assigned-instructor reads succeed; classmate read returns no note and 404; boundary_met true, exit 0. Positive suite: 22 methods (20 inherited application requirements applied to the reference, plus two CLI methods). The expectations are reused, not 20 newly independent specifications. CLI tests also exercise the deliberately defective demo's expected outcome; a passing CLI suite does not mean the starter is secure. Do not run broad discovery as an all-green release gate.

## Inspect the response, not just the verdict
Selected tests check denied bodies, unknown/nonowner response consistency, ignored forged headers, course/state boundaries, HEAD with no body and corresponding representation length, numeric response byte length, unsupported methods/query, a SQL-like value treated as a value, and generic 503 handling after the synthetic table is removed. WSGI validation wraps one selected allowed exchange only, not every protocol/route condition. Status/body consistency here does not establish timing-based non-enumeration, complete HTTP conformance or real server behaviour.

## Instructor prompts and independent work
Ask which facts are supplied as trusted assumptions, which operation actually executes, and which bytes reach the caller. Why does binding a query not fix ownership? Why can an empty HEAD body still need an access decision? Why are a generic dependency error and a hidden traceback different concerns? Explain that a public response without SQL details is one checked property, not complete logging/privacy assurance.

Add one legitimate and one forbidden case using invented records/actors, without broadening network scope or adding real identities. Draw the request/database/policy/response flow and prepare a narrow finding, local repair diff, positive/negative retest and limitations. Record interventions and blockers. Formal grading, platform reproduction, true authentication, concurrency, endpoint integration and advanced-web/certification readiness remain pending. See [the validation record](APPLICATION-OWNERSHIP-VALIDATION.md).

## Optional follow-up: update boundaries
The separate [application-update practical](APPLICATION-UPDATE-LAB.md) extends the in-process teaching model with text-only field permissions, expected revisions and selected rollback checks. Its synthetic PATCH operation is not added to this read lesson's contract or any network exercise scope. It requires the additional reviewed files and its own stated setup; no actual endpoint, migration, authentication or production workflow is introduced.

## Optional follow-up: owned loopback transport
The separate [loopback verification practical](LOOPBACK-HTTP-LAB.md) adds an opt-in, short-lived 127.0.0.1 listener/client over the repaired policy with a fixed synthetic actor. It requires its own execution permission and supported setup; it is not authentication or a public deployment, and does not extend the foundation peer's request budget. See its [selected actual transport checks](LOOPBACK-HTTP-VALIDATION.md). The original exercise above remains in-process only.

Sources: https://docs.python.org/3/library/wsgiref.html and https://docs.python.org/3/library/sqlite3.html and https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html .
