# Collection-export — selected local causal checks

Execution date: 2026-11-01 in the programme owner's local timezone. Local author evidence, not learner performance, a supported guest route, CI or release approval.

## Source identity

Retrieved at commit 7c923edc37f26cfbc7413acc33319147dd3d7129:
- export_lab.py Git blob fd3ca71862686d78ecbc91c751842c09fddb3351.
- export_repaired.py Git blob 77c4a05381c160e36a8e7ba11c45a9a351ef0809.
- test_export.py Git blob 386a7dfdf5ff649e6c912a9d87d90191d8bf7cff.

All three contents were reconstructed in a disposable local directory and their Git blob hashes verified before execution. Environment: CPython 3.12.8 on Linux, not a full repository checkout or supported student VM.

## Method

A temporary author driver imported these three files and reused test_export.ExportTests. For each fresh subprocess, it rebound that class's factory to the selected factory, loaded only that 20-method class with unittest, recorded test/failure/error/skip counts and exited according to the result. Python used -B and each child had a 10-second timeout. This was not broad discovery or execution of the original test_reference/test_cli modules.

Factories tested:
1. Starter: export_lab.make_app, using can_read and dict.
2. Reference: export_repaired.make_app, using can_export and public_record.
3. Operation-only: ReportApplication(export_repaired.can_export, dict).
4. Projection-only: ReportApplication(export_lab.can_read, export_lab.public_record).
5. Reference again in a fresh process.

The two partial repairs were temporary factory compositions, not file edits or committed implementations. Existing sources and expected tests stayed unchanged. No network, database, file export, package installation, runtime import or real learner data was involved.

## Observed results

| Factory | Methods run | Assertion-failure events | Errors | Skips | Process exit |
|---|---:|---:|---:|---:|---:|
| Starter | 20 | 5 | 0 | 0 | 1 |
| Reference | 20 | 0 | 0 | 0 | 0 |
| Operation-only | 20 | 2 | 0 | 0 | 1 |
| Projection-only | 20 | 2 | 0 | 0 | 1 |
| Reference repeated | 20 | 0 | 0 | 0 | 0 |

Starter failures: test_contributor_export_set; test_export_projection subtests R01 and R04; test_internal_memo_absent; test_shared_read_does_not_grant_export. Five events include two subtest events inside one method; this is not five independent vulnerabilities.

Operation-only failures: test_export_projection subtest R01 and test_internal_memo_absent. The permitted-row set alone leaves overbroad returned properties.

Projection-only failures: test_contributor_export_set and test_shared_read_does_not_grant_export. Restricted output fields alone leave the wrong export permission rule.

The repeated reference run passed all 20 methods. These are reused requirements, not 100 independent specifications or newly authored learner tests. No unexpected import/setup failure was substituted for an intended assertion failure.

## Interpretation and remaining limits

These selected examples support two distinct repair obligations: operation-specific record selection and permitted property projection. They do not establish exhaustive correctness, authentication, arbitrary-input safety, general deep immutability, durable/concurrent storage, supported hardware, learner independence or advanced-web/certification readiness.

Read the [original package](../fixtures/collection-export/README.md) before any separately approved execution. Its original named baseline/reference/CLI commands and setup remain authoritative for that teaching route; the local driver described here is an additional author experiment, not a replacement learner workflow or an activated test runner. Historical validation is not rewritten.

This commit adds documentation only. No driver, partial repair, fixture modification, maintainer allowlist, workflow, practical registry, canonical lesson, runtime, permission, deployment or award is introduced. Independent semantic review, accessibility, supported reproduction, learner/reviewer walkthrough and calibration remain open.
