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

## Deliverable
Provide scope, predictions, actual starter/test results or blockers, two added cases, explanation of any disposable mutation and limitations. A green suite does not establish trusted provenance, actual client behaviour, HTTP authorisation, deployed privacy, supported hardware or every malformed-input case. Continue with the [capstone](PYTHON-FOUNDATIONS-CAPSTONE.md).

Source: https://docs.python.org/3/library/unittest.html .
