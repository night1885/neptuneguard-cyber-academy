# Selected-practical runner — bounded execution record

Draft authoring record following d2abacce1473f690c0237deb90bbd855acfdd894. The registry has 11 entries; six use the initial offline profile, four require shell-helper opt-in and one requires loopback opt-in. It records current selected fixture expectations, not complete curriculum coverage.

## Actually checked
Fourteen orchestration test methods passed locally on Python 3.12.8. Synthetic plans/process doubles covered shape/type/ID/path/selector validation, six-entry default selection, shell/loopback gates, unknown profiles, inconsistent expectations, explicit command/working directory, matched positive/intentional-defect results, wrong failing test names, unexpected import errors, zero methods, skips/expected-failure decoration, missing directory and timeout. These tests do not execute the teaching fixtures.

A bare runner invocation returned listing-only without executing fixtures. Selecting loopback-http with --run but without its opt-in returned status 2 and empty stdout.

One actual source-matched practical was run through the new runner: python-summary. The three source/data copies matched inspected Git blob IDs 54c2be9fdd1cdeedbdff15f029baf9c4ef313137, 3aafe0983eede441b8e70c577372522d3a3c18d8 and 6bcae094c0377bc7c10d66e63d844206d5ff0c43. In a temporary selected-file course layout, its real unittest process reported 20 methods, no failures/errors/skips or expected-failure decorations, exit 0; matched_expected_behavior was true. Temporarily expecting 19 instead produced a mismatch and runner status 1. No placeholder teaching files stood in for unexecuted registry entries.

## Not established
The other ten entries were not collectively executed through this runner in this batch. Their lesson-specific historical records retain their own snapshots; registration is not fresh execution evidence. No full checkout, combined-authoring rerun, all-practical test run, GitHub CI, supported student platform, new network/listener activity, real credentials/evidence, learner workflow or release approval occurred.

The runner parses selected unittest summaries and failing test-method names. It is not a complete semantic checker, malicious-code sandbox, general hostile-output parser, anti-cheating system or grade/progress adapter. Effect categories are reviewed metadata, not OS containment. Catalogue/prerequisites, manifests, runtime/publication, Community Learning and learner state remain unchanged. Existing check_authoring.py code/allowlist are not modified or expanded.
