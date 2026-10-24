# WIN-F2 — Observe one disposable file and its ACL

Draft K03 support, not a registered canonical lesson. Read [WIN-F1](WINDOWS-FOUNDATIONS-01.md) and satisfy its actual Windows execution gate before commands. The scratch-file activity is not read-only: it creates, writes, reads metadata for and deletes one newly created disposable file. No existing user/system file, ACL, account or service may be changed. Only fabricated content is used.

## Outcomes
Separate file ownership, access entries and observed operations. Explain literal paths, inheritance and why an excerpt is not a full effective-access calculation. Preserve scope through cleanup.

## Read the permission question precisely
A security descriptor contains access-control information for an object. An ACL entry describes rights for a principal under its applicable rules. The actual question is whether this execution context may perform this right on this object, not whether a familiar word such as Allow appears in one row. Relevant entries, inheritance, token context and other controls matter; do not implement an effective-access engine by choosing the first displayed row.

File ownership is related to administration of the object but is not identical to every possible read/write decision. An inherited rule is not automatically unsafe or automatically the right policy. Ask what access the exercise actually requires. Do not change the ACL to make its appearance match an example. A completed content write supports that specific observed write; it does not prove rename/delete rights or access by another identity.

Get-Acl retrieves a security descriptor. -LiteralPath treats the supplied path literally rather than expanding wildcard characters. The Access property exposes selected access rules; displayed fields are evidence, not a complete authorisation guarantee. No SACL/audit access or elevated rights are needed by the intended activity; if metadata access is refused, stop rather than request elevation from this lesson.

## Bounded scratch-file sequence — proposed, not executed
Confirm the actual approved brief permits this one-file create/write/metadata/delete activity in the reviewed guest's temporary-file location. If the route cannot establish the location or scope, use paper cases only. Keep the generated variable intact and inspect commands before running.

```powershell
$scratchFile = [System.IO.Path]::GetTempFileName()
```

This call creates a temporary file; it is not just a filename suggestion. Record its exact reference privately. If creation fails, stop. Do not substitute an existing file. The location/name mechanism is not a privacy guarantee or a hardened storage design.

Using only that newly generated reference:

```powershell
[System.IO.File]::WriteAllText($scratchFile, 'FICTIONAL Windows foundation exercise.')
$acl = Get-Acl -LiteralPath $scratchFile -ErrorAction Stop
$acl | Select-Object Owner
$acl.Access | Select-Object IdentityReference, FileSystemRights, AccessControlType, IsInherited
```

Before each line, predict its effect. Distinguish the completed write from the retrieved metadata. Do not invent the owner, inherited entries or exact rights: record what your approved guest actually supplies. Real principal/path details stay private; use redacted summaries. If an operation errors, record the blocker and use the approved cleanup/support route, not permission changes or retries as administrator.

## Narrow cleanup
Only if the variable still identifies the exact file newly created by this activity, use:

```powershell
[System.IO.File]::Delete($scratchFile)
[System.IO.File]::Exists($scratchFile)
```

The intended final observation is False at that path. Existence checks can return False for reasons other than a successfully verified deletion, including certain access/errors; this is a bounded check, not a forensic cleanup guarantee. Record errors and uncertainty. Do not delete a parent directory, use recursion/force, alter another file, or assume cleanup if the reference was lost. If the path is uncertain, stop and follow support.

## Paper cases and independent reasoning
Use C, D and H from the [fictional fixture](../fixtures/windows-foundations/cases.json). Explain why an Allow Read excerpt does not prove editing, why one observed write supports only a bounded conclusion, and why Access denied does not create permission to elevate. Add a legitimate-operation question and a denied-operation question without executing extra tests.

Submit the prediction, actual result or blocker, limited interpretation, cleanup record and remaining uncertainty. Do not turn this into a recursive ACL audit or permission-repair exercise. See [instructor guidance](WINDOWS-FOUNDATIONS-INSTRUCTOR.md) and [unexecuted-platform limits](WINDOWS-FOUNDATIONS-VALIDATION.md).

Sources: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-acl and https://learn.microsoft.com/en-us/dotnet/api/system.io.path.gettempfilename and https://learn.microsoft.com/en-us/dotnet/api/system.io.file.exists .
