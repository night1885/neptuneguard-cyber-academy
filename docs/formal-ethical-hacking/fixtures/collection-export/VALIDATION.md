# Collection-export transfer variant — bounded author execution

New draft supporting exercise prepared against planning baseline 3c101db5482612d81b0bbd02b0ebc0e77a9d2cb6. Python 3.12.8; fresh temporary exact-file layouts; newly authored code/data, not copied-source Git-blob claims. Not a learner transcript, full repository/CI result, protected exam, calibrated assessment or release approval.

## Runs measured
| Local source/group | Methods | Failure events | Exit |
|---|---|---|---|
| Deliberately flawed starter: test_export | 20 | 5 | 1 |
| Correct reference plus test_cli | 22 | 0 | 0 |
| Temporary read-policy reuse with safe projection: test_reference | 20 | 2 | 1 |
| Temporary raw projection with correct export policy: test_reference | 20 | 2 | 1 |
| Correct reference restored plus test_cli | 22 | 0 | 0 |

All mutant/starter failures were assertions, not imports or syntax errors. Counts include projection subtests; five events do not mean five independent vulnerabilities. Reused requirements and repeated runs are not additive independent coverage. Only the original teaching starter and correct reference are supplied; temporary regressions were restored before the final positive run.

Two standalone CLI demos also ran: starter exit 1 with shared_detail_allowed true and both export checks false; reference exit 0 with all three checks true. CLI contract methods additionally ran demo/extra-argument subcases from unrelated temporary directories, checking expected exits and no memo text in summary output. No network operation was implemented or exercised.

## Reproduction and limits
In a reviewed disposable copy with already provisioned Python, use python3 -B -m unittest -v test_export for the deliberately red starter, and python3 -B -m unittest -v test_reference test_cli for the selected 22-method positive group. These are visible local teaching checks, not grading gates. Preserve the starter and expected values. Do not run broad discovery including the defective starter and claim a clean release suite.

The record schema and assumed trusted actors are fixed. This is a small local application model with record/operation/property decisions, not authentication, HTTP transport, arbitrary ingestion, trusted evidence, general tenancy isolation, storage/concurrency or a hardened export system. Some mutation/positive/negative checks demonstrate selected behavior only. Independent semantic review, platform/material reproduction, accessible learner/reviewer pilot, assistance/unfamiliarity evidence and actual assessor calibration were not performed.

No real identities, credentials, tickets, data records, network targets, domain queries, database, file export destination, runtime handler, canonical lesson ID, reader import, grade, award, production configuration or deployment is introduced. Committing these eight files is not learner release or programme completion.
