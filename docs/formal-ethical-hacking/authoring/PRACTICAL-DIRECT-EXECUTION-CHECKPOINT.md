# Selected practical registry — direct-execution checkpoint

Draft maintainer evidence, recorded 2026-10-25. runtimeIntegration:false; publishable:false.
Pinned source: b65d9b5eb09d8dc60e3fb94506c1a3dd1e03aa29. Python 3.12.8.
This consolidates earlier selected-file executions; no tests were rerun while writing this record.

## Observed contracts across separate batches

Entry | Named unittest selectors | Methods | Exit | Intended failures
--- | --- | ---: | ---: | ---:
python-summary | test_summary | 20 | 0 | 0
password-verifier | test_verifier | 17 | 0 | 0
ownership-reference | test_reference test_cli | 22 | 0 | 0
ownership-starter | test_application | 20 | 1 | 4
update-reference | test_update_reference test_update_cli | 29 | 0 | 0
update-starter | test_updates | 27 | 1 | 3
arguments-reference | test_repaired_reference test_cli_contract | 15 | 0 | 0
arguments-starter | test_arguments | 12 | 1 | 3
executable-reference | test_search.ReferenceTests test_search.CliTests | 14 | 0 | 0
executable-starter | test_search.StarterTests | 12 | 1 | 1
loopback-http | test_loopback | 12 | 0 | 0

Commands used python3 -B -m unittest -v followed by the listed selectors, from each
reviewed fixture directory in an owned temporary selected-file layout. Source/data copies
were verified against inspected Git blob hashes before execution. Per-batch JSON reports
with source identities and output were delivered in the authoring conversation; those raw
artifacts are not committed by this documentation change. This is an author execution
record, not an independently reproduced CI result.

All observations matched their selected registry contracts: 200 method executions,
including eleven intentional starter assertion failures. Shared/inherited test logic
means these are not 200 independent guarantees. Every run had zero errors, skips,
unittest expected-failure decorations and unexpected successes.

Exact starter failure names:
- ownership: test_head_nonowner, test_nonowner, test_nonowner_body, test_unknown_same_denial.
- update: test_course_field, test_owner_field, test_state_field.
- arguments: test_instruction_text_is_literal, test_no_marker, test_spaces_preserved.
- executable search: test_untrusted_first.

## Effects and interpretation

Offline tests used synthetic inputs, local Python children and owned temporary files or
in-memory SQLite. Shell-helper tests used fixed reviewed labels/scripts; the argument
starter deliberately created a temporary proof.txt marker, and search tests changed only
owned helper files/modes/symlinks and child PATH. Loopback tests used short-lived
127.0.0.1 ephemeral-port listeners and local HTTP clients. Cleanup assertions for closed
listener, joined worker and closed database passed. No public bind or external target
was used. These are selected cleanup assertions, not all-failure-path or host-wide proof.
Teaching actors are fictional assumptions, not authentication. Defective starters remain
intentionally insecure and must not be deployed. No teaching source was modified.

## Still not established

These eleven observations came from DIRECT named test runs, not one combined run and
not collective execution through run_practical_checks.py. The earlier runner record
retains its own narrower scope. The registry is selected coverage, not every practical
or all course lessons. This is not a readiness percentage or release approval.

No full-checkout authoring check, GitHub CI, supported student-platform/two-VM route,
private learner/reviewer integration, real evidence handling, accessibility acceptance,
assessment calibration, learner pilot or production activation is established here.
Workflow and persistence experiments remain separate uncommitted artifacts, not academy
components. Runtime/publication, enrollment, awards, Community Learning and learner
records remain unchanged. Next work is actual registered-runner integration followed
by reviewed full-checkout checks; both need fresh execution evidence.
