# PY-F3 — Test behaviour and diagnose selected regressions

Draft K06 support after [PY-F1](PYTHON-FOUNDATIONS-01.md) and [PY-F2](PYTHON-FOUNDATIONS-02.md). Preserve the supplied correct starter and reviewed fixture. No academy runtime import, arbitrary report ingestion or network action is permitted by this lesson.

## Read a test as an executable question
setUp obtains a fresh parsed copy of the tiny reviewed file for each method. The supplied tests exercise a valid summary, status classes, no input mutation, shape/label/type/range failures, collection/byte limits, empty records and malformed JSON. assertRaises asks whether the specified operation raises the expected exception. An import/syntax error is not that assertion succeeding. Some methods use subTest for several values: 20 methods is not 20 total decisions or a complete security suite.

The tests use their own temporary directories for selected synthetic file failures. They do not delete user directories or modify the published fixture. Neither fresh test data nor passing assertions authenticates observations. Assertions about counts describe the chosen dataset only.

## Predict and execute the named module
In the disposable directory containing the three reviewed files:

```sh
python3 -B -m unittest -v test_summary
```

Record the actual status immediately using the approved shell procedure. The unchanged correct starter should report 20 test methods with no failures/errors. Your result is not supplied by the author record. If your added cases change counts, explain that instead of deleting cases to match a number. Do not run broad fixture discovery from the academy repository root.

## Add your own boundary cases
Add two named tests in your local test copy without weakening existing expectations: a negative client-exit value and invalid UTF-8 bytes in a test-owned temporary file. Predict why each should be rejected and which layer handles it. Save actual results and explain one untested limitation. These are visible practice tasks, not protected exam answers or a calibrated pass gate.

## Optional disposable counterexample
Preserve the correct files/output first. In a separate disposable copy only, replace the strict client_exit type condition with a permissive isinstance check. Predict the boolean-exit assertion, run the named tests and restore the baseline. The author observed one failing assertion event for this selected regression. Do not change expected values to make the bug look correct.

A second reasoning exercise is replacing status_group's normal numeric grouping with a constant 2xx. The author observed five failure events, including subtests, not five independent methods. This demonstrates selected coverage, not a complete mutation score. Syntax failures or imports blocked before assertions do not establish semantic detection. Do not preserve a counterexample as completed code.

## Choose evidence that distinguishes behaviors
For each proposed test, name its input, operation, expected result and the alternative implementation it would distinguish. A negative client exit tests a lower bound that the existing 256 case does not. Invalid UTF-8 tests decoding, not JSON syntax. An exact byte-boundary acceptance test complements an oversized rejection. Keep file tests inside their own temporary directory and never overwrite the reviewed fixture to manufacture a passing outcome.

Test a valid control alongside a rejected case, then check that the original inputs were preserved. A copied-dictionary test and a tuple-immutability claim are not interchangeable: the current helper copies dictionaries but callers can still edit those copies. Treat internal call-order assumptions as limitations, not newly discovered execution permission.

Mutation reasoning requires a semantic test failure. First run the unchanged baseline. Change one condition only in a disposable copy, identify the failing assertion rather than an import or syntax error, then restore and rerun the unchanged source. A failing subtest event is not necessarily another test method. Do not add baseline, expanded, mutant and restored run counts together and present them as distinct independent test coverage.

The author batch supplied with this proposed revision reran the 20-method baseline, ran a separate 12-method maintainer supplement together with it, reproduced the two selected mutations against the original baseline, and reran the restored expanded suite. The original learner command and the supplied baseline tests remain unchanged. The supplement is review support, not an automatically added learner requirement or a new pass threshold. Read its execution record before quoting any result.

## Deliverable
Provide scope, predictions, actual starter/test results or blockers, two added cases, explanation of any disposable mutation and limitations. A green suite does not establish trusted provenance, actual client behaviour, HTTP authorisation, deployed privacy, supported hardware or every malformed-input case. Continue with the [capstone](PYTHON-FOUNDATIONS-CAPSTONE.md).

Source: https://docs.python.org/3/library/unittest.html .
