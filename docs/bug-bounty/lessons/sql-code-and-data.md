# Keep SQL values separate from statement structure

## Goal and prerequisites

Understand why concatenation changes SQL grammar and why parameter binding preserves values. Run this exercise with Python 3 and its standard-library sqlite3 module on your own workstation. The database exists only in memory; no application credentials or external database are needed.

A legitimate name with an apostrophe is enough to demonstrate the boundary. A syntax error is not proof of a remotely exploitable vulnerability. Binding values also does not enforce ownership: a parameterized query can still disclose the wrong account's records if its policy predicates are missing.

## Execute the controlled example

```bash
python3 - <<'PY'
import sqlite3
with sqlite3.connect(':memory:') as db:
    db.execute('CREATE TABLE notes(owner TEXT, title TEXT)')
    db.executemany('INSERT INTO notes VALUES (?, ?)', [
        ('A', 'Synthetic A'), ("O'Neil", 'Synthetic quoted owner')
    ])
    owner = "O'Neil"
    unsafe = "SELECT title FROM notes WHERE owner = '" + owner + "'"
    try:
        db.execute(unsafe).fetchall()
        print('unsafe parse failed:', False)
    except sqlite3.Error:
        print('unsafe parse failed:', True)
    rows = db.execute('SELECT title FROM notes WHERE owner = ?', (owner,)).fetchall()
    print('bound rows:', rows)
    assert rows == [('Synthetic quoted owner',)]
PY
```

Expected: unsafe parse failed True, then exactly the quoted owner's synthetic row. The comma in (owner,) makes a one-element tuple for binding. Placeholders represent values, not arbitrary table/column names or sort directions. Dynamic identifiers need an explicitly constrained design.

## Program-based application

First map an allowed input and its documented normal use. Observe normal punctuation in your own harmless synthetic data only if the program permits that action. Do not treat an error page as permission to extract data, enumerate schema, invoke time delays or run a scanner. A live injection test needs separate program permission, a narrow plan and minimum evidence; this local example does not grant them.

Use Burp's ordinary captured request to identify the parameter and context without blindly changing every field. Record whether a response is transport success, HTTP error, application validation or an unexpected failure. Stop on 5xx or unrelated sensitive output rather than escalating to prove impact.

## Exercise and explained answer

Why not replace every apostrophe manually? Escaping rules depend on context/driver and are easy to misapply. Use the database API's binding mechanism for values.

Would parameterization prevent A from reading B's object if the query lacks an ownership condition? No. Code/data separation and authorization are different controls and need different evidence.

Add one ordinary row to a scratch version and predict that the bound query still selects only the intended owner. Keep :memory:; do not substitute a real database path.

## Troubleshooting and cleanup

If table creation fails, the intended query was not tested. Do not classify setup errors as the expected unsafe-query result. The context closes the in-memory database; no external data was modified and no database file needs deletion.

## Reference and evidence limit

https://portswigger.net/web-security/all-materials

The local example demonstrates SQL grammar and binding, not a verified live-program finding or a universal production remediation.
