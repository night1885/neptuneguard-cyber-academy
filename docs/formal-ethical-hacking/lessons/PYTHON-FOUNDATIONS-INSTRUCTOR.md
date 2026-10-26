# Offline scripting foundations — instructor guide

Draft visible teaching support. Begin with [PY-F1](PYTHON-FOUNDATIONS-01.md), then [PY-F2](PYTHON-FOUNDATIONS-02.md), [PY-F3](PYTHON-FOUNDATIONS-03.md) and the [capstone](PYTHON-FOUNDATIONS-CAPSTONE.md). The three source files are in fixtures/python-foundations. This correct starter should pass, unlike deliberately defective later repair exercises.

## Teaching prompts
Ask what a function returns before asking what the program prints. Have students trace one None value and one 404 through validation/grouping. Ask whether a label, parsed record or returned Boolean proves truth, permission or execution; it does not. Ask which object is changed when a test edits its own fresh parsed dictionary.

## Expected fictional report
Eight records: 1xx=1, 2xx=3, 3xx=1, 4xx=1, 5xx=1, not-recorded=1. Two embedded client exits are nonzero. These are summaries of supplied labels only. A zero exit from this helper means processing succeeded under its contract, not a clean assessment or eight successful network transfers.

A07 illustrates a recorded response status with a nonzero client exit; A08 illustrates an informational status. Missing status means absent from this record, not proof of no response anywhere. No body, complete timing, real tool version, provenance or full HTTP trace is supplied.

## Boundary/causality guidance
A boolean status is rejected by the strict type check and also cannot satisfy the chosen HTTP numeric range. Its rejection alone does not show which condition mattered. True is within the client-exit numeric range, making the permissive-type counterexample a useful selected test. Do not confuse a passing negative test with proof that every guard is necessary or sufficient.

Unknown effective object fields and duplicate record IDs are rejected. Duplicate textual JSON keys are a different issue not detected here by the default decoder. This is a trusted tiny-material exercise, not hostile-input hardening or an evidence ingestion service. Internal functions are not general public security APIs.

Suggested added-case guidance: -1 should fail the client-exit contract; invalid UTF-8 should fail decoding before a summary. Use only test-owned temporary files. An import failure is not a passing assertRaises check. Preserve all valid original expectations.

## Review dimensions
Record function/data-flow understanding, type/shape contracts, actual failure stage, positive/negative tests, privacy of diagnostics, correct interpretation and instructor intervention. There is no numeric pass threshold, automatic course progress, lab grant or award. Supported guest reproduction, independent programming assessment, accessibility review and calibration remain pending. This begins addressing K06; it does not establish shell/PowerShell proficiency, safe general network automation or full certification coverage.
