# WIN-F1 — Windows identity, context and evidence

Draft supporting lesson for K03, not a canonical ID or runtime registration. This package begins new Windows teaching; it does not establish that the Windows competency or any certification objective is complete. Continue with [WIN-F2](WINDOWS-FOUNDATIONS-02.md), [WIN-F3](WINDOWS-FOUNDATIONS-03.md) and the [capstone](WINDOWS-FOUNDATIONS-CAPSTONE.md).

## Gate before any command
Paper reading may proceed with fictional records. Command execution requires a separate actual approved Windows brief and supported setup route: a student-owned clean workgroup guest, reviewed media/licensing and architecture, approved tools/material transfer, baseline/recovery, isolation, support/incident process and private evidence handling. No domain join, managed/production host or Linux/WSL substitute is included. These documents do not provide that validated route. If any gate is missing, record BLOCKED and stay with paper work. Do not buy licences, download tools, reconnect a guest or elevate as a workaround.

Read the brief and EH-LAB-00 concepts first. Existing Linux guest instructions do not automatically validate Windows. Use only the approved existing PowerShell version; no installation or version upgrade is requested. Current documentation references are not a tested compatibility matrix.

## Outcomes
Explain the difference between an account, an execution context, an object and an operation. Observe only the current local identity when permitted. Handle identity evidence without publishing personal details.

## Understand before observing
An account label is not a complete permission decision. Windows access tokens describe process/thread security context, including identity/group information and privileges. The operation still concerns a particular securable object and requested right. A group name alone does not prove that every file can be edited or that an application should disclose every record. A successful sign-in does not replace application authorisation.

Keep four questions separate: who is the actor; which context performs the operation; which object/right is requested; and what actually occurred? A displayed identity is an observation, not an academy enrolment, assignment or lab-authorisation adapter. Likewise a standard account may have a specifically delegated right; absence from an administrator group is not proof that all operations fail.

An account name and SID-like identifier are not automatically passwords, but they can identify a learner or environment. Keep real output in the approved private process and submit only necessary redacted excerpts. Do not use identical redaction labels as evidence of identical underlying identities.

## Bounded command draft — only after the gate
In the approved guest and ordinary learner session, confirm the command destination and predict what these observations can establish:

```powershell
$PSVersionTable.PSVersion
whoami.exe /user
$identityExitCode = $LASTEXITCODE
$identityExitCode
```

Record the actual version and whether the identity command succeeded. If either command fails, stop and record the error; do not substitute expected text or infer the missing result. This fixed native command is for the reviewed guest toolchain, not arbitrary executables downloaded from a tutorial. Local command selection is not proof of zero background traffic or network isolation.

Write a short explanation without posting the raw account/SID publicly: the observation describes this context at this time; it does not establish a particular file right, service identity, HTTP access, instructor role or another account's authority. No account change, group change, credential collection, domain query or elevation is introduced.

## Read the syntax and success signal
`$PSVersionTable` is a PowerShell-provided table; `.PSVersion` selects its version value. This is an object/property expression, not a request to install or upgrade PowerShell. `whoami.exe` is a native Windows program; `/user` requests the current user identity information. Do not substitute a similarly named downloaded executable or infer a service account from your interactive identity.

`$identityExitCode = $LASTEXITCODE` copies the native program's exit code immediately after that invocation. The following `$identityExitCode` expression displays the saved value. It introduces no additional identity query. Record the actual code with the actual output. If the invocation failed, was not found, or the result is ambiguous, stop rather than treat an old variable value or remembered output as success. Native exit status, PowerShell cmdlet error behavior and application authorization are different concepts.

Native exit code zero supports that this invocation reported success; it does not grant a file right, identify all groups/privileges, establish another process's token or authorize future work. Do not append PowerShell's `-ErrorAction Stop` to `whoami.exe` as if it were a native flag. Do not change execution policy, native-error preferences or session privileges to complete this draft. Available behavior still requires reproduction on the approved toolchain.

Before the approved observation, predict which output is the PowerShell version, which is native identity output and which is the saved numeric status. Afterwards, explain the strongest claim supported by each separately. If the account label is redacted, retain enough context in the approved private record to distinguish the observation without publishing its underlying identity.

## Troubleshooting without expanding the exercise
- Command not found or unexpected executable selection: report the approved-toolchain discrepancy; do not search for or download a replacement.
- Access denied: record the error and stop; this lesson does not permit elevation or account changes.
- Unexpected account or session: stop and confirm the guest/session with support before file or service work.
- Missing version or exit status: report the missing observation. Do not invent a compatibility claim or success code.

Documentation: Microsoft Learn about_Automatic_Variables and about_Error_Handling. These support explanation of native status, not validation of this guest.

## Fictional reasoning and review
Read A, B and G in the [case fixture](../fixtures/windows-foundations/cases.json). A group-membership statement is insufficient for an all-files claim. A specifically supplied successful permitted read supports that read only. Unapproved public identity-output sharing is not an acceptable evidence workflow.

Questions: why is a group label insufficient? What would establish one particular operation? What must be redacted, and what uncertainty should remain visible? Use the [instructor guide](WINDOWS-FOUNDATIONS-INSTRUCTOR.md) after making your own predictions.

## Limits and submission
Submit fictional analysis and, only if the real gate is approved, minimal genuine local observations or an honest blocker. No automatic progression, grade, award or practical permission is granted. No PowerShell/Windows execution was performed during authoring; see [validation](WINDOWS-FOUNDATIONS-VALIDATION.md).

Source: https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens .
