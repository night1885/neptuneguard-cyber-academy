# Offline verifier mechanics — run, inspect and test

Draft K13/K06 support after [representations](PASSWORD-REPRESENTATIONS.md). This is one foundational practical, not complete password/credential testing or certification preparation. The starter is correct, unlike deliberately broken repair fixtures.

## Setup and boundaries
Use the two reviewed Python files in [the fixture package](../fixtures/password-verifier/README.md), a fresh disposable approved guest directory, an already provisioned Python build with pbkdf2_hmac and the approved material/support/private-evidence route. Author checks used Python 3.12.8 only. If a tool, KDF or supported launcher is unavailable, record BLOCKED. Do not install packages, elevate, reconnect, reduce iterations or substitute a downloaded verifier. Commands below assume the approved POSIX-style python3 launcher; Windows needs its own reviewed route.

Use only the built-in invented values. No passwords on command lines, environment variables, prompts or replacement inputs; no real hashes, accounts or stored records. The helper performs cryptographic computations in memory, prints boolean observations and creates no credential store or login session. Test orchestration launches only the local teaching Python process and uses its own temporary directories.

## Read the flow
password_bytes chooses an exact UTF-8 teaching contract: 1–128 characters, at most 512 encoded bytes, invalid surrogate input rejected. These are exercise bounds, not a complete recommended password/Unicode policy; no normalisation or UI is implemented. make_record requests a 16-byte salt and computes a 32-byte PBKDF2-HMAC-SHA-256 result with fixed 600,000 iterations. The record has exactly scheme, iterations, salt_hex and digest_hex.

parse_record accepts only this scheme/cost and canonical lowercase hex lengths. These formatting choices are teaching constraints, not a universal verifier standard. Malformed shape/cost is rejected before expensive derivation. verify rejects malformed input, derives against the stored salt and uses compare_digest on equal-length byte strings. That comparison API reduces content-dependent short-circuit behaviour; it does not prove end-to-end constant timing or protection against account enumeration, throttling failures or denial of service.

A missing KDF is an operational error, not an invented password mismatch. No identity, authorisation, session, reset, breach response, persistence, migration, rate limiting or production logging is implemented. Never import this model into academy runtime.

## Predict and run
Read both files first. In the disposable fixture directory:

```sh
python3 -B verifier_lab.py
result=$?
printf 'demo status=%s\n' "$result"
python3 -B -m unittest -v test_verifier
result=$?
printf 'test status=%s\n' "$result"
```

Capture status immediately; the final printf has its own status and is not a CI failure gate. -B is not a sandbox. Expected correct demo: synthetic plus seven observation flags are true, with no password or verifier bytes printed. Random-salt observations are a demonstration, not an entropy proof. Correct tests should report 17 methods with no failures/errors; several use multiple assertions/subtests. Record actual results or the blocker, not expected output copied as evidence.

## Inspect a selected boundary

```sh
python3 -B -m unittest -v test_verifier.VerifierTests.test_parameter_bounds_before_derivation
```

Explain why the test checks that the KDF was not called for the selected invalid iteration values. A rejected boolean also fails this fixture's numeric value requirement; do not claim its rejection alone proves which guard mattered. The visible CLI tests check both the actual report and extra-argument rejection without echoing the invented argument.

## Independent work
Add one legitimate case and one invalid-record case using only invented values and test-owned objects. Predict which stage accepts/rejects them. Do not weaken original expectations. Explain why a salt need not be a secret but a real verifier still needs protection; why a successful verify Boolean is not a login session; and which production controls are absent. Use the [instructor guide](PASSWORD-VERIFIER-INSTRUCTOR.md) and [validation record](PASSWORD-VERIFIER-VALIDATION.md) to compare reasoning, not replace your own run.

Sources: https://docs.python.org/3/library/hashlib.html and https://docs.python.org/3/library/hmac.html .
