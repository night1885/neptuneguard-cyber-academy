# Fixed-label command-argument teaching fixture

Read [the lesson](../../lessons/COMMAND-ARGUMENT-BOUNDARY.md) and [validation record](../../lessons/COMMAND-ARGUMENT-VALIDATION.md). This is draft supporting material, not a deployed service, canonical lesson registration or general command runner. The starter intentionally uses unsafe shell construction and must stay outside academy runtime.

Files: argument_lab.py is the defective starter; argument_lab_repaired.py is a separately executable repaired reference; test_arguments.py checks the starter's required boundary; test_repaired_reference.py directly checks the repaired module; test_cli_contract.py checks both CLI reports/statuses and quiet reference import.

Transfer all five reviewed Python files together into a fresh disposable approved POSIX guest workspace. Python 3 and /bin/sh must already be provisioned through the reviewed route. No pip, sudo, network reconnection, Windows-shell substitute, arbitrary labels or external targets. The helper creates known worker files and, in the defective case, one fixed proof marker inside its temporary directories. Normal context exit removes those directories; interruption/cleanup failure needs the actual support/recovery process, not recursive deletion of guessed paths.

Only after the approved setup/scope gates, run the lesson's explicitly named commands. Starter checks intentionally fail; repaired-reference plus CLI checks should pass. Do not use broad discovery as an all-green release gate. Guards and temporary directories are exercise constraints, not race-resistant containment or an authorisation system.
