# Offline SQLite parameterization — local validation record

Draft batch: EH-WEB-05, an intentionally unsafe offline fixture and visible regression tests. No hosted lab, real database, network service, production integration, course runtime or Community Learning change is included.

## Local author checks
Executed in a temporary directory in the authoring sandbox using Python 3.12.8 and SQLite 3.46.1. The fixture created only an in-memory database with three synthetic rows.

The starter test run exited 1. Three tests passed; `test_expression_is_data` failed because the supplied logic-like string caused all three synthetic rows to be returned, and `test_quote_is_data` errored with a SQLite syntax error for the apostrophe-containing value. These are two separate observed outcomes.

A temporary reference repair kept the SELECT structure fixed and bound the owner value using a placeholder. After clearing the module-cache path through a fresh temporary execution, all five visible tests passed. The repair is not included in the learner starter. No author result is learner evidence.

## Limits
This proves only the bounded behavior of the local Python/SQLite fixture and test inputs. It does not test a real web request, database server, persistence, authentication, authorization, SQL dialect differences, student guest compatibility, accessibility or CI. It is not a comprehensive security test suite or course release approval.

A downloadable JSON authoring record was generated separately; it is not a committed learner submission or CI artifact.

## Before release
Reproduce on supported student guests; check exact Python/sqlite availability; test the novice instructions and editor pathway; review fixture isolation and safe transfer; add instructor explanations; check accessibility and private evidence handling; calibrate grading; and register progression through a separately reviewed metadata change. Keep fixtures separate from academy runtime.

## Source basis
https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
https://docs.python.org/3/library/sqlite3.html
