# Password-verifier foundations — selected author checks

Draft execution record following source commit e7e429bc44545f4a4df21da6c967e417fc9468d7. Local Python 3.12.8, fresh temporary directories, invented values only. Not a student transcript, supported-build matrix, cryptographic audit, full repository suite or CI result.

| Local version | Test methods | Assertion failure events | Test errors | Exit |
|---|---|---|---|---|
| Correct starter | 17 | 0 | 0 | 0 |
| Temporary always-true comparison | 17 | 4 | 0 | 1 |
| Temporary constant salt | 17 | 2 | 0 | 1 |

Each suite includes two subprocess CLI checks: the actual boolean-only demo report/status and extra-argument rejection/status 2 without the supplied invented argument in stderr. Other methods check record shape, correct/wrong candidates, separate mocked salt requests, malformed shape/scheme/cost before derivation, salt/digest formatting, input text limits/encoding, tampered digest, comparison call/byte types and missing-KDF error behaviour. The comparator assertion was tightened during authoring so a bypass gives a meaningful failure rather than a missing-call inspection exception. The mutations remain temporary author copies; only the correct source is committed.

The lab parameter is 600,000 PBKDF2-HMAC-SHA-256 iterations, 16-byte generated salts and 32-byte output. The fixed format accepts no other work factor. Source review distinguishes the educational API choice from current Argon2id-first production guidance and does not claim a FIPS-validated build or configuration.

Not established: production security, password-storage migration, rate/resource-abuse protection, complete malformed-input coverage, end-to-end timing, random-generator statistical properties, credential breach handling, real authentication, actual accounts, sessions, network behaviour, student guest/provisioning/transfer, accessibility execution, formal assessment calibration, full checkout tests or GitHub CI. The synthetic label is not provenance.

No real secret was used, verifier persisted or account tested. The helper invokes no external process or network; test orchestration launches local Python only. The catalogue remains 37 entries/65 edges, with unchanged canonical prerequisites, runtime/publication state, Community Learning and learner records. This is one K13 foundation, not completion of that pathway.
