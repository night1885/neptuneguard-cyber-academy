# WIN-F3 — Own process, selected service and missing links

Draft K03 support, not runtime registration. Read [WIN-F1](WINDOWS-FOUNDATIONS-01.md) and [WIN-F2](WINDOWS-FOUNDATIONS-02.md). Review EH-NET-02 concepts before interpreting endpoints. Satisfy the actual Windows execution gate; otherwise use the supplied fictional records. No new network request, service control, remote query, privilege operation or process stop is introduced.

## Outcomes
Distinguish a process, a service, its account/configuration, a listening socket and an application response. Observe only the current PowerShell process and one exact service independently approved in the real brief. State what the observations do not connect.

## Build the relationship model
A process is an execution instance. A service is an operating-system-managed component with configuration and status. A network listener is another observation. These can be related but are not interchangeable labels. A service reporting Running does not establish an expected port, bound address, route, healthy application or authorisation decision. A process name likewise does not prove what a service consumes or returns.

PowerShell cmdlets produce objects; selecting a few properties displays only those properties. $PID refers to the current PowerShell process. Do not assume an arbitrary script has a separate process merely because it has a separate filename. Observe the actual context, not a remembered PID from another session.

A service name and display name can differ. Get-Service -Name accepts wildcards, so a loosely chosen pattern can broaden a query. This lesson requires the actual exact local service name from a separate approved brief, not an all-services inventory. If none is supplied, complete that part on paper; do not discover a substitute by listing everything.

## Observe the current process only
After the gate, in the current approved guest session:

```powershell
Get-Process -Id $PID -ErrorAction Stop | Select-Object Id, ProcessName
```

Predict the selected object and fields. Record the actual result or error. This supports an observation of the current process, not its relationship to any selected service, port or account policy. No process is started, stopped or inspected by broad discovery.

## Observe one separately approved service
The following placeholder deliberately stops until a reviewed brief supplies a single exact local name. It is not a request to invent or search for a target.

```powershell
$serviceName = 'REPLACE_WITH_EXACT_APPROVED_SERVICE'
if ($serviceName -eq 'REPLACE_WITH_EXACT_APPROVED_SERVICE') {
    throw 'Stop: the approved brief must supply one exact service name.'
}
if ($serviceName.IndexOfAny([char[]]'*?[]') -ge 0) {
    throw 'Stop: wildcard service queries are outside this exercise.'
}
Get-Service -Name $serviceName -ErrorAction Stop | Select-Object Name, Status, ServiceType
```

Use only the trusted brief value and unchanged reviewed code. This small guard is not a general input-security or authorisation adapter. A missing/inaccessible service is a blocker, not a reason to query all services, elevate, install one or change configuration. Do not start/restart/stop it or terminate its process. Real identity/service details stay in the approved private workflow.

## Interpret only the evidence supplied
The two commands do not map the service to a PID or establish a listening socket. A service-to-process or process-to-listener link would need its own approved observations; it is not supplied by a shared name. This lesson does not authorise obtaining those extra observations. It teaches how to identify a missing edge.

Use E and F from the [fictional cases](../fixtures/windows-foundations/cases.json). Draw separate boxes for current process, selected service, listener and HTTP result. Mark supplied edges and missing ones. Give two alternative explanations consistent with a Running service and absent endpoint evidence, without calling either a confirmed diagnosis.

## Deliverable and limits
Provide predictions, actual bounded observations or blockers, relationship diagram, minimal redacted evidence and a conclusion that names missing facts. No state-changing cleanup is needed for these read-oriented observations, but the brief's final guest-state check still applies. Command execution, actual service behaviour and platform compatibility remain unvalidated; see [validation](WINDOWS-FOUNDATIONS-VALIDATION.md). Continue with the [capstone](WINDOWS-FOUNDATIONS-CAPSTONE.md).

Sources: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process and https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service .
