# Offline password-verifier teaching fixture

Correct starter: all 17 named test methods should pass unchanged. Read [representations](../../lessons/PASSWORD-REPRESENTATIONS.md), [the lab](../../lessons/PASSWORD-VERIFIER-LAB.md), [instructor guidance](../../lessons/PASSWORD-VERIFIER-INSTRUCTOR.md) and [validation](../../lessons/PASSWORD-VERIFIER-VALIDATION.md).

Transfer verifier_lab.py and test_verifier.py together through the approved material route into a fresh disposable exercise directory. Python 3 with an available hashlib.pbkdf2_hmac must already be provisioned. The author used Python 3.12.8; this is not a supported-platform matrix. Do not install dependencies, reduce the work factor or reconnect a guest to conceal a setup blocker.

Only built-in invented values are allowed. No real passwords, hashes, account exports or verifier records. The CLI accepts no arguments or password prompt; do not place secrets in command lines, environment variables or replacement code. It prints boolean observations only and persists no verifier. This is a custom teaching format, not a production password library, authentication service, FIPS validation or evidence collector.
