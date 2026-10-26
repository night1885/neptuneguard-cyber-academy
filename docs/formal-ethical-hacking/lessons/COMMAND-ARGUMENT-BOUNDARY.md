# Command-argument boundaries — reproduce, repair and verify

Draft K08/K06 support, not a canonical lesson or a complete exploitation pathway. Begin after the Linux terminal/status foundations and [offline scripting foundations](PYTHON-FOUNDATIONS-01.md). This supporting sequence does not replace canonical prerequisites or authorise any new network operation.

## Setup and scope
Use only the five reviewed Python files in [the fixture package](../fixtures/command-argument/README.md), together in a fresh disposable approved POSIX guest workspace. Python 3 and /bin/sh must already exist through the approved provisioning/material-transfer route. Author checks used Python 3.12.8 locally, not a supported-student-platform matrix. Missing setup, support, recovery or private evidence handling means BLOCKED; do not install packages, elevate or reconnect an isolated guest as a workaround.

The starter is deliberately unsafe and must not be deployed or imported into academy runtime. Labels are the three fixed strings in the source; the CLI accepts no target/path/command arguments. Only a known Python worker and a fixed proof.txt marker in newly created test-owned temporary directories are involved. No real identities, personal files, network, privilege change or service is part of the exercise. Internal workspace/source guards are not a general security sandbox or permission adapter.

## Predict the boundary
The intended worker receives exactly one literal label. Predict three cases: plain text; text containing spaces; and the fixed instruction-text label. The vulnerable function quotes the trusted executable/worker parts but concatenates label text into a shell command. Quoting part of a command does not preserve every remaining value as data. A zero child/shell exit is not proof the intended label was preserved.

## Run the starter and its required-boundary tests
After reading all source, from the disposable fixture directory:

```sh
python3 -B argument_lab.py
result=$?
printf 'starter demo status=%s\n' "$result"
python3 -B -m unittest -v test_arguments
result=$?
printf 'starter test status=%s\n' "$result"
```

These Bash/POSIX-style status captures must follow the relevant process immediately. The final printf has its own status and is not a CI failure gate; -B is not a sandbox. Expected starter demo: three case summaries, two boundary-violating cases and exit 1. The spaced label is split; the instruction-text label creates the fixed marker. Expected starter tests: 12 methods, three failing assertion events, no test errors, exit 1. Record actual results or blockers, not the expected text as if observed.

The marker_created field reports an observation made inside the temporary case directory before normal cleanup. Do not expect a proof.txt left in the directory where you launched the program, and do not change paths to make it appear there. Interruption or cleanup failure remains an operational question.

## Repair your copy, then compare with the reference
Preserve original source/output first. The intended repair keeps the label as one list element and avoids shell interpretation. In a local student copy only, retain all fixed-label, worker and workspace checks while changing the final invocation to an argument list with shell=False. Preserve legitimate spaces and instruction-like text as literal data under this artificial exercise contract; rejecting every interesting label would not satisfy it. This is not a universal production label policy.

Do not change the tests or invented labels to conceal the defect. The supplied repaired reference is a visible learning aid, not protected exam material or a production command-execution library.

## Check the separate reference without overwriting the starter

```sh
python3 -B argument_lab_repaired.py
result=$?
printf 'reference demo status=%s\n' "$result"
python3 -B -m unittest -v test_repaired_reference test_cli_contract
result=$?
printf 'reference and CLI test status=%s\n' "$result"
```

Expected reference demo: all three labels preserved, all child exits zero, no marker and zero violations; process exit 0. The named positive suite has 15 methods: 12 direct-reference checks plus three CLI methods. It checks both demo contracts, extra-argument rejection and quiet import. It deliberately does not include test_arguments, whose original starter is expected to fail.

Running python3 -B argument_lab_repaired.py extra should be rejected with status 2, empty stdout and No arguments accepted on stderr. The CLI suite verifies this for both modules. Do not interpret a silent zero exit as proof that a demo actually ran.

## Explain and submit
Provide predictions, actual starter/reference results or blockers, a narrow local repair diff, preserved positive/negative controls and limitations. Explain why three failing assertions and two violating cases are different counts. The fixed marker proves a local interpreter effect, not remote exploitation, privilege escalation or application compromise. The repaired example does not validate every argument/parser/platform combination.

The [validation record](COMMAND-ARGUMENT-VALIDATION.md) corrects an earlier packaging/CLI claim. Supported guests, other shells, accessibility execution, independent assessment calibration, full repository/CI and certification readiness remain unverified. No grade, course progression, restricted access, publication or award is generated.

## Optional follow-up — executable selection
The separate [executable-search practical](EXECUTABLE-SEARCH-LAB.md) demonstrates that list arguments and shell=False do not alone select a trustworthy executable. It uses two fixed inert same-identity helpers, child-only PATH and an explicit-path reference; no privilege escalation or global/system configuration change is introduced. Read its distinct files, setup and limits before any approved run. This link does not expand the command-argument exercise's scope or register another canonical lesson.

Sources: https://docs.python.org/3/library/subprocess.html and https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html .
