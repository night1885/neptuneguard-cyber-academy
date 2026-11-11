# EH-WEB-05 — Keep data separate from SQL code

Draft offline practical, not published. Requires EH-WEB-04 and basic Python reading support. Uses only an in-memory SQLite database containing synthetic records. No database server, network endpoint, real account or personal data is involved. This is not a production authorization system.

## Outcomes
Explain how untrusted input can change the structure of a dynamically assembled query, reproduce two failures safely, use bound parameters and test normal and edge cases.

## Preparation and boundaries
Use only the provided query_lab.py and test_query_lab.py copies in a fresh disposable directory on your own student guest. Read them first. The fixture creates three synthetic rows in SQLite memory and opens no sockets. It does not read files or access application data. Never point this exercise at a real database or import the fixture into academy runtime code.

Python 3 with the standard sqlite3 module is required. No pip install, database server, sudo or network is needed. If a dependency is missing, follow the separately reviewed provisioning process; do not connect the isolated guest to the internet as a shortcut.

## Optional SQL reading support
If tables, SELECT, WHERE, ordering or sqlite3 result rows are unfamiliar, complete the [SQL reading bridge](SQL-READING-BRIDGE.md) before independent repair work. It uses separate, correct starter files and six tests expected to pass. Return here afterward: query_lab.py is intentionally unsafe and its baseline includes expected failures. The bridge does not replace EH-WEB-04, alter this exercise's scope or add a new required deliverable.

## Review the query path
The `make_database` helper creates an in-memory table and inserts fixed fictional rows. The insert already uses placeholders; the intentionally unsafe part is `find_notes`. Trace how its owner argument is placed inside a quoted SQL string before SQLite parses it. The same argument can therefore be treated as SQL syntax instead of only as a value.

The inputs are fixed teaching examples, not a challenge to invent payloads against a target. Predict the behavior of the provided tests before running them. Do not add destructive statements, write queries, schema changes or external targets.

## Run the baseline
From the fixture directory run:
```sh
python3 -m unittest -v test_query_lab
result=$?
printf 'test status=%s\n' "$result"
```
The printed value is the captured unittest exit status. The final printf normally succeeds even when the tests fail; do not confuse the status of that final printing command with the reported test result.

The intended baseline includes a SQL error when a value contains an apostrophe and a failed expectation for the provided logic-like value. With string concatenation, that value changes the meaning of the WHERE expression and returns all synthetic rows. This behavior is confined to the temporary in-memory database. Record actual results; do not copy author output as if it were your run.

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

## Expanded teaching: keep the SQL grammar fixed while values change

This supplement uses only the existing in-memory SQLite fixture and supplied teaching inputs. It adds no payload, database target, schema experiment, network activity or write operation. The local repair remains in the originally permitted find_notes function; the repository starter and test expectations stay unchanged.

### Follow the actual data-to-code path

The fixture's make_database helper connects to SQLite memory, creates the tiny notes table and inserts fixed synthetic rows. Its insert already uses placeholders. Therefore one safe operation in a file does not establish that every other query in that file is safe.

The intentionally unsafe find_notes builds a SELECT by joining SQL text, the owner argument and more SQL text. SQLite receives that assembled text as the statement to parse. The boundary problem occurs before the returned rows are inspected: input intended as a value has been incorporated into the language's structure.

Do not generalize the lesson into a claim that all string operations are unsafe. The specific problem is using untrusted value text to construct executable SQL grammar. The repair changes how the database API receives code and values, not whether Python ever handles strings.

### Compare the supplied normal and edge cases

The normal exact-owner test asks for one known synthetic owner and expects that owner's row. The unknown and empty-owner tests expect no matches. These normal outcomes are important: a repair that returns an empty list for every input would appear safe against extra-row disclosure while breaking legitimate retrieval.

The apostrophe case uses the existing fictional owner O'Neil. That punctuation is part of a legitimate stored value. Rejecting every apostrophe is not an equivalent repair because it would remove the behavior the policy expects to preserve.

The supplied logic-like test is different. In the intentionally concatenated query it can alter the WHERE meaning instead of remaining only an owner value. In the repaired lookup it should be treated as exactly that input string, for which the fixture contains no matching owner. Do not invent additional inputs or try it against another database.

These are predicted outcomes grounded in the reviewed source and tests, not a transcript of your run. Preserve the actual baseline error or failed assertion when using the original local commands.

### Read the difference between an error and a wrong result

The quote test can produce a SQL syntax error in the starter, while the logic-like case can execute and return more rows than expected. A thrown error and an assertion about an incorrect row list are distinct observations. Neither is a login event, an external data disclosure or a remote exploit in this exercise.

Python's unittest reports non-assertion exceptions as errors and failed expectations as failures. Both can make the suite unsuccessful, but they tell different stories about how far execution progressed. Preserve the names and categories rather than flattening them into “the command failed.”

A failure before the intended query runs, such as a missing import, is a setup blocker rather than reproduction of either query-construction behavior. Explain which stage the evidence actually reaches before editing SQL logic.

### Explain parameter binding precisely

The intended repair keeps the statement structure fixed, places the unquoted value placeholder at the owner-value position and passes the value separately through the execute API. Do not place the placeholder inside SQL string quotes: then it is text in a literal rather than the value-binding position intended by the exercise.

The parameter container also matters. In Python a one-item tuple requires its trailing comma; parentheses around one value alone do not create that tuple. A bare string is not the intended one-value parameter tuple. If a binding-count error occurs, inspect the parameter argument instead of reverting to interpolation.

An f-string or concatenated value inserted before execute is still part of assembled SQL text. Using a database API does not automatically make that construction parameterized. The important distinction is whether the owner is supplied separately as a bound value.

### Preserve exact-value behavior

The repaired function should still return the known owner's expected row and no rows for the supplied unknown value. It should handle the apostrophe as data and keep the logic-like value from changing the statement's intended structure.

Do not manually strip punctuation or transform every unfamiliar owner into a known identity merely to make selected expectations pass. Such changes alter the lookup semantics instead of demonstrating the intended code/data separation. Keep the visible expectations and explain any additional permitted safe edge case in terms of exact matching.

No persistent storage, commits to a real database or network service is involved. Test setup creates the synthetic in-memory records, and the existing cleanup closes its connection. Do not change the connection target to a file or application database as a convenience.

### Understand the boundary placeholders do not cover

Value binding is not a general substitution system for SQL grammar. Table names, column names and sort directions are structural choices, not owner values. The original lesson explains fixed application-owned choices where such selection is needed; this fixture requires no dynamic identifiers.

A query can also be correctly parameterized yet expose data to the wrong caller if the application lacks authorization. This function accepts an owner argument without authenticating the requester. Exact matching of another existing synthetic owner would be a lookup behavior, not proof that a caller is permitted to receive that owner's records.

Keep the authorization question from EH-WEB-04 separate from query construction. Neither exercise turns its teaching function into production enforcement, and this supplement does not combine or deploy them into an application.

### Bounded human-led AI review

First explain the intended fixed-statement/separate-value repair yourself. If an approved assistant is available, provide only the tiny reviewed synthetic function and a fictional description of the tests. Ask it to identify which text is SQL structure, which argument is data and what the proposed change leaves unproven.

Reject any answer that suggests new payloads, external targets, changing expectations, dynamic schema experiments or production import. Review its explanation against the actual source and preserve your own reasoning. Manual review satisfies the same learning purpose; real query logs, credentials and database exports must not be supplied.

### Formative questions with explained answers

1. Why does the safe insert not establish a safe lookup? They are separate query-construction paths in the same fixture.
2. Why preserve the apostrophe owner's behavior? Punctuation can be legitimate data, and the test requires correct exact-value matching.
3. Why is returning no rows for everything inadequate? It breaks the permitted known-owner retrieval rather than fixing the query boundary.
4. Does binding the owner validate the caller's authority? No. Query structure and resource authorization are separate questions.
5. Does a binding-count error justify interpolation? No. Correct the separate parameter argument within the original repair scope.

Technical basis: OWASP SQL Injection Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html , and Python sqlite3 documentation, https://docs.python.org/3/library/sqlite3.html . No new fixture execution, database operation, learner-platform reproduction or assessor calibration is claimed for this supplement.
