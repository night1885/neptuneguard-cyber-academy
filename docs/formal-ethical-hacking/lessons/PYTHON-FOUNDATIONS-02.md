# PY-F2 — Validation contracts and explicit failure

Draft K06 support after [PY-F1](PYTHON-FOUNDATIONS-01.md), using only the same reviewed disposable files and approved setup. No new execution target or permission is introduced.

## Contract before conditions
The root object must contain exactly synthetic and records, with synthetic exactly True. Records is a list of at most 12 items; an empty list is allowed. Each record has exactly id, method, http_status and client_exit. IDs are unique ASCII labels matching one capital letter plus two digits. GET/HEAD are the only allowed teaching labels, not a claim that other HTTP methods are invalid or always unsafe.

http_status is None or a true integer from 100 to 599. This numeric teaching range does not verify that a code is assigned, final or correctly observed. client_exit is a true integer from 0 to 255 under this fixture contract; it is not an HTTP status or universal native-tool validation. Python booleans have an integer relationship, so type(value) is int deliberately rejects them here. The same value 200 as text is also rejected rather than silently converted.

Parsing and validation are separate. Well-formed JSON may contain the wrong shape or types. The program rejects unknown effective object fields and duplicate record IDs. It does not detect duplicate textual JSON keys discarded by the default decoder; that is different from duplicate IDs in a parsed list. The synthetic flag is a label, not proof of truth or authority. This helper is for the tiny reviewed teaching file, not a hardened general importer for hostile logs or real evidence.

## Trace the failing branch
Consider client_exit=True in a disposable in-memory test record. A permissive isinstance(value, int) would accept its integer relationship; the strict check raises ValueError. By contrast, a boolean HTTP status also fails the numeric range, so observing its rejection alone does not show which condition caused it. Use counterexamples to understand the reason for a test result.

load_records bounds its initial read and validates everything before a report is printed. This avoids a partial success summary for the selected invalid-data cases; it does not establish complete resource hardening or protection against arbitrary malicious files. The public CLI accepts no alternate path or other arguments. Internal functions still assume their stated call order/contracts; they are not standalone academy security adapters.

## Errors and presentation
main catches expected OSError/ValueError families for this route and emits a fixed diagnostic to stderr with process status 2, without echoing raw field values. A successful summary goes to stdout with status 0. Invalid JSON raises JSONDecodeError, a ValueError subclass. Unexpected programming errors are not concealed with a catch-everything success response. An empty valid collection yields zero observations, not a clean security assessment.

## Work
On paper, trace wrong root type, unknown field, duplicate ID, boolean exit, string status, missing status and oversized file. Identify the rejection stage and which facts remain unknown. Use only fabricated values; do not replace observations.json with real output or cause a network operation to generate records. The next lesson uses test-owned in-memory copies and temporary files, not ad hoc endpoint observations.

Source: https://docs.python.org/3/library/json.html and https://docs.python.org/3/tutorial/errors.html .
