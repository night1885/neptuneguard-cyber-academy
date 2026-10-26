# Writable-field/source-to-state expansion — local execution record

Draft at baseline 5f348d3839238eb206982db2998526b7303a18a0. Selected temporary exact-file execution on Python 3.12.8, not a full repository checkout/CI result, learner transcript, live service or release approval. The seven dependency/fixture/test originals were Git-blob verified. No existing fixture source or baseline test is modified by this batch.

## Measured runs
Original starter test_updates: 27 methods, three intended assertion failures, exit 1. Original text-only reference plus CLI tests: 29 methods passed. Adding the initial 12 supplemental methods passed 41. A temporary reference factory widened back to all four fields reproduced three baseline reference failures. The correct reference was restored and the initial expanded 41 passed. A thirteenth supplemental method was then added for post-commit read failure; the correct expanded 42-method group passed twice. These runs are separate evidence, not additive independent coverage. The starter and reference demos separately returned expected exits 1/0 with final revisions 2/1.

## Distinct failure-stage evidence
The post-commit test injects OperationalError on the second handler SELECT using a test-owned wrapper around the actual in-memory SQLite connection. The transaction has already committed; the response becomes 503 while independently inspected synthetic text and revision reflect the accepted update. The original baseline commit-failure wrapper instead explicitly rolls back and then raises, with unchanged state. Equal generic status does not establish equal transaction outcomes. Neither wrapper validates physical crash recovery, remote storage or network delivery.

## Supplemental scope and reproduction
Thirteen supplemental methods cover text size acceptance/rejection, exact body byte bound, empty/invalid-UTF-8 bodies, revision range, missing fields, mixed forbidden-field rejection with whole-row preservation, unchanged-text revision increment, sequential current-version edits, stale whole-row preservation, and post-commit read failure. All are visible maintainer/practice checks, not new learner requirements or a full parser/security/reliability suite. Some checks intentionally document contract limits rather than fix code.

Reproduce only in a new disposable reviewed copy using the existing approved setup/material route. python3 -B -m unittest -v test_updates is deliberately red for the starter. python3 -B -m unittest -v test_update_reference test_update_cli test_updates_additional is the selected 42-method positive group. Do not use broad discovery including deliberately failing starters as an all-green release gate. Original learner commands and prerequisite scopes remain unchanged.

## Document and execution limits
The exact original writable-field walkthrough was Git-blob verified as 59fc17e09a1b590d327c3d7fcf943d072f933440 before insertion. Removing the proposed text reconstructs it and its existing inline links remain. This is not full link-target or independent semantic validation.

Only invented actors, in-process WSGI calls and temporary in-memory SQLite were used. No real authentication, endpoint, listener, network request, persistent database, production data, simultaneous writers, supported student-platform route, learner pilot, assessor calibration, advanced-web/certification readiness or CI outcome was established. No canonical graph, reader manifest, runtime configuration, deployment or real learner state is changed. This batch adds only a walkthrough expansion, separate supplemental tests and this bounded record; committing them is not production activation.
