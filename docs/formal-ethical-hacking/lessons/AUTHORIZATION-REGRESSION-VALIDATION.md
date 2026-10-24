# Authorization regression workshop — bounded author checks

Draft author record, not a student transcript, CI result or release approval. Existing policy.py and test_policy.py were read at source commit 13121cd115e883d3c15264051bca80efd51fca1d. They are deliberately preserved by this batch.

## Executed locally
Python 3.12.8 ran explicitly named unittest modules in fresh temporary directories. Each run used copies of the reviewed fictional source and the new supplement; -B disabled bytecode writes. No real identities, requests, accounts, server, database or course state were involved.

The published base contains one method/12 decision examples. The supplement contains six methods/eight decision examples. Combined: seven methods/20 examples. Failure events below include individual failing subtests; they are not counts of independent test methods. There were no import/syntax test errors in these author runs.

| Local variant | Base failure events / exit | Combined failure events / exit |
|---|---|---|
| Unchanged defective starter | 2 / 1 | 4 / 1 |
| Narrow ownership repair, author temporary copy only | 0 / 0 | 0 / 0 |
| Always-deny counterexample | 3 / 1 | 6 / 1 |
| Always-allow counterexample | 9 / 1 | 14 / 1 |
| Repaired ownership plus instructor action restriction removed | 0 / 0 | 1 / 1 |

Ten local runner invocations were performed: base and combined suites for each of five versions. The selected instructor-action regression passes the original examples but fails the added instructor-edit check. The counterexamples demonstrate selected coverage properties, not a complete mutation score, exhaustive policy verification or actual exploitation.

The temporary narrow repair added ownership equality to the student branch while retaining course, action, state and instructor restrictions. Always-deny/allow versions changed only the local decision function. The instructor regression widened the repaired instructor branch to assigned-course access without its read-only action restriction. None of those temporary implementations is included as a repository policy change or deployed.

The exact new 1499-byte UTF-8 test supplement checked during authoring had SHA-256 f9cc0bf24c4477db4a4407e1c0929334f8a7cba71a993e58d60b601d15a4d88d. The workshop and EH-WEB-04 link are prose guidance, not claims of browser/application execution.

## Not established
No supported student guest/media-transfer route, live HTTP enforcement, authentication/token validation, arbitrary-input validation, database isolation, full repository suite, GitHub CI, grading calibration or production authorization was tested. No canonical lesson count, prerequisite, request budget, runtime/publication switch, award, access grant or Community Learning behavior changes. The deliberately defective starter remains defective for the reproduction exercise.
