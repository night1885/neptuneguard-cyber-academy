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

## Separate the failure layers
| Layer | Example | What the selected program does |
|---|---|---|
| File access | Adjacent fixture missing | Expected OSError reaches the fixed CLI rejection path |
| Byte bound | More than MAX_BYTES | Rejects before parsing the oversized teaching file |
| Text decoding | Invalid UTF-8 bytes | Decoding fails before JSON validation |
| JSON syntax | Unclosed object | Parser raises JSONDecodeError, in the ValueError family |
| Parsed shape | A record lacks http_status | Exact-field validation rejects it |
| Field type/range | Negative client_exit | Selected contract rejects it |
| Aggregation | Already validated records | Groups fields under the helper's call-order assumptions |

An exact-boundary test matters as well as an oversize rejection. A reviewed JSON document padded with trailing whitespace to exactly MAX_BYTES remains within the initial byte bound; a thirteenth valid record exceeds the record bound. Do not assume every rejection test proves that an adjacent valid input is accepted. The byte check is a teaching limit, not complete resource protection for hostile nesting, filesystems or concurrent changes.

Unknown effective fields, repeated record IDs and duplicate textual JSON keys are three different questions. The standard decoder can retain the last value for a repeated textual key before this validator sees the dictionary. This selected limitation remains intentionally documented; do not call the program a strict arbitrary-JSON importer. A test that records the limitation is not a fix or permission to ingest real logs.

The CLI's fixed diagnostic avoids echoing the rejected invented ID in the selected invalid-ID run. That single check is not a comprehensive privacy review. Do not broaden the accepted path/arguments, add real records or connect this helper to network tools merely because its small fixture contract is explicit.

## Work
On paper, trace wrong root type, unknown field, duplicate ID, boolean exit, string status, missing status and oversized file. Identify the rejection stage and which facts remain unknown. Use only fabricated values; do not replace observations.json with real output or cause a network operation to generate records. The next lesson uses test-owned in-memory copies and temporary files, not ad hoc endpoint observations.

Source: https://docs.python.org/3/library/json.html and https://docs.python.org/3/tutorial/errors.html .
