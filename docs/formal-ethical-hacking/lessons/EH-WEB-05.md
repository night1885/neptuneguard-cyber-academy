# EH-WEB-05 — Keep data separate from SQL code

Draft offline practical, not published. Requires EH-WEB-04 and basic Python reading support. Uses only an in-memory SQLite database containing synthetic records. No database server, network endpoint, real account or personal data is involved. This is not a production authorization system.

## Outcomes
Explain how untrusted input can change the structure of a dynamically assembled query, reproduce two failures safely, use bound parameters and test normal and edge cases.

## Preparation and boundaries
Use only the provided query_lab.py and test_query_lab.py copies in a fresh disposable directory on your own student guest. Read them first. The fixture creates three synthetic rows in SQLite memory and opens no sockets. It does not read files or access application data. Never point this exercise at a real database or import the fixture into academy runtime code.

Python 3 with the standard sqlite3 module is required. No pip install, database server, sudo or network is needed. If a dependency is missing, follow the separately reviewed provisioning process; do not connect the isolated guest to the internet as a shortcut.

## Review the query path
The `make_database` helper creates an in-memory table and inserts fixed fictional rows. The insert already uses placeholders; the intentionally unsafe part is `find_notes`. Trace how its owner argument is placed inside a quoted SQL string before SQLite parses it. The same argument can therefore be treated as SQL syntax instead of only as a value.

The inputs are fixed teaching examples, not a challenge to invent payloads against a target. Predict the behavior of the provided tests before running them. Do not add destructive statements, write queries, schema changes or external targets.

## Run the baseline
From the fixture directory run:
```sh
python3 -m unittest -v test_query_lab
result=$?
printf 'test status=%s\\n' \"$result\"\n```
The intended baseline includes a failure when a value contains an apostrophe and a failed expectation for the provided logic-like value. With string concatenation, that value changes the meaning of the WHERE expression and returns all synthetic rows. This behavior is confined to the temporary in-memory database. Record actual results; do not copy author output as if it were your run.

A syntax error on one test and a returned extra row on another are different observations. Neither implies data was accessed outside this disposable fixture.

## Repair using bound values
In find_notes, keep the SQL statement structure fixed and put one `?` placeholder where the owner value belongs. Pass the owner separately as a one-item Python tuple to execute. In a one-item tuple the comma is required. Do not interpolate the value with an f-string, format or concatenation. Keep the test expectations unchanged.

Rerun the tests. The apostrophe should be matched as literal data; the logic-like string should be looked up as that exact value and return no rows. Add a normal exact-value test and an unknown-value test if you have not already explained them.

Placeholders bind values, not table or column names. If an application must choose a SQL identifier dynamically, use a small fixed allow-list selected by trusted code; do not assume a value placeholder can safely substitute an identifier. This lesson does not require dynamic identifiers.

## Explain the limitation
Parameterized queries preserve the intended query structure for bound values and are a primary SQL-injection prevention measure. They do not grant appropriate database permissions, validate business authorization, secure every query, or make an unsafe dynamic identifier safe. The function still returns rows for any exact owner string that exists; a real application would need its own authorization policy before exposing records.

This local example has no login, session, HTTP request, persistent database or server. The test suite demonstrates a narrow query-construction property, not a real-world exploit or a complete security review.

## Deliverables and review
Submit the policy statement, a short explanation of the unsafe data/code boundary, actual baseline and repaired test results, a minimal diff, one additional safe edge case, and limitations. Use only the synthetic data. Do not report the fixture as a remotely exploitable service. Formal scoring and independent student calibration remain pending.

## Source basis
OWASP recommends prepared statements with variable binding so code and values are handled separately:
https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
Python's sqlite3 module documentation: https://docs.python.org/3/library/sqlite3.html

See OFFLINE-SQL-VALIDATION.md for the limited author execution record.
