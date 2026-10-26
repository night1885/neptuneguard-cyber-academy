# Executable-search boundaries — which program did you run?

Draft K09/K06 supporting practical after the Linux terminal/permission/process foundations and [command-argument exercise](COMMAND-ARGUMENT-BOUNDARY.md). This demonstrates executable selection under the same identity, not privilege escalation, an attacker-controlled account, root compromise or a complete Linux assessment pathway. No canonical registration or existing practical scope changes.

## Setup and effects
Transfer search_lab.py, search_repaired.py and test_search.py from fixtures/executable-search together into a fresh disposable approved non-root POSIX/Linux guest workspace. Python 3, /bin/sh and a supported executable temporary-file route must already exist through the reviewed provisioning/material process. Author execution used Python 3.12.8 locally only. Missing setup, private evidence, support or recovery is a blocker; do not install, elevate, reconnect, remount a no-exec filesystem or disable protections to finish the exercise.

The program creates two directories and one fixed inert script per directory in new test-owned temporary workspaces. It sets only those new helper files' modes to 0700. Selected tests change an owned fixture's mode/source or replace it with a local symlink to check rejection. No personal/system file, account, SUID/capability, service, global PATH or network is changed. The CLI accepts no target, path or arbitrary command arguments. Never deploy/import the fixture as academy runtime or a general command runner.

## Three different questions
The earlier repair preserved a value as one argument and avoided optional shell command-string parsing. That does not decide which executable a basename identifies. In the tested Python/POSIX setup, a name without a directory component is selected using the search path; the child env mapping controls this exercise's PATH. Other APIs/platforms have different details, so do not generalise this to every exec or Windows launch. An explicit trusted helper path removes the demonstrated name-search ambiguity but does not by itself prove the file, parent directories, dependencies or permissions trustworthy.

Both generated helpers are known reviewed text and simply print different FICTIONAL markers. The directory labels trusted/untrusted describe the intended lesson roles, not actual separate users or a malicious binary. Both are created and run under the same actor. A real privilege-escalation claim would additionally need evidence of a lower-trust influence reaching a higher-authority consumer, applicable controls and permitted impact. None is supplied by this same-identity demonstration.

Both variants use list arguments and shell=False. The helpers themselves have #!/bin/sh, so the OS uses that known interpreter for their fixed content. shell=False does not promise no interpreter exists anywhere; it avoids Python's optional shell-string parsing for this call. Program selection, argument interpretation and file trust remain separate boundaries.

## Predict the two cases
The starter invokes demo-helper by name. With the trusted directory first, the expected helper prints its marker. With the other fixed directory first, that helper prints its different marker. Both child processes can return zero: successful execution does not mean the intended program was selected. The repaired probe supplies the exact trusted-helper path under either search order. Only the child environment changes; the caller's PATH remains untouched.

## Run and reproduce
Read all three files first. In the disposable fixture directory:

```sh
python3 -B search_lab.py
result=$?
printf 'starter search demo=%s\n' "$result"
python3 -B -m unittest -v test_search.StarterTests
result=$?
printf 'starter search tests=%s\n' "$result"
```

Expected starter demo: two summaries, all_trusted false and exit 1; both children return zero, but the second case selects the other fixed helper. Expected starter suite: 12 methods, one intended assertion failure, no test errors, exit 1. Actual output and errors must be recorded, not replaced by these expectations. Immediate status capture matters; the final printf has its own status and is not a CI failure gate. -B is not a sandbox.

## Repair and verify the separate reference
Preserve original source/results, then change only your local selection to the intended explicit helper path while retaining fixed-layout/source constraints and legitimate operation. Compare against the visible reference:

```sh
python3 -B search_repaired.py
result=$?
printf 'reference search demo=%s\n' "$result"
python3 -B -m unittest -v test_search.ReferenceTests test_search.CliTests
result=$?
printf 'reference and CLI=%s\n' "$result"
```

Expected reference: both cases select the intended helper, all_trusted true, exit 0. Positive suite has 14 methods: 12 reused boundary requirements plus two CLI methods. The non-TestCase requirement mixin is not an extra suite. Running the entire test_search module also loads the deliberately failing starter class; do not describe broad discovery as an all-green release check. CLI checks verify both expected demo behaviours and extra-argument rejections.

Normal temporary-directory exit removes the generated workspaces. Interrupted execution or cleanup errors need the approved recovery process; do not recursively delete guessed parent paths. Helper source/mode/symlink checks are teaching constraints, not race-resistant containment or general executable provenance. An absolute path is not a cure for a writable trusted file.

## Instructor reasoning and independent work
Ask why the child status is zero in the wrong-helper case, why shell=False does not solve search-order trust, and what a real privilege-boundary finding would still require. Draw caller context → selected executable → interpreter/dependencies → performed operation. Mark actual observations versus hypothetical higher authority.

| Question | Prediction | Actual result / blocker | Missing evidence |
|---|---|---|---|
| Trusted-first selection | | | |
| Other-first selection | | | |
| Explicit-path reference | | | |
| Caller PATH before/after | | | |
| File trust / authority limits | | | |

Add a positive and rejection case using only the fixed fixture and test-owned files. Preserve expectations and record interventions. Do not add arbitrary executable inputs, enumerate system paths, alter global environment or test a privileged service. Submit minimal redacted evidence through the approved private route. See [validation](EXECUTABLE-SEARCH-VALIDATION.md); formal grading and K09/certification/job readiness remain incomplete.

Sources: https://docs.python.org/3/library/subprocess.html and https://docs.python.org/3/library/os.html and https://man7.org/linux/man-pages/man3/exec.3.html .
