# Python bridge — independent exercises and mutation validation

Maintainer-only regression check for the existing correct Python-reading starter. This is not a protected examination or instructor marking key; the supplemental cases are visible practice checks. It changes no learning policy, fixture file, catalogue entry, enrolment, award, runtime or publication flag.

## Run the named module
From docs/formal-ethical-hacking/authoring in a trusted checkout, run:

```sh
python3 -B -m unittest -v test_python_bridge_regression
```

The script reads only the two selected fixture sources, copies them into a separate temporary directory for each maintainer test and invokes the named test_reading_model module there. It executes trusted teaching code, not a sandbox for unreviewed input. Child runs have ten-second timeouts. No broad fixture discovery or academy-runtime import is used. The combined check_authoring runner's allowlist is unchanged; this new module is standalone.

## What was executed
The retrieved fixture contents were reconstructed locally and matched their Git blob hashes before execution:

- reading_model.py: 254a700f23e61c7fac28e34bec1ad2642d07f917
- test_reading_model.py: 59bc76532e1115c2f192f4eacf1165fd68d897c3

Under Python 3.12.8, all three maintainer test methods passed. They performed four child unittest runs:

| Check | Child methods run | Observed result |
|---|---|---|
| Original correct starter | 8 | All passed; child status 0 |
| Original plus two added cases | 10 | All passed; child status 0 |
| Temporary comparison mutation | 8 | Exactly four assertion failures; child status 1 |
| Original restored after mutation | 8 | All passed; child status 0 |

The mutation changed the single `if status == 0:` occurrence to `if status != 0:` in the temporary model only. The four expected failing methods were test_zero_status, test_nonzero_status, test_summary_success and test_summary_nonzero. The check requires that exact failure set and the four-failure summary, not just any nonzero result. A missing import or syntax error would not satisfy that expectation.

The added cases cover nonzero status without a reviewed tag and zero status with a different tag. Both assert the review flag and summary. These cases illustrate the existing lesson's public independent exercises; they are not exhaustive validation. No repaired security fixture or real learner decision is involved.

The source is restored in a finally block in the temporary directory and rerun. Original repository fixtures are never written by this script. Each child interpreter starts with bytecode writing disabled so a cached temporary mutation is not intentionally reused. Temporary copies are cleaned up by the test framework.

## Scope and historical records
This was a selected-file local reconstruction, not a complete Git checkout or GitHub CI execution. It did not validate student hardware, offline transfer, Python versions other than 3.12.8, the complete combined authoring command or learner comprehension. The original fixture README's statement that independent exercises were not executed describes its earlier creation batch; this document records the later bounded validation. A separate local JSON execution report was generated, not silently committed as CI evidence.

Passing this regression check supports the specific supplied exercise expectations. It does not prove general program correctness, trustworthy status inputs, evidence authenticity or security of any API. No live requests, personal records, sockets or external services are part of this check.
