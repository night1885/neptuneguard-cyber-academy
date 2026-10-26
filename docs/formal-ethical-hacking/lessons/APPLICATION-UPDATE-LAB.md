# Update boundaries — writable fields, revisions and commit failure

Draft K05/K08/K14 support after [the read-ownership bridge](APPLICATION-OWNERSHIP-LAB.md) and EH-WEB-08 field-policy concepts. This is a separate in-process fixture extension, not permission to issue PATCH or any new request against the academy, foundation peer or an external service. It is not a canonical lesson, login service or deployed API.

## Files and setup
Use the existing application_lab.py and application_repaired.py plus five new files from fixtures/application-ownership: update_lab.py, update_repaired.py, test_updates.py, test_update_reference.py and test_update_cli.py. Keep all seven reviewed files together in a fresh disposable approved guest directory. The two base sources were inspected at 4aaef347d8eb9a0a41c038087bc2732153e6034e. Do not substitute similarly named installed modules or run a repository-wide installer.

Python 3 with sqlite3/wsgiref and an approved provisioning/transfer/support/private-evidence route must already exist. Author execution used Python 3.12.8 only. Missing setup means BLOCKED; do not download packages, elevate or reconnect. Commands assume an approved POSIX-style python3 launcher; other routes need validation.

Actors are invented trusted harness context, not authenticated users. WSGI dictionaries and byte streams simulate request input; no server/listener, socket client, real identity, session or wire framing is implemented. All database setup, ALTER/INSERT/UPDATE and simulated table removal occur only in each fixture's in-memory SQLite. They are not production schema changes or migrations. Do not expose or import this deliberately flawed code into academy runtime.

## Three independent decisions
1. Object/operation: only an enrolled student owner may update their draft. Assigned instructors retain their selected read permission but cannot edit under this narrow policy.
2. Fields: only text is user-editable; owner/course/state remain server-controlled. Knowing a column name or owning the record does not grant permission to change it.
3. Revision: a write must name the expected current revision; a stale update returns a conflict instead of overwriting the accepted edit.

The starter enforces the first and selected revision checks but incorrectly treats text, owner, course and state as editable. The repaired factory passes a text-only allowlist to the same handler. The defect is field-level authorisation, not the absence of SQL value binding.

## Follow the write
The extension uses the repaired read policy, adds an in-memory revision column and explicitly commits its fixture baseline. GET/HEAD include revision metadata after read permission. The synthetic PATCH path checks actor/owner/course/draft before parsing changes. The body must fit the chosen 1–1024-byte, UTF-8 JSON-object contract, include nonempty text and expected_revision, and use permitted fields. Values are 1–256 characters and must encode as UTF-8. Expected revision is a true integer from 0 to 1,000,000, not a boolean. These are educational bounds, not a complete general API/Unicode/version design.

SQL identifiers are selected only after membership in a trusted fixed schema field set and the editable-field policy; values are bound with placeholders. Placeholders do not bind arbitrary column names. The conditional UPDATE also checks id, expected revision, owner, course and draft state. Successful writes increment revision. Response delivery occurs after the transaction context completes, including for a zero-row conflict; a commit exception must not first send a success response.

A selected simulated commit failure rolls back and returns a generic 503 with unchanged content/revision. This is not a real failed-disk test or proof of distributed consistency. Sequential stale-revision rejection is not a concurrent-writer stress test or an idempotency implementation. A retry after a lost response still needs a defined reconciliation contract.

## Predict, reproduce and repair
Read the code first. Predict a legitimate text edit, a stale replay and a body that also changes owner. Then, in the disposable fixture directory:

```sh
python3 -B update_lab.py
result=$?
printf 'starter update demo=%s\n' "$result"
python3 -B -m unittest -v test_updates
result=$?
printf 'starter update tests=%s\n' "$result"
```

Expected starter demo: legitimate edit succeeds and stale revision is rejected, but the owner-field attempt is accepted, changes stored owner/text and advances final revision to 2; process exit 1. Expected suite: 27 methods, three intended assertion failures for owner/course/state field handling, no test errors, exit 1. They are symptoms of one overbroad field policy, not three independently discovered vulnerabilities. Record actual results or blockers, not an expected transcript. Capture statuses immediately; the last printf has its own status and is not a CI gate. -B is not a sandbox.

Preserve original source/results. Repair only your local starter's writable-field policy without hard-coding identities, disabling all updates or weakening tests. Compare against the separate reference without overwriting the repository starter:

```sh
python3 -B update_repaired.py
result=$?
printf 'reference update demo=%s\n' "$result"
python3 -B -m unittest -v test_update_reference test_update_cli
result=$?
printf 'reference and CLI=%s\n' "$result"
```

Expected reference: text-only edit succeeds; stale write returns 409; server-field body returns 400; owner and accepted text are preserved; final revision stays 1; exit 0. Named positive suite has 29 methods (27 reused update expectations plus two CLI methods). CLI checks also verify the defective demo's expected report and both extra-argument rejections/status 2. A passing CLI suite does not declare the starter secure. Do not use broad test discovery as an all-green release gate.

## Instructor guidance and independent work
Ask learners to point to the row permission, writable-field policy and version predicate separately. Explain why text containing owner=student-b is literal text, whereas an owner property requests a different operation. Inspect stored row state in tests, not merely a response message. Predict whether invalid JSON/encoding/fields can reach the UPDATE. Explain why a 503 after simulated rollback must not expose a raw dependency error or claim completion.

Add one legitimate case and one denied/conflict case with invented values only. Submit a trace, actual results or blockers, narrow repair diff, persisted in-memory state checks, retest and limitations through the approved private route. No grade, progress, award, restricted access or real record change follows.

Unresolved work includes duplicate textual JSON-key policy, real content framing/body streams, every malformed-input branch, general authentication/CSRF/session controls, revocation during operations, actual multithread/multiprocess transactions, durable storage failures and a deployed server. See [selected validation](APPLICATION-UPDATE-VALIDATION.md). This is one integrated application exercise, not complete advanced-web, professional or certification readiness.

Sources: https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html and https://docs.python.org/3.12/library/sqlite3.html .
