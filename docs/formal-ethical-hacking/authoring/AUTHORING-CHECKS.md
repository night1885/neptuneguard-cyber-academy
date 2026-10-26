# Combined course-authoring checks

Maintainer tooling only. Requires a trusted repository checkout and Python 3.9+. This does not activate CI, deploy anything, validate hardware, authorize a lab or implement learner progression.

## One command
From the repository root:

```sh
python3 -B docs/formal-ethical-hacking/authoring/check_authoring.py
```

The runner uses paths relative to its own file, so its checks do not depend on the terminal's current directory. It checks the three first-journey documents, runs the existing README link checker and catalogue validator, and invokes only four explicitly named maintainer test modules. Child checks have a 60-second timeout each. Errors, nonzero child status and timeouts produce a failing overall status; a later success does not erase an earlier failure. Child output remains visible.

The module allowlist is test_check_index, test_check_catalogue, test_sql_shell_example and test_check_authoring. There is no broad discovery and no import of intentionally defective teaching fixtures. The existing SQL-shell regression test executes a trusted lesson shell block with the unittest command replaced by a mock; it does not run the SQL teaching fixture. Run only reviewed repository code. This script is not a sandbox for untrusted changes.

## What the document check means
It requires START-HERE.md, FIRST-PRACTICAL-WORKSHEET.md and authoring/FIRST-JOURNEY-PILOT.md. Simple inline local-file links resolve relative to each source document while staying inside the formal-ethical-hacking documentation root. Valid parent-relative links from authoring are allowed. Absolute and escaping local links, including percent-encoded parent paths, fail. Missing source documents or local target files fail.

It does not fetch external URLs, validate heading fragments, parse all Markdown syntax or check every course document. External URLs and fragment-only links are skipped, not verified. It does not establish that every authored lesson appears in the README or that every prerequisite is educationally sufficient. The existing index and catalogue checkers retain their documented limits.

## Test execution record
Eleven new test_check_authoring tests passed in the local authoring environment after correcting an off-by-one assertion in the test itself. Coverage: valid parent-relative link, missing target, encoded escape, absolute target, external/fragment skip, missing required document, explicit allowlist and child working directory, child failure, timeout, launch failure and preservation of a document failure despite successful child statuses.

The tests used temporary synthetic documents and injected child-runner doubles. The complete combined command was not executed against a full repository checkout in this batch. No new claim is made that the existing child modules passed, no GitHub CI run occurred, and no lesson fixture, two-VM workflow or learner pilot was executed. The allowlisted SQL-shell tests may be skipped if Bash is unavailable; a successful runner exit is not proof that no tests were skipped. Inspect the unittest output.

To run only these new regression tests, change into this authoring directory and run `python3 -B -m unittest -v test_check_authoring`. Its temporary files are disposable test data, not real learner evidence.

## Separate selected-practical runner
The new [practical-check instructions](PRACTICAL-CHECKS.md) describe a standalone 11-entry registry and listing-by-default runner with explicit --run, shell-helper and loopback opt-ins. It can deliberately reproduce known defective teaching starters and verifies their expected assertion names/counts rather than treating every exit 1 as equivalent. Its [execution record](PRACTICAL-CHECK-VALIDATION.md) distinguishes synthetic orchestration tests and one source-matched actual practical from unexecuted registry entries.

This is not added to check_authoring.py or its four-module allowlist. The existing combined runner's behaviour above and historical execution limits remain unchanged. Selected practical execution needs its own reviewed source/setup/effects; the new helper is not a sandbox, CI activation, learner grade or release approval.

## Release boundary
Passing selected structural checks does not remove any manifest blocker or establish platform compatibility, isolation, evidence privacy, assessor calibration or learning outcomes. Keep runtime integration and publication disabled until their separate reviewed approvals. No lesson, catalogue, manifest, learner record or teaching-fixture content is changed by this batch.
