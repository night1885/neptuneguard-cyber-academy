# Password/verifier foundations — instructor guide

Draft visible teaching aid, not a protected exam key or a production deployment guide. Start with [representations](PASSWORD-REPRESENTATIONS.md) and [the lab](PASSWORD-VERIFIER-LAB.md). Keep all inputs invented.

## Questions and bounded answer guidance
1. Base64 is reversible without a secret; the roundtrip demonstrates representation, not confidentiality.
2. Repeated unsalted hashes show identical-byte behaviour under that algorithm, not the actual plaintext or permission to guess it elsewhere.
3. A salt is stored per record and is not a secret key/pepper. It changes reuse/equality properties but does not make passwords unguessable.
4. Verification uses the record's existing salt and parameters; it does not create a new registration record on every comparison.
5. compare_digest is an appropriate comparison primitive here, not proof of constant timing for the complete program or service.
6. Choosing PBKDF2 for a standard-library exercise does not override OWASP's Argon2id preference or establish FIPS compliance.
7. An accepted comparison is not authentication/session/authorisation enforcement. Missing-KDF operation failure must not be reported as a verified password result.

## Read the tests accurately
There are 15 verifier methods plus two CLI methods. Deterministic mocked salts check that two salt requests are made and their supplied bytes affect the records; this does not test the OS random generator's statistical quality. The CLI's fresh-salt differences are selected observations, not a guarantee against all collisions. There is no timing benchmark or cryptographic audit.

The byte-comparison test explicitly asserts that the comparator was called before inspecting its arguments. This produces a clear assertion failure if a temporary implementation bypasses comparison rather than an incidental missing-call inspection error. Tests of selected malformed parameters confirm no KDF invocation for those cases, not general hostile-input hardening.

## Student review worksheet
| Stage | Student prediction | Actual observation / blocker | Instructor intervention | Limit |
|---|---|---|---|---|
| Encoding / repeated digest | | | | |
| Salt and record generation | | | | |
| Candidate / record verification | | | | |
| Malformed record / unavailable KDF | | | | |
| Named tests / CLI | | | | |

Record exact material revision and genuine status. Do not post real passwords, verifier material, personal records or raw student evidence in public. No pass threshold, automatic progress, restricted-lab access or award is defined. This package does not teach or authorise real account testing, password cracking, directory/hash collection or credential reuse. K13 and broader role/certification readiness remain incomplete.
