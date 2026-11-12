# Windows process evidence: one child, explicit context

Supporting owner-authoring draft; not a canonical ID, native incident collector, complete Windows pathway or new practical permission. This is a separate PowerShell 7.2+ owned-process route; it does not change the existing Windows foundation lessons' prerequisites or request a PowerShell installation/upgrade. Missing reviewed setup or permission means paper study and an honest unattempted result, not elevation or policy bypass.

## Outcomes and boundary
Explain process ID, parent context, creation/start observations and their limitations. Obtain a selected observation only from a harmless child created by this helper, then close that child. No caller-supplied PID, executable, command, hostname, account or credentials are accepted. No broad process list, remote query, domain join, event-log export, memory capture, file ACL, security setting or production resource is touched by the exercise.

Read verify_windows.ps1 and test_windows.ps1 in fixtures/native-observation first. On the reviewed Windows/PowerShell route invoke the files from that directory:

    pwsh -NoProfile -NonInteractive -File test_windows.ps1
    pwsh -NoProfile -NonInteractive -File verify_windows.ps1

The first script dot-sources only the reviewed helper's functions and checks invented snapshots. Its passing checks are not evidence that a native query ran. The second requires Windows, starts the same trusted PowerShell executable as the current process with fixed no-profile/noninteractive sleep arguments, retains its process handle, and queries local Win32_Process only for that generated PID. It records selected fields and closes the child in finally. Do not substitute a suspicious executable or change the script to collect another process.

## Understand the evidence
Microsoft documents that ProcessId and ParentProcessId values can be reused. A number alone cannot track a process indefinitely. A process on another host/boot with the same number is not the same instance. The held process reference, live-child check and expected parent/image give selected context in this deliberately narrow run. They are not a replacement for complete host/boot/source evidence in a real investigation.

Diagnostics.Process supplies a start observation; CIM provides a creation-date field and process/parent/name data. The report retains the start's DateTime kind rather than pretending every value is already a calibrated UTC event. Two APIs on the same host are not independent evidence of cross-sensor clock accuracy. A precisely formatted timestamp does not establish synchronisation or causal order.

The helper does not record usernames, SIDs, full executable paths or general command lines in its output. Do not add personal details to make a report look richer. Observing the child's name and parent does not prove account rights, application authorisation, malware status, complete ancestry, network activity or incident scope. This demonstration belongs to the authoring/student experiment, never to a fictional incident timeline.

## Predict, observe and challenge
Before execution, identify which fields are expected to agree and which time assumptions remain untested. Run synthetic checks, then the native helper separately. Record the exact PowerShell version, actual success or error, selected output, and cleanup result. A blocked CIM query or startup failure is not a completed observation. Do not download a replacement tool, disable protections, change execution policy or elevate to obtain the expected output.

The helper uses UseShellExecute=false to create an executable directly; that property is about the operating-system launch mechanism, not proof that no command interpreter exists. Here PowerShell is intentionally the trusted child executing a fixed harmless sleep. The query can activate normal OS/provider activity; this is not a zero-side-effect acquisition claim.

## Independent task and assessment
Using only derived invented snapshots, test wrong PID/parent/image, malformed timestamps, missing/extra fields and boolean identifiers. Explain why consistent record shape is different from independently authenticating a source. Then draft a bounded native investigation request for a fictional reported process without executing it.

Submit predictions, genuine selected results or limitations, an evidence-context table and a supported next decision. Cleanup covers the held child in a normal completed run, not every crash/forced-kill scenario. The Windows CI runner's configured account may be privileged; success there does not validate an ordinary student's account, hardware, OS matrix or VM route. Native Windows execution is unclaimed until the hosted job succeeds; actual versions/results must be inspected separately. This does not complete Sysmon/EVTX, directory, memory or comprehensive Incident Response practicals.

Sources: https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process ; https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance ; https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.processstartinfo.useshellexecute .
