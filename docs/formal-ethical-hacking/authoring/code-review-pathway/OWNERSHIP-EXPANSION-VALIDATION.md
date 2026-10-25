# Application ownership/code-review expansion — local evidence

Draft maintainer record at baseline 46ed4592f5fc7f5664b1c6f78016d28cd2bdf775. This is not a student transcript, full-checkout/CI result or release approval. All execution used Python 3.12.8 in temporary exact-file layouts with invented actors and in-memory SQLite. No listener or network transport was used.

## Source identities
The original read-fixture Git blobs were verified before execution: application_lab.py 828353b64c1340b7311f301d25f7b1303ad86a83; application_repaired.py a0bb23e66156599fe2c4f27480577b884827e8d0; test_application.py 06532c5c90e06061722a02380ec39b3fb08fe1c8; test_reference.py acb569f26b44384021d56f1def52017f0035a4b8; test_cli.py 05c15ea4c41e9982153e938138d010dcfbdeb423. The original walkthrough was verified as 2802a14057aefce0b83c8a2e2160e3ea4f379878.

## Measured runs
| Source state / group | Methods | Failure events | Exit |
|---|---|---|---|
| Deliberately flawed starter: test_application | 20 | 4 | 1 |
| Correct reference and test_cli | 22 | 0 | 0 |
| Reference, CLI and separate additional tests | 34 | 0 | 0 |
| Temporary deny-all policy: reused reference requirements | 20 | 4 | 1 |
| Correct reference restored: expanded group | 34 | 0 | 0 |

The starter and deny-all runs failed assertions, not imports or syntax. Four starter symptoms arise from the missing ownership condition, not four independently discovered vulnerabilities. Four deny-all failures concern broken legitimate behavior; equal counts do not establish equivalent defects. Inherited requirements and repeated runs are not additive independent coverage. Only the original flawed teaching starter and correct unchanged reference remain; no deny-all mutation is included as a completed repair.

The two separately invoked CLI demos returned the expected boundary_met false/exit 1 for the starter and true/exit 0 for the reference. CLI contract tests additionally exercised their named demo and argument cases. These are local Python invocations and in-process WSGI calls, not HTTP traffic or authentication validation.

## Additional checks and reproduction
Twelve extra tests cover route/key limits, harness-context override rejection, selected Unicode JSON/byte-length behavior, denied HEAD metadata, unchanged stored rows for a selected read, absent-row policy short-circuiting, an invoked denial policy, and method/query-before-actor call order. A few policy-call tests use a double to observe the call; they do not replace the real reference-path checks. Default JSON escaping means the Unicode test does not establish raw UTF-8 network transport. Call-order behavior is a fixture observation, not a universal production policy.

In a new reviewed disposable copy, use python3 -B -m unittest -v test_application for the deliberately red starter and python3 -B -m unittest -v test_reference test_cli test_application_additional for the 34-method positive group. Do not use broad discovery including deliberately failing starters as an all-green release gate. The supplement is visible maintainer/practice support, not new learner requirements or an activated pass threshold.

## Limits
The original five fixture files and learner commands are unchanged by this batch. The expanded walkthrough was built from its exact original text; removing the insertion reconstructs the original and its existing inline link destinations remain. This is not full link-target validation, independent semantic review or learner assessment calibration.

No real authentication, proxy deployment, network endpoint, public target, credentials, persistent database, migration, concurrency, supported guest/toolchain/material route, advanced-web/certification readiness, full-checkout suite or GitHub CI was established. Canonical registration, practical permissions, reader manifests and runtime/deployment configuration are unchanged. Committing the teaching material and test supplement is not production activation.
