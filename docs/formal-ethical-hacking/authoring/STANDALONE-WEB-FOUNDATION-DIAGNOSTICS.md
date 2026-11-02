# Web foundations — explain a partial failure

Draft teaching extension, not released or executed in this batch. Read the terminal bridge and local worksheet first. Paper reasoning may proceed now; practical work requires the approved guest, normal account, disposable workspace, reviewed tools and private evidence route. No other preparation-course enrollment is required.

## Model: three observations

Standard output carries a program's useful output; standard error can carry diagnostics. Exit status is a separate result whose meaning depends on the program. A program can produce useful output and still report failure. In Bash, $? concerns the most recent command, so save it before another command replaces that observation.

Redirection > creates/truncates its destination; >> appends. They are not evidence-preservation tools unless their destinations and effects have been chosen deliberately. A pipeline normally connects one command's standard output to the next command's standard input, not automatically its standard error.

## Worked fictional transcript

A listing names an existing owned file and a definitely missing local file. Its useful-output file contains the existing name; its diagnostic file reports the missing name; its immediately saved status is nonzero. These three facts are compatible. The existing name does not cancel the missing-name failure. The exact number and wording must come from the actual implementation, not this fictional description.

If the learner instead runs a successful print and only then saves $?, the saved value describes the print, not the listing. The earlier status is lost from that mechanism. Explain the loss honestly rather than inventing the expected number.

## Guided predictions

1. Predict the contents after writing first with >, writing second with >>, then reading the file. Predict the second read after writing replacement with >. State why the chosen file must be disposable.
2. In Bash, false | cat ordinarily reports the last command's status. Predict why this can conceal the earlier false result. Compare the original lesson's subshell demonstration with pipefail enabled; do not assume every shell behaves identically or that pipefail solves all error handling.
3. For each observation, name one supported conclusion and one conclusion requiring additional evidence.

## Approved later practical reference

Use [EH-LINUX-03](../lessons/EH-LINUX-03.md), including its EH-LINUX-01/02 prerequisites, for the actual bounded stream, saved-status, append/overwrite and subshell exercises. Use fresh owned disposable names and inspect destinations before redirection. This extension adds no command, broader file access, network action or permission. Missing tools or ambiguous context require support, not installation, sudo or unrelated-file experiments.

## Independent task and report

Without an answer script, explain how you would demonstrate an existing-file result alongside a missing-file diagnostic and preserve the relevant status. After separately approved execution, record context, prediction, minimal actual observations, interpretation and final state. Report blocked or unattempted steps; keep predictions separate from results. Explain how collecting only stdout or only a final command's status would lose evidence. Retain only identified disposable files for review; no recursive cleanup.

Instructor criteria: accurate signal separation; immediate status preservation; append/overwrite reasoning; Bash-specific pipeline limits; scope discipline; honest recovery. A nonzero result intentionally induced by the exercise is not automatically a failed learning outcome. Independent performance, supported-guest validation and calibration remain open. No completion or award is created.
