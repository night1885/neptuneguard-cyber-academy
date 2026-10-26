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
