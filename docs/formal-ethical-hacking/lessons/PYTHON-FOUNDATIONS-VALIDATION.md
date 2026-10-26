# Offline scripting foundations — selected author execution

Draft record after source commit a4c4da382cd3c0225561e0e60da4ff81f0e8a81e, not a student transcript, full repository suite, CI result or release approval. Local execution used Python 3.12.8 in fresh temporary directories with the reviewed source/tests and invented JSON.

## Unit runs actually performed
| Local source version | Test methods | Failure events | Test errors | Exit |
|---|---|---|---|---|
| Correct starter | 20 | 0 | 0 | 0 |
| Temporary permissive client-exit type check | 20 | 1 | 0 | 1 |
| Temporary constant-2xx grouping | 20 | 5 | 0 | 1 |

Failure events include individual subtests, not necessarily independent methods. The two regressions existed only in author temporary copies; the repository receives the correct starter only. This is selected counterexample coverage, not a complete mutation score or exhaustive security verification.

## CLI runs actually performed
The reviewed fixture returned status zero and a parsed summary of eight records, groups 1/3/1/1/1/1 for 1xx/2xx/3xx/4xx/5xx/not-recorded, and two nonzero embedded client exits; stderr was empty. An invalid invented ID returned status 2, empty stdout and the fixed diagnostic without echoing the invented field. An extra argument returned status 2, empty stdout and No arguments accepted. Three CLI invocations plus three unit-suite invocations were executed. No record represents an actual request.

## Limits
The byte/record bounds and selected schema checks are not a hardened general JSON/log importer. The default decoder does not reject duplicate textual keys. No hostile-input resource/security audit, real observation, network operation, browser, scanner, external process invoked by the teaching program, actual credentials, supported student guest/transfer route, full checkout checks, GitHub CI, formal assessment calibration or runtime integration was validated. Test orchestration invoked local Python only to run the selected suites/CLI.

The three lesson labels PY-F1/PY-F2/PY-F3 are supporting identifiers, not canonical entries. The catalogue remains 37 lessons/capstones and 65 edges; existing prerequisites and the candidate-map snapshot remain unchanged. No command scope, course assignment, private evidence service, grade, award, publication setting, database, Discord handler, deployment or Community Learning behaviour changes.
