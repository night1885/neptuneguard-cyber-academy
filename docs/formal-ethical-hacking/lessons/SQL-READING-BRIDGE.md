# SQL reading bridge — tables, filters and bound values

Draft supporting walkthrough before independent work in [EH-WEB-05](EH-WEB-05.md). It does not replace EH-WEB-04 or the [Python reading bridge](PYTHON-READING-BRIDGE.md). It is not another canonical catalogue entry or a new practical authorization.

## Scope and preparation
Use only the supplied [sql_reading.py](../fixtures/sql-reading/sql_reading.py) and [test_sql_reading.py](../fixtures/sql-reading/test_sql_reading.py) in a fresh disposable approved guest directory. Read both before execution. The example uses three fabricated notes in a connection-local SQLite in-memory database. It opens no socket, uses no application database and needs no external account, database server, pip or sudo. Do not replace the memory connection with a real database path or service.

Python 3 with sqlite3 is required. Missing dependencies or an unavailable reviewed transfer route are setup blockers, not permission to reconnect an isolated guest. Author execution used Python 3.12.8 and SQLite 3.46.1, not a validated platform matrix. The starter is correct; its six supplied tests should pass.

## 1. Read the table
A table organizes rows under named columns. Here notes has note_id, title and category. note_id is the primary key in this small schema; title and category are required text values. These declarations do not establish ownership, login identity or permission to retrieve a note.

The helper inserts these synthetic records:

| note_id | title | category |
|---|---|---|
| 2 | HTTP notes | foundation |
| 1 | Terminal notes | foundation |
| 3 | Journal | learner's notes |

The insertion sequence deliberately differs from the order requested by the query. Do not infer a general query-result order from how this table is displayed or populated.

## 2. Trace the SELECT
Read this fixed statement in titles_in_category:

```sql
SELECT title FROM notes WHERE category = ? ORDER BY note_id
```

SELECT title chooses the returned column. FROM notes names the table. WHERE keeps rows satisfying the category comparison. ORDER BY note_id explicitly requests ascending note-ID order here. A filter chooses rows; it is not an application authorization policy.

Predict the titles for foundation, learner's notes, an unknown category and an empty string. An empty result list is a legitimate no-match result, not automatically an error or proof of denial.

## 3. Follow the bound value
The question mark is a value placeholder used by this sqlite3 call. The category is supplied separately as `(category,)`, a one-item Python tuple. The comma matters. The database handles the supplied value as data rather than splicing it into this statement's SQL structure.

The apostrophe in learner's notes is ordinary data. Do not manually add SQL quoting to the parameter or change the statement into an f-string or concatenation. Placeholders bind values, not table names, column names or arbitrary pieces of syntax. This example needs no dynamic identifiers.

## 4. Read the Python result
execute returns a cursor. fetchall obtains its result rows. Because the statement selects one column, each result row contains one value; row[0] retrieves that value. The list comprehension builds a list of titles. It returns data to its caller rather than printing a report.

The tests create a new demo connection per method and register close as cleanup. No database file is created by the supplied memory connection. The small example is not a general database connection-management framework, migration system or production service.

## 5. Predict, run and explain
From the directory containing both files, run:

```sh
python3 -B -m unittest -v test_sql_reading
result=$?
printf 'test status=%s\n' "$result"
```

Record the actual six-method result and captured test status. These are POSIX-style shell instructions. The final printf normally succeeds even if tests fail; its status does not replace the reported test-command status. No Bash-only feature is required by this displayed sequence.

Compare the returned order with the insertion order. Explain why the quoted category works without modifying the query text. Distinguish a failed assertion, SQLite error, import error and absent Python executable instead of treating them as the same observation.

## 6. Independent practice
Add a test for a category containing a space that is not present in the table, and a test confirming that returned strings contain titles rather than whole three-column records. Predict both before running. Keep the original expectations unchanged. Use synthetic values only and do not add destructive statements, new tables, network targets or real records.

The author did not execute these additional learner-written tests in this creation batch. Use the [fixture notes](../fixtures/sql-reading/README.md) for the exact bounded execution record.

## Return to the repair lesson
Proceed back to [EH-WEB-05](EH-WEB-05.md) when you can explain the fixed SQL structure, bound value, one-item tuple, returned list and explicit ordering. Its query_lab.py starter is intentionally unsafe and its initial tests should not be expected to match this correct example's green result.

This bridge demonstrates query reading and selected value-binding examples only. It does not enforce business authorization, authenticate callers, specify all input validation, prove every query safe or establish database permissions. No real API was assessed or exploited. Use only the approved private evidence workflow for learner work; this document stores no answers or completion records.

Source basis: Python sqlite3 documentation, https://docs.python.org/3/library/sqlite3.html , and OWASP SQL Injection Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html .
