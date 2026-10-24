# Command-argument boundary — corrected packaging and execution record

Draft selected author checks against source commit e3c87ee731975e1b3e8ed783ead7c6035a5b6918. Not a student transcript, supported-platform approval, full repository suite or CI result. Three original source copies were matched against their inspected Git blob identifiers before local checking.

## Correction of the earlier CLI statement
The committed argument_lab_repaired.py contained repaired helper functions but no run_demo/main entry point. Direct execution, including an extra argument, returned status 0 with no output. The previous sentence that both committed variants reject extra arguments with status 2 was incorrect for that reference file. Earlier temporary repaired-demo results did not establish the exact committed CLI behaviour. This record supersedes that wording.

The proposed update preserves the repaired run_label function and adds the report/CLI entry point. The deliberately unsafe starter and its 12 tests remain unchanged. New direct-reference tests import the repaired module explicitly, without copying it over the starter; new CLI tests execute exact filenames from unrelated temporary working directories.

## Final selected local checks actually executed
Python 3.12.8, POSIX-only author environment, fresh temporary directories.

| Suite | Methods | Assertion failure events | Test errors | Exit |
|---|---|---|---|---|
| Original starter boundary tests | 12 | 3 | 0 | 1 |
| Repaired reference boundary tests | 12 | 0 | 0 | 0 |
| Both CLI contracts and quiet reference import | 3 | 0 | 0 | 0 |
| Repaired reference plus CLI suite | 15 | 0 | 0 | 0 |

The CLI methods check the starter's two violating cases/exit 1, the repaired three preserved labels/no marker/exit 0, both extra-argument rejections/status 2, report presence and quiet import. The three methods contain multiple assertions/subtests and are not three total conditions. Restoring the original function-only reference in a temporary regression run produced two CLI assertion failures, no test errors and exit 1 across three methods. An initial test-harness probe encountered empty-output JSON decoding; the final tests explicitly assert report presence before decoding, so the missing entry point is reported as an assertion failure.

## Limits
Only fixed supplied labels and known workers were executed. Marker observations occur inside temporary case directories before normal cleanup; no external-target or privilege operation occurred. Helpers/CLI tests launch local Python and, for the unsafe fixed case, the local shell. Workspace/source checks are not race-resistant containment, hostile-input hardening or an authorisation service. -I/-B and a timeout are not OS isolation guarantees.

Not validated: supported student hardware/guests, installation or transfer route, Windows/other shells, production command handling, general input space, actual web application, network/service behaviour, accessibility execution, assessment calibration, full checkout checks or GitHub CI. This remains one foundational practical. Catalogue entries/edges, prerequisites, runtime, publication, Community Learning and real learner state remain unchanged.
