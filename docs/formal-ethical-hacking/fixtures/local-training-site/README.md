# Local browser training-site baseline (draft)

Separate read-only teaching candidate. Not deployed, learner-activated, authenticated or intentionally vulnerable. The company domain neptuneguard.com and every external target are excluded. No academy/runtime, Discord, database, catalogue, CI or hosting integration is added.

## Scope and assumptions
The application always assumes the same fictional learner; this is not a login. Only invented notes are stored in memory. The own-note view permits that assumed learner, while other-note and missing-note checks return the same selected generic 404 body. HTML text is escaped. There are no forms, scripts, external assets, uploads, disk serving, write/delete handlers, credentials or external requests.

The launcher asks only for 127.0.0.1 and OS-selected port 0. Its custom bind setup assigns a fixed server name without a hostname lookup. It accepts no CLI arguments and rejects root/non-POSIX execution before app construction/bind. It is separate from the existing managed loopback helper and does not change that helper's six-attempt scope. Native Windows serving is unsupported by this candidate.

Loopback/non-root are exercise constraints, not authentication or complete host isolation. Other local processes may reach a local listener. The reference wsgiref server, timeout and selected headers are not production hardening, a resource sandbox or comprehensive hostile-client protection. See https://docs.python.org/3/library/wsgiref.html . Never publish, forward or publicly bind this app. No flawed existing starter is imported or served.

## Setup gate and proposed use
Actual serving requires a reviewed disposable ordinary-user POSIX guest, already provisioned Python 3, permission for this owned local listener/browser, and approved material transfer, supported versions, isolation, support/recovery and private evidence handling. Missing setup/permission means BLOCKED. Do not elevate, switch users or remove the guard to get past a blocker. Committing source does not approve a learner pilot.

From this fixture directory, after those gates:

    python3 -B training_site.py

Use only the exact owned local URL printed by the launcher. No browser opens automatically. Do not scan for the ephemeral port. GET/HEAD only; fixed paths are /, /exercise/own, /exercise/other and /exercise/missing. No queries, extra routes, scanners, fuzzing, uploads, credentials or load testing are in scope. The app counts at most 20 attempts before returning 429. Automatic browser requests can consume that budget. It is not a network traffic/rate limit. Stop at the budget; no retries or bypasses.

Predict outcomes, open only the fixed links and record actual observations or blockers. Other-note and missing-note status/body equality is selected evidence, not timing privacy or comprehensive non-enumeration. Header claims cannot change the fixed actor; that does not test real authentication.

Ctrl-C is the intended normal stop. The finally path closes the owned server and clears the in-memory notes. A fresh approved session restores fictional notes/counter; no file deletion or database reset is required. If shutdown is uncertain, use the approved support route rather than stopping unrelated processes.

## Selected author validation
In a temporary exact-file layout, Python 3.12.8 under effective UID 0 ran:

    python3 -B -m unittest -v test_training_site

All 25 methods passed with exit 0. They execute actual in-process HTML/policy checks, escaping, HEAD length, selected headers, method/path/query rejection, fixed actor, request budget and fresh-instance reset. Server startup/cleanup/failure checks use test doubles. An actual root CLI invocation was rejected before binding. No real listener, HTTP exchange or browser run occurred. The root-specific CLI method is conditionally skipped when not root; report actual counts there. The tests target this POSIX candidate, not universal OS support.

No GitHub CI or full repository suite was run for this batch. Source/test files are a reviewed reconstruction of the earlier standalone draft, not an automatic import of all prior attachments. Earlier offline/loopback records keep their own scope.

Before learner use, separately reproduce actual non-root bind, printed address, HTTP/HEAD behavior, browser-generated requests and budget, normal shutdown/listener closure and restart/reset in a supported guest. Crash/forced termination, malicious local clients, browser accessibility and supported student hardware remain unvalidated. A mocked server closure is not a genuine transport result.

A deliberately vulnerable browser practical is a later, separately reviewed milestone with exact defects/actions, synthetic data, isolation, bounded activity and recovery. Do not substitute a defective starter in this launcher. This package implements no grade, award, private evidence service, learner progression or production grant.
