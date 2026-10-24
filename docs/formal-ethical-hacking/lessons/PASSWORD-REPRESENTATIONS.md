# Password representations — what the bytes mean

Draft K13 support, not a canonical lesson or a complete credential-assessment pathway. Study after the HTTP/session concepts and [offline Python foundations](PYTHON-FOUNDATIONS-01.md). No real account, login attempt, password guessing, hash export, reset operation or credential reuse is authorised. Continue with [the verifier lab](PASSWORD-VERIFIER-LAB.md).

## Distinguish purposes
Encoding changes representation. Base64 can be decoded without a secret and is not encryption. Encryption protects information under a key and defined assumptions; reversible storage is not the usual password-verifier goal. Hashes support digest-based comparisons but a fast general-purpose digest is not automatically a suitable password-storage scheme. SHA-256 remains useful for its appropriate purposes, including byte consistency; the problem is confusing purposes, not declaring the algorithm universally bad.

Repeated unsalted hashing of identical bytes gives the same digest. That enables equality comparison under the scheme; it does not itself prove a particular plaintext. A salt is additional per-record input. It is normally stored with the verifier, not treated as a secret encryption key or a pepper. Distinct salts reduce useful reuse/precomputation and prevent a simple same-password/same-digest comparison under the same parameters. They do not make a weak password strong or prevent all offline guessing. Real verifier material remains sensitive.

A password KDF adds deliberate verification cost. Verification recomputes using the candidate's bytes and the stored record's salt/parameters; generating a new random salt for that comparison would answer a different question. Parameter handling is part of the design: accepting arbitrary low costs weakens a record, while blindly computing an attacker-selected extreme cost can exhaust resources. The lab uses one fixed, bounded educational record format, not a migration-ready general verifier.

## Algorithm choice is contextual
OWASP's reviewed guidance prefers Argon2id for new password storage and includes PBKDF2-HMAC-SHA-256 with 600,000 or more iterations for its FIPS-related guidance. The lab uses the standard-library PBKDF2 API and 600,000 iterations to avoid introducing an installation dependency and to teach mechanics. That does not make this code, its Python/OpenSSL build or a deployed system FIPS validated, nor does it recommend this custom format for production. Production choices require maintained libraries/frameworks, current guidance, hardware benchmarking, lifecycle/migration and operational review.

## Worked scenario — fictional
Two invented records use the same invented password. Their unsalted SHA-256 results repeat. The lab asks for new salts for the two KDF records and observes their different values. A correct candidate is verified against the first record; a different invented candidate is rejected. No password is recovered or tested against a service. A sample difference is an observation, not a statistical audit of entropy or a mathematical guarantee that random salts never collide.

## Explain before running
Why is Base64 not secret storage? Why is a salt not a secret key? Why must verification reuse the stored salt? Why is digest equality only one part of authentication? Why is file hashing a different task? Give a bounded answer and a limitation for each. Use only invented values, never paste a real verifier into the course or a third-party service.

Sources: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html and https://docs.python.org/3/library/hashlib.html .
