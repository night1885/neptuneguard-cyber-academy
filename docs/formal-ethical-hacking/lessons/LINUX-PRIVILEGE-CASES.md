# Privilege-boundary investigation — four fictional evidence cases

Draft paper task. Requires [the boundary lesson](LINUX-PRIVILEGE-BOUNDARIES.md).
All actors, labels and records below are invented supplied facts, not collected system
output. Do not create the configurations, execute a payload, inspect a live service,
change a file mode, use sudo or test another account. No practical permission is added.

## Common brief

For each case draw the control-to-effect chain. Separate supported arrows from missing
ones. Produce a narrow finding or explain why the proposed escalation claim is unsupported.
Do not convert paper facts into personal observations. Each case is independent; do not
combine their facts into an invented attack chain.

## Case A — controlled instructions and a privileged consumer

The supplied fictional record states:
- Actor learner-a cannot directly perform the protected report-generation operation.
- That actor can edit the contents of the specific script selected by a documented job.
- The documented job invokes an interpreter on that same script, with effective UID 0.
- The job reaches that script; the supplied scenario explicitly excludes path aliases,
  privilege dropping before interpretation and a different namespace view of the file.
- No changed script, privileged effect or new process was actually executed for this case.

Explain why this is a documented paper trust-boundary route, not merely a writable-file
observation. What would a minimal non-destructive proof need to establish in a future
separately authorized lab? Keep the proof proposal conceptual: no payload or live command.
Propose a repair to the consumed-instruction control and a legitimate-job retest.
Do not report an obtained shell or completed escalation.

## Case B — writable data is not automatically executable code

The supplied fictional record states:
- learner-b can edit one numeric threshold value in an input document.
- A privileged monitoring process reads the threshold as a bounded integer.
- Its parser uses no shell, evaluator, plugin load or path interpretation for that value.
- The controlled value influences only whether a fictional alert is generated.
- No evidence supplies another write destination, privileged instruction path or shell.

Identify the supported integrity concern and the unsupported code-execution claim. Name
a legitimate control and a possible policy correction without asserting that the numeric
parser alone solves every authorization or availability problem. A privileged reader is
not permission to invent arbitrary execution semantics.

## Case C — wrong helper, unchanged authority

The supplied fictional record states:
- learner-c controls one directory in a toy executable-search order.
- A fixed harmless alternate helper is selected and prints a different label.
- Parent and child retain the same ordinary effective identity and supplied capabilities;
  no protected operation or additional authority is evidenced.
- This is the only executed behavior described by the scenario.

Separate helper-selection integrity from privilege escalation. What additional consumer
and authority evidence would be necessary before a cross-boundary claim? Do not propose
creating an elevated helper. Explain why an explicit path addresses selection but does not
by itself prove ownership, dependency integrity or all execution safety.

## Case D — metadata without an execution path

The supplied fictional record states:
- A listing of a binary includes a set-user-ID indicator and a privileged owner label.
- The record does not establish effective execution behavior, mount restrictions,
  process capability/namespace context or a route to an unauthorized protected operation.
- The student's only action is reading this fictional listing.

Write the strongest justified statement and the missing questions. Reject both 'confirmed
root shell' and 'definitely harmless'. Identify why a privilege-related metadata flag is
an investigation lead rather than complete evidence. No execution is allowed to fill gaps.

## Required handover

For every case record: supplied facts; starting authority; controllable object/input;
consumer and authority; reachable operation; predicted effect; missing evidence; bounded
impact; conceptual repair; legitimate control; future authorized retest; and limitations.
End with a short stakeholder summary prioritizing supported concerns and uncertainty.
There is no numeric pass mark, automated grade, runtime progress or award.

If real host/user data appears, stop and use the actual approved incident process. This
package creates no submission service or evidence-retention policy. Instructor reference:
[review guide](LINUX-PRIVILEGE-INSTRUCTOR.md), not protected answer storage.
