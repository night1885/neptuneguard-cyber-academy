# Web foundations — identify the process before acting

Draft extension, not a supported-guest validation or practical authorization. Read the diagnostics extension first. No other course enrollment is required. Paper cases below are fictional and authorize no process action.

## Model and worked case

A program is code; a process is an executing instance with state. A PID identifies a process in a particular context and can be reused after exit. A shell job is the shell's tracking abstraction, not a service manager or every process on the computer.

Fictional case: a learner starts the lesson's bounded child in their guest and records its PID immediately. Later, the child has expired naturally. A screenshot still contains its old PID. That number alone cannot establish a current target. Do not signal a guessed replacement or treat a future reuse of the number as the original child.

A narrow process listing is a snapshot. Elapsed wall time is not CPU time; a sleeping state does not establish health or maliciousness. Missing output may reflect completed work or an observation problem. These are hypotheses to distinguish, not permission to inspect every process.

## Guided discussion

1. Explain what the current shell job record and expected parent add to a saved PID, and why they do not turn a check-then-signal sequence into a general race-free design.
2. Distinguish a request to send a signal from a collected child termination result. Why must the wait result be captured promptly?
3. Explain why an expired child can be an honest observation rather than a reason to fabricate a running snapshot.
4. Identify sensitive information that broad process/environment dumps could expose; propose the minimum relevant observation instead.

## Approved later practical reference

Use [EH-LINUX-04](../lessons/EH-LINUX-04.md) only after its original diagnostics, clean-guest, non-root Bash and tool prerequisites are reviewed for this course. Its scope is the short-lived Python child the learner starts in the same shell. Only that still-verified active child may receive the lesson's TERM request. No host process, unrelated PID, daemon, service-manager change, broad matching, process-group signalling, force-kill or privilege elevation is added here.

If the child exits, identity is uncertain, tools differ or the result is unexpected, follow the original stop/support guidance. Do not substitute another process. Use the [process worksheet](../lessons/PROCESS-SERVICE-WORKSHEET.md) for relevant child observations only; its listener section is not required or authorized by this extension.

## Independent variant

A learner reopens a terminal, copies yesterday's PID and proposes stopping it because the same number appears today. Explain what cannot be established and the next safe decision. Then describe what actual evidence would be needed for a fresh, separately authorized bounded-child exercise. Do not run commands to answer.

Instructor criteria: program/process/job distinctions; time/context-sensitive identity; narrow observation; status interpretation; no guessed target or escalation; honest final-state reporting. Mark hints separately from independent reasoning. Actual supported-guest execution, accessibility review and assessment calibration remain open. No runtime progression or permission changes.
