# EH-LINUX-04 — Observe a process you started

Draft practical, not published. Requires EH-LINUX-03 and the clean guest from EH-LAB-02. Proposed ID only, not runtime registration. Use a normal non-root Bash session inside your own learner guest.

## Outcomes
Distinguish a program from a running process, identify a child and parent, read a process snapshot and collect the result of your own background task.

## Scope and tool checks
Only the short-lived Python child you start in this lesson may be signalled. No other user's process, system daemon, managed service, host process or unrelated terminal is in scope. No sudo, service-manager command, force-kill, broad name matching or process-group signalling is permitted.

Confirm the guest and account using the earlier readiness checks. Verify Python 3, Bash and the supported Linux ps implementation are available. Do not install packages or bypass organizational controls during the exercise. Exact supported guest/tool versions remain release work.

A program is code that can be run; a process is an execution instance with state and a process identifier. A PID is not a permanent identity and can be reused after a process exits. A shell job is the shell's tracking abstraction for work it started, not a synonym for every process on the machine.

## Start one bounded child
Read the commands before starting. In the same Bash session run:
```sh
python3 -c 'import time; time.sleep(120)' &
lab_pid=$!
printf 'child=%s parent=%s\n' "$lab_pid" "$$"
jobs -l
ps -p "$lab_pid" -o pid,ppid,stat,etime,comm
```
The child sleeps and exits naturally after 120 seconds if not stopped. It opens no network listener and handles no personal files. & starts it asynchronously; $! records the most recent background process ID, so save it immediately. $$ identifies this shell in the intended session. Another background command would change $!.

## Interpret the snapshot
PID identifies the displayed process, PPID its current parent, STAT its state/modifiers, ETIME elapsed wall time and COMM a command-name field. ETIME is not CPU time. A running/runnable or sleeping state is a momentary observation, not a diagnosis of health or malicious behavior. Very early observation may catch the child before it enters sleep.

The ps selection is deliberately narrow. Do not collect full machine command lines or unrelated process lists; those can reveal secrets and other users' activity. Missing output can mean the child already exited or observation failed. It does not authorize you to guess a replacement PID.

## Stop only the still-active child
Before signalling, verify jobs -l and the narrow ps snapshot still identify your just-started child and expected parent in this same shell. If the child finished, the PID/parent is unexpected, the variable is empty or you are uncertain, do not signal it. Use wait for your known shell child and report what happened. Do not paste an old PID from a screenshot.

For the verified active child only:
```sh
kill -TERM "$lab_pid"
wait "$lab_pid"
lab_status=$?
printf 'child status=%s\n' "$lab_status"
```
The shell's kill builtin sends a signal; its name does not mean every use immediately terminates a program. The explicit TERM request here targets only your bounded child. wait collects the child's termination status; capture it before another command changes $?. A signal-related nonzero status is not the same as a Python syntax error.

Do not escalate to KILL if the result differs. Stop and use the approved support route. A fresh narrow ps snapshot may no longer show the original child, but a future appearance of the same number cannot establish it is the same process. No check-then-signal sequence is a general race-free process-control design.

## Independent reasoning and evidence
Explain why a saved PID needs context, why a background job is not a service manager and why zero versus nonzero status requires interpretation. If the child expired before inspection, report that honest outcome rather than inventing a running snapshot.

Submit minimal relevant observations, actual status, final state and limits using PROCESS-SERVICE-WORKSHEET.md. A reviewer checks understanding and scope discipline, not a copied PID or a required STAT character. Formal grading and supported-guest validation remain pending.

Sources:
https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html
https://www.man7.org/linux/man-pages/man1/ps.1.html


## Extended teaching: follow one child's lifecycle

Keep this explanation inside the original practical boundary: the one short-lived Python child started by your normal non-root Bash session. It introduces no additional process-control commands and no authority over another process.

Think of the original exercise as a sequence of different observations. First the shell starts a background child. Next it saves the most recent background PID. Then a narrow process snapshot describes what is visible at one instant. Finally, the shell collects its child's result. These events are related, but they are not one atomic operation. A saved number alone cannot establish the entire lifecycle.

The shell's job information supplies context that a bare PID lacks: this session started and tracks this work. The narrow ps output adds current process and parent information. Read those observations together. Do not replace a missing child with another Python process simply because its command-name field looks familiar.

## Worked interpretation: separate three results

Imagine that your own child is visible with the expected parent, and the original TERM command returns successfully. That observation concerns the signal request. It is not the child's final result. The original wait command is the separate operation used to collect the known child's termination status. Capturing its status immediately preserves that result before a later command replaces the shell's most recent status.

Now imagine that the child reaches its natural 120-second exit before inspection. A missing process row can be consistent with that timing. Do not invent a sleeping snapshot, signal a guessed PID or treat an ordinary expiry as proof that ps failed. Record the actual sequence, use wait only for the known shell child as instructed, and distinguish what you observed from the explanation you consider plausible.

A third possibility is that the variable is empty or the displayed parent is unexpected. That is a stop condition, not an invitation to repair the example by guessing. Preserve the minimal observation and seek the approved support route. Do not escalate privileges or broaden selection to find something to terminate.

## Exercise: annotate the original command blocks

Without adding commands, label each original line with its purpose: start work, save identity context, show shell tracking, inspect a snapshot, request termination, collect the child's result, or display a saved result. Explain which value could be overwritten by another background command and which status could be overwritten by another ordinary command.

Explained answer: save the background PID immediately because a subsequent background launch changes the most-recent-background value. Save the wait result immediately because another command changes the most-recent-command status. Printing a value later is meaningful only if the intended value was saved first. Neither variable grants authority over whatever might later occupy the same numeric PID.

## Troubleshooting without escalation

Do not require one particular STAT character as proof of success. Timing affects a snapshot, and elapsed wall time is not CPU consumption. An unexpected result should produce a careful account of the session and observations, not a broad diagnosis of compromise or a forced match to an example screenshot.

If TERM does not produce the expected outcome, do not move to KILL, system-service management, name-based termination or group signalling. The lesson deliberately excludes those actions. The distinction between observing a mismatch and being authorized to remediate it is part of the exercise.

In the worksheet, separate the shell's observations, the child's collected result, final state and limitations. A copied PID from a previous run is not evidence for this run. State honestly if the child expired, if a field was unavailable or if the practical was not executed.

## Bounded human-led AI critique

An AI assistant may critique an invented lifecycle table and point out confusion between a signal request and a collected child result. Do not upload complete machine process lists or command-line dumps. Reject any proposed sudo, force-kill, broad matching or extra target. You decide whether the explanation fits the actual narrow observations; the assistant must not select or signal a process.
