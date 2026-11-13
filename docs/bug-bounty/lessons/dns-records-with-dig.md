# Read DNS records with deliberate query limits

## Outcome and prerequisites

Explain what A, AAAA, CNAME, NS, MX and TXT records show and how to ask for one record at a time. Complete the allowlist lesson. Querying public DNS is generally less intrusive than application traffic, but resolvers still receive your queries, and program rules may restrict enumeration. Do not request zone transfers or brute-force names.

## Offline reading exercise

```bash
python3 - <<'PY'
records = [
    ('app.example.invalid', 'A', '192.0.2.10'),
    ('docs.example.invalid', 'CNAME', 'pages.provider.example.invalid.'),
    ('example.invalid', 'MX', '10 mail.example.invalid.'),
]
for name, kind, value in records:
    note = 'name points to another name; the target is a separate asset' if kind == 'CNAME' else 'record data only'
    print(name, kind, value, '->', note)
PY
```

Expected: three lines, including the CNAME note. The addresses use reserved documentation ranges and names use the invalid TLD.

## Bounded dig usage

```bash
dig -v
dig app.example.invalid A +noall +answer +tries=1 +timeout=5
```

dig tries each resolver in /etc/resolv.conf unless told otherwise. +tries=1 and +timeout=5 bound attempts; BIND documents the defaults as 3 tries and a 5-second timeout. +noall +answer prints only answer lines. Use only in-scope names, one record type per question.

## Interpreting results

A CNAME shows where a name points. It does not prove the target is in scope, and an unclaimed target is a hypothesis requiring program-permitted evidence, not an invitation to register or claim a third-party resource. Read ownership and rules first.

## Exercise and answer

A name points to a provider hostname that returns an error. May you claim it? No. Document the observation and use the program's route unless it explicitly authorizes the action.

## Troubleshooting and cleanup

SERVFAIL, NXDOMAIN and empty answers mean different things; do not repeat queries quickly. Remove notes that include unrelated third-party hostnames.

## Sources and validation limit

BIND 9 documentation for dig options. Only the offline example runs here; dig was not run.
