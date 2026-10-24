# SQL-reading fixture — correct starter

Draft supporting material for the [SQL reading bridge](../../lessons/SQL-READING-BRIDGE.md). Keep sql_reading.py and test_sql_reading.py together in a fresh disposable approved directory and run `python3 -B -m unittest -v test_sql_reading` there. No package installation, server, account, network endpoint or real records are part of this example.

## Execution record
The exact supplied Python contents ran locally in a temporary directory under Python 3.12.8 with SQLite 3.46.1. Six unittest methods passed and the test subprocess returned zero. The checks cover explicit note-ID ordering, a category containing an apostrophe, unknown and empty values, stable repeated reads, and preservation of the three synthetic rows across a SELECT.

This is a correct starter, unlike the intentionally unsafe query_lab.py in the separate sql-parameterization exercise. All six supplied tests are expected to pass without a repair. Additional learner-written exercises in the bridge were not executed during this batch. The check did not validate every possible input, result-order scenario, platform, resource failure or security property.

## Boundaries
The factory creates only a connection-local :memory: database containing fabricated rows. The selector binds a value into fixed SQL and returns titles; it performs no authentication, application authorization or complete input-schema validation. The caller owns and closes the returned connection. Do not change it to open personal/application databases, expose it through HTTP or import it into academy runtime.

No full repository checkout, GitHub CI, supported guest/hardware route, offline transfer process or learner pilot was executed for this batch. The combined maintainer runner's allowlist is unchanged and does not run this teaching fixture. Avoid broad fixture discovery; run the explicit named module only.

The bridge is linked from [EH-WEB-05](../../lessons/EH-WEB-05.md). It is supplementary, not a 37th canonical catalogue entry. Existing repair fixture code, catalogue, manifest, runtime integration and publication remain unchanged. No learner evidence or completion records are collected by these files.
