# EH-LINUX-03 — Interpret output, errors and exit status

Draft, not published. Requires EH-LINUX-01 and EH-LINUX-02. Run only in the disposable learner-guest workspace using Bash and GNU utilities. No network access, administrator privileges or system modifications are needed.

## Outcomes
Distinguish standard output from standard error, preserve exit status promptly, explain a pipeline's limits, and write an honest short diagnostic note.

## Three separate signals
Programs can read standard input and write standard output and standard error. A command also returns an exit status. Zero conventionally signals success; nonzero meanings depend on the program. The special Bash expansion $? refers to the most recent command's status, so another command can replace the value before you record it. Output text and status are related evidence, not interchangeable signals.

## Separate a partial success from its error
Use the workspace containing copy.txt. Confirm absent.txt does not exist; if it does, choose another definitely absent local name and document the change.
```sh
ls -- copy.txt absent.txt > listing.txt 2> errors.txt
result=$?
printf 'status=%s\n' "$result"
cat -- listing.txt
cat -- errors.txt
```
The shell directs standard output into listing.txt and standard error into errors.txt. Both destinations are disposable course files and may be overwritten. The command can list an existing file and also report failure for a missing one. Explain why finding expected text in listing.txt does not establish that the whole command succeeded.

Record the actual diagnostic and status on your guest. A local GNU ls check returned 2, but wording, locale and implementation can differ. Do not replace your observation with the author's output.

## Overwrite versus append
```sh
printf '%s\n' first > stream.txt
printf '%s\n' second >> stream.txt
cat -- stream.txt
printf '%s\n' replacement > stream.txt
cat -- stream.txt
```
Explain what changed between the two reads. >> appends; > truncates an existing ordinary file. Never use these operators on original evidence or unrelated documents as a demonstration. Keep a separate minimal report if a transcript is required.

## A pipeline can conceal an earlier failure
Run the following in a subshell so the option changes do not persist in your interactive session:
```sh
(
  set +o pipefail
  false | cat
  printf 'default=%s\n' "$?"
  set -o pipefail
  false | cat
  printf 'pipefail=%s\n' "$?"
)
```
false deliberately returns a failure status without representing a real system fault. A pipe normally connects a command's standard output to the next command's standard input. Without pipefail, Bash reports the last command's status for this pipeline. With pipefail, an earlier nonzero result can make the pipeline nonzero. Here the expected printed statuses are 0 then 1; record your own observations. This does not mean pipefail is a complete error-handling strategy.

Do not generalize Bash-specific behavior to every shell. Do not infer success solely from an empty terminal or a final program that completed.

## Independent diagnostic report
Using only disposable local files, demonstrate one command with useful output plus an error, capture its status promptly, and separate observed facts from interpretation. Explain one case where redirecting only standard output would lose useful diagnostic evidence. Include the final workspace state and any differences from the guide.

## Scope and cleanup
No scanning, downloading, credential collection or elevated execution belongs to this exercise. Retain only minimal redacted evidence in the approved private workflow. Do not put personal submissions or instructor answers in the repository. Cleanup must target only identified disposable files after review; a failed exercise is a valid troubleshooting record, not a reason to fabricate success.

## Source and validation
GNU Bash manual: https://www.gnu.org/software/bash/manual/bash.html
Redirections: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
Local checks covered separate streams, immediate status capture, append/overwrite and pipeline status. They did not validate the complete course or student platforms.

## Expanded teaching: preserve the evidence before interpreting success

The existing practical uses only Bash, GNU utilities and disposable local files in the learner guest. This supplement adds reasoning and paper cases, not network access, system modifications, new privileges or permission to overwrite genuine evidence.

### Output and status answer different questions

Standard output is one channel a program can use for results. Standard error is another channel commonly used for diagnostics. The process exit status is a separate signal returned to its caller. None is a universal substitute for the others: useful output can accompany a nonzero status, and a successful invocation can intentionally produce no output.

The correct interpretation depends on the utility. For a comparison command, a documented nonzero status may distinguish unequal inputs from an operational problem. Do not generalize one program's numeric meanings to every program. The report should preserve both the actual status and the context needed to understand it.

### Follow the existing listing example step by step

The fixture copy.txt exists and the chosen absent filename does not. Bash prepares the two output destinations, then the listing utility attempts its operands. The program can provide information about the existing input while reporting a problem with the missing one. A nonempty listing.txt therefore does not establish complete success.

The assignment immediately after the command preserves its status before another command replaces the current value. The later printf reports the saved value. The cat commands show the separate files, but their success would concern reading those files, not retrospectively establish that the earlier listing succeeded.

FICTIONAL analysis: a learner records a useful filename in listing.txt and a missing-file diagnostic in errors.txt, then writes “all checks passed.” Correct the conclusion to distinguish useful partial output from a failed operand. Keep the actual numeric result from the learner's environment rather than substituting an author's example.

### Status has a short lifetime unless saved

In an interactive Bash sequence, $? expands to the most recent command's status. If a learner runs another observation before printing it, the original value has been displaced. A later zero cannot be honestly assigned to the earlier operation.

If immediate capture was missed, record that the original status was not preserved. A permitted repeat may provide a new observation, but it does not reconstruct an exact historical result. Identify the repeat as a separate event and check that it will not overwrite evidence needed from the first attempt.

### Redirection changes state even in an observation exercise

The utility may be observing files, but shell redirections write the named output destinations. The original listing procedure can overwrite listing.txt and errors.txt, and the stream exercise intentionally replaces disposable contents. It is inaccurate to describe the entire sequence as having no filesystem effects.

The overwrite/append distinction is about the destination: > normally truncates an existing ordinary output file, while >> appends. Neither proves the destination is appropriate. A correctly spelled operator aimed at genuine evidence is still an unsafe choice. Retain the rule that demonstrations use only identified disposable workspace files.

If redirection cannot open its destination, the shell can fail before starting the intended utility. An empty or missing result file is therefore not enough to diagnose what the utility did. Preserve the actual diagnostic and avoid asserting that the program ran when the evidence does not establish it.

### Interpret the pipeline without imagining a safety net

In the original false | cat example, false supplies a deliberate failure status, not a real incident. With pipefail disabled, the pipeline status normally comes from its final command. A successful final cat can therefore conceal the earlier nonzero status in the aggregate result.

With pipefail enabled, Bash reports the rightmost nonzero command status if any command failed, or zero if all succeeded. This is not necessarily the first failure, and it is not a detailed report of every stage. The subshell keeps these option changes local to the demonstration rather than silently changing the learner's ongoing session.

pipefail also does not undo earlier writes, validate scope or guarantee correct output. Error signaling and recovery are different responsibilities. The correct lesson is to understand the status being reported, not to treat one shell option as complete error handling.

### Troubleshooting and evidence decisions

| Situation | What it does not prove | Defensible response |
|---|---|---|
| Expected output appears alongside a diagnostic | That every operand succeeded | Preserve both streams and the immediately captured status |
| A later command returns zero | That an earlier command succeeded | Attribute the status to its actual command |
| An output file is empty | That the observation found nothing | Check the diagnostic and whether the invocation ran successfully |
| A pipeline is zero without pipefail | That every stage returned zero | Explain the pipeline's reporting rule |
| A rerun produces a different result | That the first record should be edited | Keep the runs distinct and explain relevant state differences |

### Human-led AI review — FICTIONAL only

First analyze this fictional statement yourself: “The listing printed copy.txt, and a later printing command returned zero, so the earlier listing had no errors.” Identify the misplaced status attribution and the missing diagnostic context.

If an approved assistant is available, give it only that fictional statement and ask for the unsupported inference, the missing observation and a narrower conclusion. Reject an answer that invents the original status or claims the missing file existed. Do not upload real command histories, usernames, paths, credentials or submissions. If AI is unavailable, write the critique manually; the objective is reasoning, not tool usage.

### Exercises and explained answers

1. Why save the status before displaying result files? Displaying them runs new commands, which can replace the current $? value.
2. Can a useful listing coexist with failure? Yes. Some operands can produce useful output while another operand fails.
3. Does pipefail restore an overwritten file? No. It affects aggregate status reporting, not rollback.
4. Should you replace an unexpected diagnostic with the guide's wording? No. Actual wording, locale or implementation can differ; record and interpret the genuine result.
5. Is a missing status recoverable by confidently asking AI? No. An assistant cannot observe an unrecorded historical process result. Mark it missing or document a separately authorized repeat.

Conclude with a minimal diagnostic note: intended action, actual context, observations and saved status, interpretation, uncertainty and final workspace state. This is formative feedback, not an automatic completion or grading mechanism.

Technical reading: GNU Bash manual, Pipelines and Redirections. No new execution or supported-platform reproduction is claimed by this supplement.
