# WP-A — hosted checkpoint and repeatable regression harness

Draft selected validation record, 2026-11-03. This continues the [loader implementation record](WP-A-JSON-DECODING-VALIDATION.md), not a learner assessment or production parser/security approval.

## Hosted checkpoint actually inspected
Source head: 0893607c40b4f8900e7bd499b1ac9e0601b60494, feat/fictional-reviewer-validation, draft PR #49. GitHub returned 41 completed successful check runs at this head, including all five offline-core jobs in run 41676733734:

| Job | Job ID | Conclusion |
|---|---|---|
| offline-python-foundations | 126059259903 | success |
| offline-ownership-read | 126059260051 | success |
| offline-ownership-update | 126059259855 | success |
| offline-collection-export | 126059259947 | success |
| offline-search-contracts | 126059259933 | success |

These are job-level conclusions from the check-run metadata, not individual assertion counts, an inspection of every job log or proof that unrelated suites had no skips. They validate the stated pre-harness checkpoint, not this proposed harness commit. Search-contract success is mock-contract evidence, not non-root helper execution or privilege escalation. No WP-A/competency completion or deployment approval follows.

## Repeatable selected counterexample
The new test_summary_regression module copies exactly the reviewed component, input and three existing test modules into one private temporary workspace. It runs the three named child modules, removes only the single reviewed object_pairs_hook argument in the scratch component, runs the decoding child module, restores the original bytes in finally, and reruns the three named child modules. It verifies restored scratch bytes and unchanged original inputs. No fixture source is edited in the checkout.

Each phase uses a fresh local Python interpreter with -I/-B, a fixed child program, explicit private-workspace import path and allowlisted module tuple. The harness excludes itself from child selection, so it does not recurse. Neither -I/-B, a timeout nor a temporary directory is a general OS sandbox or complete descendant-process/crash-cleanup guarantee.

Child process completion and unittest success are separate fields. The parent requires nonzero executed tests equal to the loaded count, no errors/skips/expected failures/unexpected successes, and the exact nine qualified failure IDs for the selected hook-removal phase. A zero-test run, failed import, unexpected failure, silent no-op mutation or changed mutation anchor must not count as successful regression detection. Metadata-only phase summaries print measured method/failure counts, not input bodies or invented observations.

Four new outer methods cover the selected three-phase sequence, mutation-anchor cardinality, rejection of incomplete/invalid result reports and child-module selection without launching for rejected selections. The combined CI command has 53 outer methods: the existing 49 plus these four. One harness method performs three nested child invocations; their 49/17/49 method counts are not added to 53 as independent outer tests. The earlier three-module command still has 49 methods.

## Actual local runs before approval
Python 3.12.8, POSIX root author sandbox, fresh private review directories. The original five component/input/test transcriptions and workflow were Git-blob verified.

| Outer selection / local harness version | Outer methods | Outer assertion failures | Errors/skips | Exit |
|---|---|---|---|---|
| Existing three named modules | 49 | 0 | 0 / 0 | 0 |
| New regression module | 4 | 0 | 0 / 0 | 0 |
| All four named modules | 53 | 0 | 0 / 0 | 0 |
| Temporary no-op mutator, regression module | 4 | 2 | 0 / 0 | 1 |
| Restored harness, all four named modules | 53 | 0 | 0 / 0 | 0 |

Each successful harness sequence measured baseline 49/0 failures, hook removed 17/9 failures, restored 49/0 failures, with no child test errors or skips. The temporary harness counterexample retains its guard but returns unchanged source instead of removing the hook; both its exact-mutation check and end-to-end expected-failure check reject that no-op. It is not published. Outer counts use the final unittest summary, not a child summary quoted inside a failed assertion diagnostic.

The component, observations.json and all three existing test modules retained their original blobs after every outer run. Selected harness controls do not establish complete mutation coverage, hostile-input security, general test isolation or independent learner performance. Other core groups were not locally rerun in this batch. The downloadable execution record contains the actual selected outputs and fingerprints; it is not automatically another committed artifact.

## Source identities and workflow boundary
- summarize_observations.py: bcfdb8d2464629bda61aaccef4ff3900fb9ae397.
- observations.json: 6bcae094c0377bc7c10d66e63d844206d5ff0c43.
- test_summary.py: 3aafe0983eede441b8e70c577372522d3a3c18d8.
- test_summary_additional.py: ff3f75dd913b0d9b5a435e7facd3dd8be62dc461.
- test_summary_decoding.py: 8ddd72bfdbe545031331b011dad741566c1e8094.
- Existing workflow: 2d4c6c7dd5685b211c26bc75fe53676f5c57a6e3.

Only the existing python-foundations command gains test_summary_regression. YAML BaseLoader comparison confirmed all other parsed workflow fields unchanged: five groups, other four directory/command pairs, branches/paths, contents:read, existing action versions, checkout persist-credentials:false, Python 3.12, fail-fast:false and five-minute per-job timeout. No new workflow, service, install step, secret, privilege, dispatch or broad discovery is added. Matching pushes can run the already enabled five hosted groups; new-harness hosted acceptance is pending inspection after commit.

## Remaining limits
Only the new test module, the existing workflow command and this record change. The loader/contract, synthetic input, existing tests, learner tasks, catalogue/prerequisites, runtime/publication, private workflow and Community Learning remain unchanged. No actual executable-search helper, listener, request, credential, real record, Windows/domain/KDF operation, learner collection, database change, Discord publication, merge or deployment is introduced. Ordinary-account supported guests, independent semantic/security review, accessibility, learner/assessor calibration and full work-package acceptance remain open.
