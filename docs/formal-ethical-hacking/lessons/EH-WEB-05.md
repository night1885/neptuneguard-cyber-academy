# EH-WEB-05 — Keep data separate from SQL code

Draft offline practical, not published. Requires EH-WEB-04 and basic Python reading support. Uses only an in-memory SQLite database containing synthetic records. No database server, network endpoint, real account or personal data is involved. This is not a production authorization system. Community Learning is unchanged.

## Outcomes
Explain how untrusted input can change the structure of a dynamically assembled query, reproduce two failures safely, use bound parameters and test normal and edge cases.

## Task and finish line
Read the two supplied files, predict the existing tests, reproduce the unsafe query's distinct error and wrong-result behaviours, make the narrow bound-value repair and rerun the unchanged expectations. Explain the normal/unknown controls and add the existing required additional safe edge case. Finish with genuine before/after results, a minimal diff and limitations—not a claim about a remote database or complete application security.

## Preparation and boundaries
Use only the provided query_lab.py and test_query_lab.py copies in a fresh disposable directory on your own student guest. Read them first. The fixture creates three synthetic rows in SQLite memory and opens no sockets. It does not open learner data files or access application data. Never point this exercise at a real database or import the fixture into academy runtime code.

The reviewed repository source package is fixtures/sql-parameterization relative to the formal course directory. Obtain only the two named files through the approved offline material-transfer procedure and keep them together with their original filenames. This is not an instruction to execute a repository-wide installer or connect a database service. Exact supported-platform transfer/editor instructions remain release work.

Python 3 with the standard sqlite3 module is required. The selected Python installation must include that module and its SQLite support; its presence in standard-library documentation is not proof that every distributor's build supplies it. No pip install, database server, sudo or network is needed. If a dependency is missing, follow the separately reviewed provisioning process; do not connect the isolated guest to the internet as a shortcut.

Confirm the ordinary learner-guest session, intended directory and reviewed files before execution. A host/root/guest uncertainty, missing module or unexpected file is a setup blocker, not a successful reproduction of the deliberately unsafe query. The earlier HTTP allowance and available service connectors grant no database permission here.

## Optional SQL reading support
If tables, SELECT, WHERE, ordering or sqlite3 result rows are unfamiliar, complete the [SQL reading bridge](SQL-READING-BRIDGE.md) before independent repair work. It uses separate, correct starter files and six tests expected to pass. Return here afterward: query_lab.py is intentionally unsafe and its baseline includes expected failures. The bridge does not replace EH-WEB-04, alter this exercise's scope or add a new required deliverable.

## Review the query path
The make_database helper creates an in-memory table and inserts fixed fictional rows. The insert already uses placeholders; the intentionally unsafe part is find_notes. Trace how its owner argument is placed inside a quoted SQL string before SQLite parses it. The same argument can therefore be treated as SQL syntax instead of only as a value.

| Existing component | What to trace | Interpretation limit |
|---|---|---|
| sqlite3.connect(":memory:") | The fixture's local in-memory connection | Not a connection to a student file, academy database or network server |
| make_database | Fixed notes table, owner/title columns and three invented rows | Setup data, not records obtained from real users |
| Parameterized insertion | Fixed INSERT structure with separately supplied values | Safe insertion does not make another concatenated query safe |
| find_notes owner argument | The supplied value entering the SELECT construction | A filtering value is not authenticated requester identity |
| WHERE expression and ordering | Which rows the assembled statement selects and how results are ordered | Extra rows here remain synthetic local observations, not remote disclosure evidence |
| execute and fetchall | Statement execution followed by a list of result-row tuples | A returned row is not proof that the caller was authorised to receive it |

State the intended invariant before changing code: the owner input is an exact data value, while the statement's SELECT, WHERE and ordering structure remain application-owned. A legitimate apostrophe must not be removed merely because it interacts with the unsafe concatenation. This exercise preserves the data/code boundary; it does not define a policy for who may access a matching owner's rows.

The inputs are fixed teaching examples, not a challenge to invent payloads against a target. Predict the behaviour of the provided tests before running them. Do not add destructive statements, write queries, schema changes, extension loading or external targets. The fixture's reviewed CREATE/INSERT setup is not permission to add arbitrary database operations.

## Read the actual test observer
The supplied QueryTests class has five test methods, unlike EH-WEB-04's one-method/twelve-subtest arrangement. Its setUp creates a fresh synthetic in-memory connection for each test, and addCleanup registers closure of that connection. Do not treat results from separate test methods as one persistent database session.

| Supplied method | Boundary to explain before execution |
|---|---|
| test_exact_owner | Normal exact-value lookup still returns the intended synthetic row |
| test_unknown_owner | An unknown exact value returns no row |
| test_empty_owner | An empty value remains an exact lookup rather than a broad selection |
| test_quote_is_data | A legitimate apostrophe-bearing value remains data |
| test_expression_is_data | The provided logic-like string is treated as a complete value, not added SQL structure |

Read each expected result in the original file. Do not change expectations, weaken comparisons or skip a failing method to make the starter green. A runner/import failure is not the same as reaching one of these comparisons.

## Run the baseline
From the fixture directory run:
```sh
python3 -m unittest -v test_query_lab
result=$?
printf 'test status=%s\n' "$result"
```
The printed value is the captured unittest exit status. The final printf normally succeeds even when the tests fail; do not confuse the status of that final printing command with the reported test result. Keep result=$? immediately after the runner, with no intervening command or pipeline that replaces the status you intend to preserve.

The intended baseline includes a SQL error when a value contains an apostrophe and a failed expectation for the provided logic-like value. With string concatenation, that value changes the meaning of the WHERE expression and returns all synthetic rows. This behaviour is confined to the temporary in-memory database. Record actual results; do not copy author output as if it were your run.

| Observed result category | What to distinguish |
|---|---|
| Python/sqlite3 or local test import unavailable | Setup did not reach the intended query/test behaviour; use the approved provisioning/material route |
| SQL execution error in the supplied apostrophe case | Query parsing/execution failed before a normal result comparison could succeed |
| Assertion failure in the supplied logic-like case | A result was returned but did not match the expected data-only behaviour |
| Completed passing exact/unknown/empty controls | Useful observations about those particular inputs, not proof that all query paths are safe |
| Unexpected syntax/runtime failure | A discrepancy to preserve and investigate, not automatically the known fixture defect |

A syntax error on one test and returned extra rows on another are different observations. Neither implies data was accessed outside this disposable fixture. An ERROR and a FAIL in unittest output have different immediate meanings; a single nonzero process status does not replace reading the relevant diagnostic and comparison.

## Repair using bound values
In find_notes, keep the SQL statement structure fixed and put one ? placeholder where the owner value belongs. Pass the owner separately as a one-item Python tuple to execute. In a one-item tuple the comma is required. Do not interpolate the value with an f-string, format or concatenation. Keep the test expectations unchanged.

The placeholder is part of the SQL statement's value-binding syntax, not a quoted literal question-mark value. Parenthesizing a Python string without the comma is not the required one-item tuple. The SQL string and the separate parameters argument must actually reach execute as separate inputs; using a placeholder-looking string while continuing to interpolate the value does not establish parameter binding.

During the repair phase, edit only query_lab.py. Keep the reviewed make_database setup, row contents and ordering intact. Do not catch every exception and return an empty list, reject every owner, strip apostrophes or special-case test names/identities. Such shortcuts can hide the symptom or destroy legitimate matching data without expressing the intended boundary.

Rerun the same tests. The apostrophe should be matched as literal data; the logic-like string should be looked up as that exact value and return no rows. Retain and explain the normal exact-value and unknown-value controls already present in the supplied tests. Do not count a pre-existing case as your added independent edge case or duplicate it merely to inflate a test count.

Placeholders bind values, not table or column names. If an application must choose a SQL identifier dynamically, use a small fixed allow-list selected by trusted code; do not assume a value placeholder can safely substitute an identifier. This lesson does not require dynamic identifiers or a new query builder.

## Existing additional safe edge case and evidence
The existing deliverables require one additional safe edge case. Extend the local test_query_lab.py copy while preserving the original five methods and expectations. Use invented inert data within the same fixture, predict the exact result and explain the particular data-preservation/matching boundary the case distinguishes. No additional learner fixture file or payload collection is introduced.

Confirm that the runner actually executes your addition. Report the real method/subtest structure rather than infer a count from how many functions or examples you wrote. A method not discovered by unittest is not an observed regression result. Keep your own reasoning, any instructor assistance and actual output distinguishable.

Record the original and repaired results, relevant diagnostics, minimal repair diff and the additional-case observation. If an edit appears unused, verify the reviewed local filenames/module and invocation through the approved troubleshooting process; do not overwrite evidence, delete arbitrary files or redirect the exercise at another database.

## Explain the limitation
Parameterized queries preserve the intended query structure for bound values and are a primary SQL-injection prevention measure. They do not grant appropriate database permissions, validate business authorization, secure every query or make an unsafe dynamic identifier safe. The function still returns rows for any exact owner string that exists; a real application would need its own authorization policy before exposing records.

This local example has no login, session, HTTP request, persistent database or server. The test suite demonstrates a narrow query-construction property, not a real-world exploit or a complete security review. A value that finds a synthetic owner's row does not authenticate the requester as that owner. Keep this separate from EH-WEB-04's policy-decision model and the later HTML output-boundary work.

## Deliverables and review
Submit the existing policy statement, a short explanation of the unsafe data/code boundary, actual baseline and repaired test results, a minimal diff, one additional safe edge case and limitations. Here the policy statement describes the fixture's intended exact-value/data-separation behaviour; it is not an invented business-authorization policy or a production permission grant.

Use only the synthetic data. Do not report the fixture as a remotely exploitable service. A reviewer should check the input-to-query trace, error-versus-wrong-result explanation, genuine execution, unchanged original expectations, preservation of legitimate results and the reason for the added edge. Feedback should identify the specific unsupported inference or missing observation and request a bounded correction, not real database access or changed expected values.

Use the actual approved private submission route only when access, format, collection and retention rules exist. Do not include personal records, connection strings, database credentials or unrelated source files. The repository and Markdown lesson are not a learner evidence store. Formal scoring and independent student calibration remain pending; a local passing test does not grant progression, lab permission, a grade or an award.

## Source basis and selected author recheck
OWASP recommends prepared statements with variable binding so code and values are handled separately:
https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
Python's sqlite3 module documentation: https://docs.python.org/3/library/sqlite3.html

See OFFLINE-SQL-VALIDATION.md for the preserved earlier limited author execution record. It is not relabelled as this expansion's result. Public module documentation can describe versions newer than the selected interpreter; it is not a validated course compatibility matrix.

For this expansion, the supplied query/test files were verified against Git blobs 9dc82d79cddbd31870d512494bcd3a7d594cea13 and cc982f8f08e02a9c9aad228a97121efa2c7427cb at source checkpoint 70371694515e7ff6e7595725b258f4e617fb322f. Four selected author-only runs used separate private temporary directories with bytecode writing disabled, Python 3.12.8 and SQLite runtime 3.46.1:
- Exact starter: exit 1 across five test methods; test_quote_is_data produced an error and test_expression_is_data an assertion failure.
- Temporary bound-parameter reference: the unchanged five-method suite exited 0. The reference implementation is not published in the learner starter or this lesson.
- Temporary reference plus one author-only whitespace-literal edge: exit 0 across six methods. This is an example of the existing edge-case requirement, not a prescribed extra learner case or file.
- Author-only always-empty counterexample: exit 1; test_exact_owner and test_quote_is_data failed, demonstrating why preserving legitimate results matters. The counterexample is not installed in the repository or added to learner tasks.

Original test expectations remained unchanged in all four runs. The separate downloadable execution record contains selected command/result metadata, output and limits; it is not automatically a repository artifact or CI result. No repaired fixture, counterexample or author-edge module is committed by this lesson update.

The author sandbox ran with effective UID zero and was not the prescribed ordinary-account student guest. These checks did not validate the learner transfer/editor workflow, exact Bash status-capture sequence, supported guest/SQLite matrix, optional SQL-reading bridge, real authorization, independent learner performance, full repository suite or assessor calibration. No external database or service connector, network endpoint, real account or persistent database was used.

This changes only EH-WEB-05 teaching. The starter/test files, original five expectations, prerequisite graph, additional-edge deliverable, canonical catalogue, reading profiles, runtime integration and publication flags remain unchanged. No new query target, database service, permission, Discord handler, database migration, course activation or deployment is introduced.
