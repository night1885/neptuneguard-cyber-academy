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
