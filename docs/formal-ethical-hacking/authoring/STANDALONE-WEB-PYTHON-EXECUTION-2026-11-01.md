# Python reading — selected local author execution

Execution date: 2026-11-01 in the programme owner's local timezone. This is a new execution record, not an amendment to earlier historical observations or a student grade.

## Source identity and environment

Retrieved from repository commit 366feed0662df21e78ebe25d5c9cdaab82814704:
- reading_model.py Git blob: 254a700f23e61c7fac28e34bec1ad2642d07f917.
- test_reading_model.py Git blob: 59bc76532e1115c2f192f4eacf1165fd68d897c3.

Both retrieved file contents were reconstructed in a disposable local directory and their Git blob hashes verified before execution. The additional test file's Git blob is 10bea42fb3b594102541407b80e03799f0d89381. Environment: CPython 3.12.8 on Linux in the assistant's local execution environment, not a supported learner VM or a full repository checkout.

Only the reviewed model and named unittest modules ran in child processes with a 15-second timeout per run and bytecode writing disabled. No network calls, package installation, academy runtime import, learner records or broad test discovery were involved.

## Observed results

| Stage | Tests run | Test-process exit status | Result |
|---|---:|---:|---|
| Original named module | 8 | 0 | All passed |
| Original plus two additional cases | 10 | 0 | All passed |
| Disposable comparison mutation, original module only | 8 | 1 | Four predicted assertion failures |
| Original source restored, both named modules | 10 | 0 | All passed |

Mutation: change only if status == 0 to if status != 0 inside describe_status. Observed failing methods: test_nonzero_status, test_summary_nonzero, test_summary_success and test_zero_status. No unexpected import/setup error was used as a substitute for the expected assertion failures. The mutation existed only in the disposable copy; no defective source is committed by this batch.

The two added cases cover nonzero status without the reviewed tag, and zero status with a different tag. Each checks the review flag and summary using fabricated values. These are author examples, not protected independent assessment questions or proof of evidence authenticity.

## Reproduction and teaching references

Read the [fixture instructions](../fixtures/python-reading/README.md) and [guided bridge](../lessons/PYTHON-READING-BRIDGE.md) before any approved execution. Keep their original setup, scope and provisioning requirements. In a reviewed disposable directory containing the model and both test files, the combined named command is:

```sh
python3 -B -m unittest -v test_reading_model test_additional_reading
```

Capture the test command's status immediately when using a shell. Do not infer it from a later successful print or run broad discovery across teaching fixtures. A missing approved environment/transfer route is a blocker, not permission to reconnect an isolated guest.

## Limits and preservation

This verifies selected synthetic examples and detection of one particular mutation in one local environment. It does not establish exhaustive correctness, arbitrary-input validation, supported hardware/guest compatibility, learner independence, assessor calibration, CI success, course completion or OSWE readiness. Frozen records and reviewed tags remain teaching constructs, not trusted identity or permission controls.

The original model, original tests, fixture README, lesson content, maintainer allowlist, catalogue and runtime remain unchanged. Earlier statements that a previous batch did not execute these exercises remain historically accurate. This batch adds an optional named test module and this separate execution note; it activates no workflow, publication, deployment or award.
