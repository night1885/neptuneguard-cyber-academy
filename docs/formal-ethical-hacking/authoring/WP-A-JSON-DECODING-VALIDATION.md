# WP-A — file-decoding contract and core-CI alignment

Draft selected implementation record, 2026-11-03. Baseline 3ae922d1493b5d71acd74f85504816f9cda37c7a on feat/fictional-reviewer-validation, draft PR #49. All 36 returned baseline jobs succeeded; their names do not include the five offline-core groups, whose original workflow selected a different branch. No hosted result for this proposed change is claimed.

## Explicit bounded contract change
Previously load_records used the default decoder and the documented contract did not reject repeated textual object members before dictionary construction. The proposed loader now rejects repeated decoded member names within any JSON object, including equal values and escaped spellings of the same name. It raises a fixed ValueError without echoing the member or value. Names remain case-sensitive and repetitions in different record objects are allowed. This is a chosen teaching input contract, not a claim that every repeated-name document is an exploit.

validate_document still accepts a predecoded dictionary and cannot reconstruct information discarded by a caller's decoder. Its signature and validation, status grouping, summary output, type/range limits, initial MAX_BYTES+1 bounded read, record bound, adjacent-file/no-argument CLI and fixed rejection diagnostic are unchanged. The existing supplemental default-json.loads limitation test is preserved and still passes. No source/reference teaching role is changed and no fixture is made deliberately defective.

Python documents default last-value handling and object_pairs_hook for each decoded object: https://docs.python.org/3.12/library/json.html . The hook changes this application contract; it is not comprehensive JSON compliance, a streaming parser, filesystem containment, nesting/CPU protection, general evidence ingestion or authentication.

## Pinned sources and unchanged inputs
- summarize_observations.py baseline Git blob: 54c2be9fdd1cdeedbdff15f029baf9c4ef313137.
- Unchanged test_summary.py: 3aafe0983eede441b8e70c577372522d3a3c18d8.
- Unchanged test_summary_additional.py: ff3f75dd913b0d9b5a435e7facd3dd8be62dc461.
- Unchanged observations.json: 6bcae094c0377bc7c10d66e63d844206d5ff0c43.
- Original formal-offline-core-tests.yml: 7601fcdaa8e887c7edeee7a9873ac3061e9f68cb.
- Original PYTHON-FOUNDATIONS-02.md: 9baf40f3d09b71f485f12f82ea41f0a67b745009.

All six transcriptions were Git-blob verified before local processing. The new visible test_summary_decoding.py contains 14 decoding/API methods and three CLI methods. It checks selected root/record conflicts and equal repetitions, escaped-name collision, per-object scope, valid empty/fixture/order controls, distinct-name shape rejection, the predecoded boundary, fixed non-echoing duplicate rejection, valid output from an unrelated working directory and extra-argument rejection. No original test expectation or fixture byte changes.

## Actual selected local runs
Python 3.12.8, POSIX root author sandbox, fresh private temporary directory per suite invocation; not ordinary-account learner-platform reproduction.

| Source / named modules | Methods | Assertion failures | Errors/skips | Exit |
|---|---|---|---|---|
| Original / test_summary test_summary_additional | 32 | 0 | 0 / 0 | 0 |
| Original / test_summary_decoding | 17 | 9 | 0 / 0 | 1 |
| Proposed / all three named modules | 49 | 0 | 0 / 0 | 0 |
| Temporary hook removal / test_summary_decoding | 17 | 9 | 0 / 0 | 1 |
| Restored proposed / all three named modules | 49 | 0 | 0 / 0 | 0 |

The original's nine failures are against the proposed stricter contract, not proof that it violated its historical documented one. The temporary mutation removes only hook use; it leaves imports/helper definitions valid, and the selected tests fail for missing member rejection or wrong rejection stage rather than a setup error. It is not published. The restored source passed again. Finite selected checks are not a complete mutation score, input-space proof or independent learner performance.

CLI methods invoke local Python against copied exact filenames and synthetic adjacent data. The teaching program starts no subprocess or network operation. Unit assertions include multiple conditions/subtests; method totals are not counts of all conditions or child invocations. Original input/test blobs remained unchanged after runs. The downloadable execution record contains the actual selected outputs; it is not automatically an additional committed artifact.

## Existing workflow, now aligned to the authoring branch
The push branch filter retains formal-ethical-hacking-programme and adds feat/fictional-reviewer-validation. Existing docs/workflow path filters remain. Only the python-foundations group's command gains test_summary_decoding; the other four directory/command pairs are unchanged. Five independent matrix jobs retain fail-fast:false, five minutes per job, Python 3.12, contents:read, checkout persist-credentials:false and the existing action versions. No secret, service, installer, deployment, workflow_dispatch or broad discovery is added.

An approved matching push may start those five hosted jobs, up to their five-minute per-job timeout. Checkout/runtime setup can use GitHub's network; selected teaching groups remain offline. This is hosted-compute activation on this branch, not an already successful run. No other group was locally rerun here. Their job outcomes and the new source SHA must be inspected after commit. Other repository workflows have independent privileges/scope; this file's read-only setting does not describe all automation.

## Static checks and remaining scope
Local YAML parsing used BaseLoader to preserve on; assertions compared exact branch/path filters, permissions, steps, five groups, unchanged four commands and limits. Source reversal recovers the original component exactly; original lesson task/prerequisite and new local links were checked. Static parsing is not GitHub execution or action/security validation.

Only the component, new decoding tests, existing core workflow, PY-F2 contract explanation and this record change. No catalogue/prerequisite, learner-required task, runtime/publication flag, private-workflow endpoint, database, Discord handler, Community Learning or deployment change is included. No account, credential, real observation, listener, request, Windows/domain/KDF activity or learner collection was used. Full-checkout checks, hosted results, independent semantic/security review, accessibility, supported guests and assessor calibration remain open. WP-A is selected implementation progress, not complete acceptance of the work package or any competency.
