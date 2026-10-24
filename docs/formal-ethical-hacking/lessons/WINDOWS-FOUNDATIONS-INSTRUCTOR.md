# Windows foundations — instructor guide

Draft visible teaching guidance, not a protected exam key or authorised host procedure. Start with [WIN-F1](WINDOWS-FOUNDATIONS-01.md), then [WIN-F2](WINDOWS-FOUNDATIONS-02.md), [WIN-F3](WINDOWS-FOUNDATIONS-03.md) and the [capstone](WINDOWS-FOUNDATIONS-CAPSTONE.md). The source [case fixture](../fixtures/windows-foundations/cases.json) is invented.

## Teach the connections
Ask for subject, execution context, object, requested right, observation and uncertainty before showing a command. Compare a group label with one actual operation; compare ACL metadata with an observed write; compare a process object with a service status. Have learners predict what is missing rather than immediately provide the next command.

Prerequisites for paper work are basic scope/evidence concepts and a reading bridge for variables, pipelines and objects. Before execution, all WIN-F1 Windows-route gates must be satisfied. A Linux guest setup, PowerShell documentation page or locally parsed case file is not that validation. Do not silently adapt a managed host or a domain-joined workstation.

## Visible case guidance
| Case | Bounded guidance |
|---|---|
| A | Unsupported. Group membership alone does not establish every object/right decision. |
| B | Supported only as an explicit fictional fact about that read. It is not a live observation or universal standard-account permission. |
| C | Unsupported. An Allow Read excerpt is neither write permission nor a complete effective-access calculation. |
| D | Supported only for the stated actor/write/time. Other identities, operations and effective permissions remain unknown. |
| E | Unsupported. Running status does not establish service-process mapping, listener, route or healthy HTTP response. |
| F | Unsupported. Separate process/service observations do not supply the relationship. |
| G | Stop/privacy decision. A SID is not automatically a password, but identifying output still needs approved minimal private handling. |
| H | Stop/scope decision. Access denied does not grant elevation or permission changes. |

## Worked teaching conversation
Student: The service is Running, so the endpoint works.
Instructor: Which observation establishes the listener, its owner or a response?
Student: None is supplied.
Instructor: Then preserve the Running observation, list the missing edges and request a decision before extra tests. The lesson is not to declare the service broken or to scan for it.

For permissions, ask whether the learner is describing metadata or a completed operation. If they say Allow means edit, ask which requested right and complete context support that claim. If they propose Run as administrator, return to the brief rather than solving the lesson by changing authority.

## Review record
| Dimension | Actual explanation/evidence | Intervention | Remaining gap |
|---|---|---|---|
| Scope and command destination | | | |
| Identity/context distinction | | | |
| ACL versus observed operation | | | |
| Process/service/endpoint distinction | | | |
| Privacy and redaction | | | |
| Errors, cleanup and final state | | | |

No numeric pass threshold or automatic completion is defined. Record instructor rescue separately. Paper reasoning is not independent guest execution; unexecuted or blocked steps remain unexecuted/blocked. Actual evidence collection requires the approved private route.

## Platform validation still required
Validate approved Windows/PowerShell versions and CPU/media/licensing route; confirm trusted tool origin; reproduce ordinary-session identity output, one-file create/write/ACL/delete behaviour and its failures, own-process selection, placeholder/wildcard stops and exactly one approved service query. Check error behaviour, cleanup uncertainty, privacy, accessible text evidence and no unapproved service/permission changes. Full supported-platform and assessor review remain pending.

Source reading:
https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens
https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-acl
https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process
https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service
