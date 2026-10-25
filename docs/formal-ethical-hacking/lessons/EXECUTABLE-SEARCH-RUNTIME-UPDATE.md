# Executable-search runtime gate — alignment record

Baseline 2818ff85dfe7ec4ca7e3ac776a0478f7f6e93ebd. Draft source/test update, not an executed same-identity practical or K09 completion. The existing learner lesson explicitly requires a non-root approved POSIX/Linux guest. The original require_runtime checked POSIX and /bin/sh presence but did not enforce the non-root condition. This discrepancy was found by source review; it is not evidence of a production vulnerability or prior improper learner execution.

## Change and unchanged boundaries
require_runtime additionally rejects missing/noncallable effective-UID support and effective UID 0, before the interpreter lookup in those cases. It preserves the exact fixed helpers, shell=False launch arguments, file/layout checks and CLI behavior. Both starter and repaired-reference normal entry paths reuse this gate. No identity switch, privilege drop/elevation, environment weakening or workaround is added. Direct low-level fixture functions remain instructional internals, not hardened trust APIs.

The reviewed original Git blobs were 00a97291a26df1c2f9a8fce947125f71083049be for search_lab.py and 004df51d1245370f1b4f1071d0f0abd8bfb31164 for search_repaired.py. The latter reference and the original test_search.py are unchanged by this update.

## Actual execution and blocker
The local Python 3.12.8 environment was POSIX with /bin/sh present but effective UID 0. Consequently no actual helper, demo, original 12-method starter suite or original 14-method reference/CLI suite was run. The environment was not changed to bypass the lesson gate.

Fourteen mock-only contract checks passed against the original source. Seventeen mock-only checks passed against the updated source: launch-call structure and child-only environment, probe routing, guard/rejection behavior and mocked CLI result handling. Every subprocess.run call made by the fixture in these checks was mocked; no helper file was created, chmodded or launched by these tests. The missing-interpreter check uses a mocked non-root identity so root rejection cannot make that assertion pass for the wrong reason.

A separate actual Python invocation imported the updated source and called require_runtime only. It rejected the current root environment with the specified RuntimeError and nonzero process status. This demonstrates that guard path, not successful non-root execution or a supported student-platform matrix. Test orchestration invoked local Python, not a teaching helper.

## Selected reproduction and remaining work
From a temporary reviewed fixture copy, python3 -B -m unittest -v test_search_contracts runs the 17 mock-only contracts. It is not the original learner/reference practical. Do not run whole-module discovery including the deliberately failing starter and present it as an all-green release gate.

The full original starter/reference/CLI suites and fixed-helper demos still need an approved actual non-root POSIX guest and supported executable temporary-file route. Expected results in earlier author records are not new measurements. Further review must confirm error propagation and legitimate reference behavior there. No capability, SUID, service, host enumeration, credentials, network, arbitrary executable input, account change or privilege escalation is authorized by this update.

Root rejection enforces an exercise condition; non-root does not establish isolation or safe provenance. Existing race, parent-directory/dependency trust and platform limitations remain. No canonical graph, practical scope, learner grade, award, reader manifest or deployment configuration is changed. No GitHub CI outcome is established by the local run.
