# WP-A — maintainer output-observer integration

Draft selected validation record, 2026-11-03. Baseline da9f6b7902cc2a9a8402573730f36c5d5371686f on feat/fictional-reviewer-validation, draft PR #49. GitHub returned 41 completed successful jobs, including all five offline-core groups in run 41678886168. These are baseline job conclusions, not new-batch CI or per-test log/skip verification.

## Bounded correction
run_practical_checks.observe previously selected the first Ran-summary and scanned the whole stderr for failure/error/count markers. A nested child summary quoted inside a parent assertion diagnostic could therefore be mistaken for the parent result. New synthetic tests reproduce the mismatch; this is a maintainer reporting defect, not evidence that a teaching control or deployed authorization boundary failed.

The revised observer selects the final standard unittest summary, reads only its terminal OK/FAILED counters and rejects missing, unknown, repeated or inconsistent footer fields. Failure names are supplied only when all matching FAIL headers reconcile with the final failure count; polluted/ambiguous names stay None. Error-header disagreement leaves errors unknown. Unknown fields cannot equal the fully specified completion contract. Nested skip/expected-failure counters are not silently treated as parent counters.

This is conservative interpretation of selected standard unittest text from reviewed modules, not authentication of arbitrary output or a general log parser. Counts and failure-name attribution are separate observations. It may decline to match ambiguous custom diagnostics rather than manufacture a successful reproduction.

## Preserved runner and plan boundaries
Only observe changes in the runner. Plan validation, named selectors, listing-only default, --run requirement, independent shell-helper/loopback opt-ins, path checks, timeout and subprocess launch are unchanged. practical-checks.json and both existing maintainer test files remain byte-identical. The eleven plan rows and six default offline selections retain their intentional selected-suite expectations; the Python-summary row is still its original 20-method subset, not silently relabelled as the separate 53-method CI selection.

## Actual local checks
Python 3.12.8, POSIX root author sandbox; not approved ordinary-account learner reproduction. Four input transcriptions were Git-blob verified:
- run_practical_checks.py: fa846e858792df236057c2a2231902d16701f60f.
- practical-checks.json: 100a4c4b2709e19440a4624260ca302d45800c1c.
- test_run_practical_checks.py: ee61e25fc4731cf39a7ac051431a560cc25f1cd0.
- test_practical_cli_boundaries.py: 6ef1dca547703c46d4683e3d80950665ab7a0c87.

| Local runner / selection | Methods | Assertion failure events | Errors/skips | Exit |
|---|---|---|---|---|
| Original / existing two modules | 20 | 0 | 0 / 0 | 0 |
| Original / new observer module | 12 | 16 | 0 / 0 | 1 |
| Proposed / all three named modules | 32 | 0 | 0 / 0 | 0 |
| Temporary first-summary regression / observer module | 12 | 7 | 0 / 0 | 1 |
| Restored proposed / all three modules | 32 | 0 | 0 / 0 | 0 |

Failure events include failing subtests, not counts of independent methods or vulnerabilities. The temporary regression changes only final-summary selection back to first-summary selection; it is not published. Each observer-module run includes one actual two-method synthetic unittest child with one deliberate parent failure quoting a 17-test child summary. The corrected execute path matches its intended two-method/one-failure contract. All other launch checks use doubles; CLI tests patch execute and verify no launch for listing, missing --run, invalid selections or missing/wrong effect opt-ins.

No teaching fixture suite, shell helper, loopback listener, policy, WSGI/SQLite handler, real identity or network action ran locally. The synthetic child is not a learner practical. Existing plan/test blobs were rechecked after runs. The downloadable execution record contains selected outputs/fingerprints and is not automatically another committed artifact.

## CI integration and write scope
The existing core workflow gains one maintainer-contracts matrix row for the authoring directory and exactly the three named unit modules. YAML BaseLoader comparison confirmed the prior five rows and all other fields unchanged. The inspected combined authoring runner does not select these modules; it is not changed. No new workflow or broad discovery is introduced.

This proposal increases the core matrix from five to six hosted jobs on already configured matching pushes. All retain contents:read, existing checkout/setup actions, persist-credentials:false, Python 3.12, fail-fast:false and five-minute per-job timeouts. No secret, installer, service, dispatch or deployment step is added. Hosted checkout/setup can use GitHub's network; the new tests make no network request. A post-commit hosted result is still required.

Only the observer function, new observer tests, existing core workflow and this record change. The summary loader, existing regression harness, practical plan, learner tasks, catalogue/prerequisites, runtime/publication, private workflow and Community Learning remain unchanged. No database change, live Discord publication, merge, deployment, learner collection, grade or award is authorized. This is selected WP-A integration progress, not complete parser/security assurance, supported-platform validation or work-package acceptance.
