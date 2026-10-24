# PY-F1 — Trace a complete offline program

Draft K06 support, not a canonical lesson or programming qualification. Read the [Python reading bridge](PYTHON-READING-BRIDGE.md) after EH-LINUX-01 through EH-LINUX-03 if calls, branches or records are unfamiliar. This supporting route does not replace any existing practical prerequisite. Continue with [PY-F2](PYTHON-FOUNDATIONS-02.md), [PY-F3](PYTHON-FOUNDATIONS-03.md) and the [capstone](PYTHON-FOUNDATIONS-CAPSTONE.md).

## Setup and scope
Use only the reviewed [summary program](../fixtures/python-foundations/summarize_observations.py), [tests](../fixtures/python-foundations/test_summary.py) and [fictional records](../fixtures/python-foundations/observations.json) together in a new disposable directory through the approved material-transfer route. Python 3 and its standard library must already be provisioned. Author execution used Python 3.12.8, not a compatibility matrix. Commands below assume the approved POSIX-style launcher python3; any Windows launcher/setup needs its own reviewed route. No pip, sudo, network reconnection or guessed installer is part of this work. Missing tools or transfer guidance are blockers.

This correct starter is intended to pass unchanged, unlike the deliberately defective ownership-repair fixture. It reads only its adjacent reviewed JSON and prints a synthetic summary. It opens no socket, invokes no shell program and grants no authority. Tests create/delete only their own temporary synthetic files. Do not run a repository-wide installer or connect the helper to a scanner, bot, web client, database or academy workflow.

## Follow values, not just lines
Start at main: check that no arguments were supplied; locate observations.json beside the script; load and validate all records; compute the summary; serialize the returned dictionary. Returning a value and printing it are different effects. Importing the module defines functions but does not run main because of the __name__ guard.

A Path identifies a local filesystem reference, not testing permission. load_records reads at most MAX_BYTES+1 bytes, rejects an oversize input, decodes UTF-8 and parses JSON. JSON null becomes Python None. A dictionary maps names to values; records is a list of dictionaries. validate_document checks the chosen object contract before summarize uses it. Its returned tuple contains copied dictionaries whose expected values here are primitive data; this is not a general deep-immutability design.

Trace status_group(404): it is not None, integer division gives 4, and the formatted result is 4xx. Trace None separately: not-recorded describes the dataset field, not proof that no server response ever existed. A08's 100 is an informational status label; these records are not complete HTTP transactions. A07 deliberately combines a recorded 200 with nonzero client exit; recorded response metadata does not imply a completed transfer.

## Predict and run
Before execution, predict the number of records, each group count and the nonzero client-exit count. Then, only in the disposable fixture directory:

```sh
python3 -B summarize_observations.py
```

Capture the actual command status immediately using the approved shell workflow. -B avoids bytecode-cache writes; it is not a sandbox. The report should describe eight fictional records, not eight new requests. Script status zero means this processing run succeeded, not that every embedded client exit was zero or any endpoint is secure. No output file or saved learner progress is created by the program. Do not redirect over the fixture or another file.

## Explain independently
Draw the function-call/data-flow chain and annotate which steps return values, read bytes or print. Explain why a tuple, copied dictionary and synthetic flag do not establish trusted provenance. Keep your predictions distinct from genuine execution or an honest setup blocker. See [instructor guidance](PYTHON-FOUNDATIONS-INSTRUCTOR.md) and [bounded validation](PYTHON-FOUNDATIONS-VALIDATION.md).

Sources: https://docs.python.org/3/library/json.html and https://docs.python.org/3/tutorial/errors.html .
