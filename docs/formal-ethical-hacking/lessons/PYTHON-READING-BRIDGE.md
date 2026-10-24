# Python reading bridge — guided practice before repair work

Draft supporting material, not a new registered lesson or an independent programming qualification. Read after EH-LINUX-01 through EH-LINUX-03 and before attempting [EH-WEB-04](EH-WEB-04.md) independently if its short reading bridge is unfamiliar. This walkthrough does not replace that practical's web-capstone prerequisite. The catalogue remains unchanged.

## Objective and boundary
Read a short function, follow its inputs to its returned value, recognize a small immutable record, predict test results and distinguish synthetic data from execution evidence. The model concerns fictional practice runs, not authorization, student progression, real command execution or evidence verification. It is correct starter code; all supplied tests are expected to pass unchanged.

Use a clean approved guest with Python 3 and its standard library. Author execution used Python 3.12.8 only, not a supported-platform matrix. No pip, sudo, network access, personal files or credentials are needed. If Python or an approved material-transfer route is missing, stop and use the actual provisioning/support procedure rather than reconnecting an isolated guest. Keep both reviewed files together in a new disposable directory and use your editor to inspect them before running anything.

Files: [reading_model.py](../fixtures/python-reading/reading_model.py) and [test_reading_model.py](../fixtures/python-reading/test_reading_model.py). See their [execution notes](../fixtures/python-reading/README.md). These files are teaching code only and must stay outside academy runtime.

## 1. Names, values and comparison
In `status = 7`, the equals sign assigns a value to a name. In `status == 0`, the two equals signs compare values and produce True or False. The fixture compares status to zero; it does not run a shell command to obtain that status. A supplied 7 is synthetic data, not proof that a command failed.

A string such as "success" is text. The integer 0 is not the string "0". Keep the provided input types when using this practice model. Annotations such as `status: int` communicate intended types but do not automatically enforce validation. The functions are not designed to validate arbitrary untrusted input.

## 2. Functions and indentation
Read `describe_status` in the supplied source. `def` introduces a function, the parentheses name its input and the indented block is its body. `if status == 0` chooses a branch. `return` provides the result to the caller and ends that function call.

Predict `describe_status(0)` and `describe_status(7)` before reading the tests. Then trace `summary`: it obtains the record's label and status, calls the first function and combines text with `+`. Returning text is different from printing it. Importing this model does not print a transcript or execute a system check.

Use spaces consistently and preserve the indentation when editing a copy. An indentation or syntax error is not an assertion failure about the model's behavior. Save the file before rerunning tests and confirm you are in the disposable fixture directory, not the academy application.

## 3. Records, fields and tuples
`PracticeRun` is a dataclass with label, status and tags fields. A field is accessed with a dot, as in `run.status`. The decorator `@dataclass(frozen=True)` prevents ordinary reassignment of a field; the test demonstrates that narrow behavior. It does not authenticate the person who created the record or establish that its values are true.

`("reviewed",)` is a one-item tuple. The trailing comma matters: `("reviewed")` is just the parenthesized string. `()` is an empty tuple. This model uses a tuple of strings; freezing a dataclass would not make every possible nested object immutable.

## 4. Boolean decisions without security claims
Read `needs_review`. It returns True when the status is nonzero or the tuple lacks the tag "reviewed". `or` needs at least one true condition; `and` would require both. `in` tests membership and `not in` tests absence. The current expression is a practice review flag, not a real readiness decision.

Predict the flag for status zero with no tags, zero with the reviewed tag, and seven with the reviewed tag. Explain why adding a tag cannot turn a nonzero status into a successful result. Do not infer that a self-supplied reviewed tag verifies evidence or authorizes anything.

In the later ownership fixture, `None` represents an absent subject. Its meaning there comes from that model; it is not an authenticated user. Frozen records, membership checks and Boolean results do not by themselves create a trusted identity or enforce database access.

## 5. Run the named tests
From the disposable directory containing both files:

```sh
python3 -B -m unittest -v test_reading_model
result=$?
printf 'test status=%s\n' "$result"
```

This is a POSIX-style shell sequence. `-B` avoids writing Python bytecode cache files; it is not a sandbox. Capture `$?` immediately so it represents the test command, not a later action. The printed status is that captured command status; the shell sequence's final status is not a preserved test status and is not suitable as a CI failure gate.

There are eight unittest methods. The author observed eight passes and a test-command status of zero. Those observations are not your guest's results: record what your run actually prints. An import error, missing executable or syntax error is a setup/code problem, not evidence that the fictional review policy denied a real learner.

## 6. Independent work
Without changing the supplied expectations, add two named tests: a nonzero status with no reviewed tag, and a zero status whose only tag is a different string. Predict the review flag and summary before running. Explain which line supports each prediction. Use only fabricated labels.

On a disposable copy, change the comparison in `describe_status` from `==` to `!=`. Predict which existing tests should fail, run the named module, record the actual failures and restore the original code. Keep this mutation outside the repository/runtime and do not change expectations to make the defect look correct. A green suite supports only its tested examples, not full program correctness.

## Evidence and next step
Provide your predictions, actual test count/status, two added cases and one input-validation limitation through the approved private workflow only. Do not submit invented output or real student records. If you cannot explain a function call, tuple, branch or assertion, request a guided review before the later independent repair task. No score, enrolment, restricted access or award is generated by this bridge.
