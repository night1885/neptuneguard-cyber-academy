# Shell diagnostics — local contract checks

Execution date: 2026-11-01 in the programme owner's local timezone. Optional maintainer evidence, not a learner grade, supported setup acceptance or release approval.

## Source and method

Reviewed EH-LINUX-03.md at commit 977a6200b3a3d163c73453955755c5ec5dcf77f9, lesson Git blob 7e0c88005c754a017bea3970ccb9e0f5d067dbe0. The new test module uses adapted, hardcoded command contracts drawn from that lesson plus a saved-status contrast. It does not extract or hash-match executable Markdown blocks and will not automatically detect later lesson drift.

Test module Git blob: d0b667d026f0c41b4eed7aaf9f3731ff170a1868. Four named unittest methods ran in a disposable local directory under CPython 3.12.8 on Linux. Each case creates a separate temporary workspace and invokes reviewed Bash snippets with startup files disabled, PATH set to os.defpath and LC_ALL=C. No inherited BASH_ENV is supplied. Each Bash child has a 10-second timeout. Temporary directories are removed by the test harness after inspection; this is maintainer cleanup of test-created data, not a learner recursive-deletion exercise.

Observed tools inside the same restricted shell environment: Bash 5.3.9(1)-release; ls and cat from uutils coreutils 0.8.0. These are not the prescribed GNU-utilities student guest. Tool identity and supported-platform reproduction remain separate review requirements.

## Observed result

Command: python3 -B -m unittest -v test_standalone_web_diagnostics, from a disposable directory containing the exact test module.

Four tests ran; zero skips; zero failures/errors; unittest process exit status 0:
- test_separate_streams_and_preserve_status: useful output names the existing file, diagnostic names the absent file, and the saved listing status is nonzero even though the final print succeeds. The test does not require one implementation-specific ls status or diagnostic sentence.
- test_append_then_overwrite: reads first and second, then replacement; final disposable file contains only replacement.
- test_pipeline_status: observed default=0 then pipefail=1 for the selected Bash example; the final print's process status is not the earlier pipeline status.
- test_saved_status_survives_later_success: observed saved=1 and later=0 after a successful print.

## Reproduction and limits

Run only reviewed trusted code in a disposable author environment. From this authoring directory, use the same named unittest command. Missing Bash/ls/cat can cause skips; inspect the output rather than treating exit 0 as proof that four tests ran. The initial availability check uses the invoking PATH, while child commands use os.defpath; a differing tool layout can cause failure and requires review, not an improvised installation.

Temporary directories, restricted environment and timeouts do not make this a sandbox for untrusted scripts. This module uses only fixed reviewed snippets and invented local files. It adds no network request, service inspection, process signalling, permission changes, package installation or real learner data.

No full repository checkout, combined authoring runner, CI, hardware/guest reproduction, isolation proof, learner independence or assessor calibration was tested. No file-permission denial or general pipeline error strategy is validated. The test module is not added to the maintainer allowlist, practical registry or workflow. Existing lesson requirements remain in force, including approved guest/setup and private evidence handling for learner practicals.

See the [teaching extension](STANDALONE-WEB-FOUNDATION-DIAGNOSTICS.md) and [original lesson](../lessons/EH-LINUX-03.md). This separate execution record does not rewrite earlier statements about unexecuted batches. No course completion, catalogue, runtime, permissions, deployment or award changes are included.
