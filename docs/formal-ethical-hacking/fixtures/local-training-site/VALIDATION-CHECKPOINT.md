# Consolidated validation checkpoint and regression batch

Draft, not published or learner-activated. This replaces repeated micro-status updates with one review checkpoint. PR #21 remains draft and unmerged. The passing runtime, Chrome sandbox request, non-root gate, approved six-request HTTP and 25-navigation browser scopes are unchanged by this batch.

## Verified prior snapshot
At d31754679fa15b12a8e679f3884e1a7b71156a3b, GitHub reported completed/success for all three jobs:
- Offline named checks: https://github.com/night1885/neptuneguard-cyber-academy/actions/runs/40251324730/job/121343663883
- Non-root six-attempt loopback HTTP: https://github.com/night1885/neptuneguard-cyber-academy/actions/runs/40251324733/job/121343663968
- Sandboxed Chromium and owned CLI restart: https://github.com/night1885/neptuneguard-cyber-academy/actions/runs/40251324696/job/121343663727

The browser job uses the installed Chrome channel with chromium_sandbox=True. Its success is selected evidence from the configured script requiring two owned CLI sessions, rendered/status checks, a 429 budget response, restart and two normal SIGINT exits. It is not independent inspection of every report field or proof of all sandbox layers. The successful run's raw artifact/logs have not been inspected; exact browser/Python/UID and aborted-request details remain unverified here. The earlier f02b392 sandbox failure remains historical evidence, not the result of this corrected snapshot.

## Contents of this single batch
1. Durable in-process response regressions: one method with a 35-case matrix and one selected denied/missing/HEAD-invariant method. Methods, paths, query rejection, fixed identity, escaped/non-ASCII text, closed/exhausted states and selected WSGI contracts are covered without HTTP traffic.
2. Five mocked browser-report control methods: blocked runtime, browser launch failure, incomplete counts, forced-cleanup rejection and acceptance of clean simulated 21/4 plans. These test report control flow; they do not reproduce real browsers, signals, actual cleanup failures or OS isolation.
3. Offline CI explicitly names the original suite, response regressions, existing three pure browser guards and new mocked report tests. No test discovery across vulnerable fixtures is added. HTTP/browser workflows and runtime source are unchanged.
4. A blank gated manual learner worksheet, with observations separate from predictions and no expanded manual request permission.

## Actual author check for this batch
Seven new methods passed locally on Python 3.12.8 against application/browser copies matching Git blobs 7947f0f140bdedd702701b22e1fe0fa6e0ed4e0f and 5adc6ea6a897f07f292bfc915cf77831ad408bba. The 35 matrix cases are subtests, not 35 additional methods; the invariant method makes further in-process calls. No listener, real browser, CLI child or external testing target was used. The original 25-method suite, existing browser guards, full repository and expanded CI command were not rerun in this local batch. Their earlier results keep their own scope. New CI results must be read after commit; the prior green snapshot does not validate this uncommitted batch.

## Remaining gates
- Inspect the successful browser artifact/logs and actual CI skip counts.
- Review and execute a supported ordinary-user learner guest/browser route, human keyboard/readability/accessibility checks and genuine manual stop/restart evidence.
- Provide approved provisioning/material transfer, support/recovery and private learner evidence handling.
- Separately specify any intentionally vulnerable practical and its isolation, activity and recovery design.
- Review any merge, publication or learner activation as a distinct action.

Configured scope, a green selected CI job and a completed worksheet are not a complete course, supported hardware claim, certification readiness, production hardening, real authentication or independent learner pilot. Company/external systems remain excluded. No public hosting, network/security-policy change, learner record, Discord/Render/PostgreSQL integration, catalogue registration, grade or award is introduced.
