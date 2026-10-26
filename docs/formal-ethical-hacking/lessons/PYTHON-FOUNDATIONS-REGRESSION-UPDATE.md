# Python foundations — expanded local regression record

Draft maintainer record at source snapshot 85783c1fd13d5243c8b068e929d794e169621180. This is not a student transcript, full-checkout run, GitHub CI result, supported-platform claim or release approval. All execution used Python 3.12.8 and temporary exact-file layouts with invented records.

## Source identities checked
- summarize_observations.py Git blob: 54c2be9fdd1cdeedbdff15f029baf9c4ef313137
- test_summary.py Git blob: 3aafe0983eede441b8e70c577372522d3a3c18d8
- observations.json Git blob: 6bcae094c0377bc7c10d66e63d844206d5ff0c43

The four original lesson texts were separately Git-blob verified before inserting teaching explanations. Existing inline link destinations and fenced learner commands were retained. That is document comparison, not full link-target or semantic validation.

## Executions measured
| Temporary source state | Named suite | Methods | Failure events | Exit |
|---|---|---|---|---|
| Correct unchanged starter | test_summary | 20 | 0 | 0 |
| Correct starter plus separate supplement | test_summary test_summary_additional | 32 | 0 | 0 |
| Permissive isinstance client-exit mutation | test_summary | 20 | 1 | 1 |
| Constant-2xx grouping mutation | test_summary | 20 | 5 | 1 |
| Correct starter restored | test_summary test_summary_additional | 32 | 0 | 0 |

The two mutant runs failed assertions, not imports or syntax. Failure events include subtests; this is not a complete mutation score. Multiple executions must not be added together as distinct coverage. Only the correct unchanged teaching program remains in the repository.

Three CLI invocations were also measured: valid fixture returned exit 0 with eight fictional records, the expected group counts and two nonzero embedded client exits; an extra argument returned exit 2 with empty stdout and No arguments accepted on stderr; an invalid invented ID returned exit 2 with empty stdout and the fixed rejection diagnostic without echoing that ID. Source and fixture were restored before the final expanded run.

## Reproduce selected correct runs
Use only reviewed files in a new disposable directory through the existing approved setup/material route. From the fixture directory:

```sh
python3 -B -m unittest -v test_summary
python3 -B -m unittest -v test_summary test_summary_additional
python3 -B summarize_observations.py
```

The first remains the original 20-method learner command. The 12-method supplement is separate visible maintainer/practice support, not a silently added learner requirement or pass threshold. No broad fixture discovery, package installation, network request or alternate input path is needed. Do not connect the helper to a scanner, bot, database or real evidence service.

The supplement includes selected valid/invalid boundaries, invalid UTF-8, missing fields/files, copying and ordering, and explicitly documents mutable copied dictionaries and default-decoder duplicate-key handling. Those limitation checks are not hardening fixes. No hostile-input resource/security audit, real observation, supported guest/launcher/transfer reproduction, independent assessment calibration, runtime integration or professional/certification readiness was established. The canonical catalogue, existing practical permissions, reader manifests and deployment configuration are unchanged.
