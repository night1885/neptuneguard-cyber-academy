#requires -Version 7.2
# Owned-process teaching only. No caller PID, remote host, credentials or elevation.
function Test-ProcessNumber {
    param($Value)
    return (($Value -is [int] -or $Value -is [long] -or $Value -is [uint32] -or $Value -is [uint64]) -and $Value -gt 0 -and $Value -le [uint32]::MaxValue)
}

function Assert-OwnedSnapshot {
    param($Snapshot, $ExpectedPid, $ExpectedParent, $ExpectedImage)
    if ($Snapshot -isnot [hashtable] -or (@($Snapshot.Keys | Sort-Object) -join ',') -ne 'ImageName,ObservedStart,ParentProcessId,ProcessId,StartTimeKind') { throw 'Snapshot shape' }
    if (-not (Test-ProcessNumber $ExpectedPid) -or -not (Test-ProcessNumber $ExpectedParent) -or -not (Test-ProcessNumber $Snapshot.ProcessId) -or -not (Test-ProcessNumber $Snapshot.ParentProcessId)) { throw 'Numeric identity required' }
    if ($Snapshot.ProcessId -ne $ExpectedPid -or $Snapshot.ParentProcessId -ne $ExpectedParent) { throw 'Owned context mismatch' }
    $name = $Snapshot.ImageName
    if ($name -isnot [string] -or [string]::IsNullOrWhiteSpace($name) -or $name.Length -gt 80 -or $name.Contains('\') -or $name.Contains('/') -or $ExpectedImage -isnot [string] -or $name -ine $ExpectedImage) { throw 'Image mismatch' }
    if ($Snapshot.ObservedStart -isnot [string] -or $Snapshot.StartTimeKind -notin @('Utc','Local','Unspecified')) { throw 'Time context required' }
    [datetime]$parsed = [datetime]::MinValue
    if (-not [datetime]::TryParse($Snapshot.ObservedStart, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind, [ref]$parsed) -or $parsed.Kind.ToString() -ne $Snapshot.StartTimeKind) { throw 'Invalid time representation' }
    return $true
}

function Invoke-OwnedWindowsObservation {
    if ($args.Count -ne 0) { throw 'No arguments accepted' }
    if (-not $IsWindows) { throw 'This route requires reviewed Windows PowerShell 7.2+' }
    $current = [Diagnostics.Process]::GetCurrentProcess()
    try { $exe = $current.MainModule.FileName } finally { $current.Dispose() }
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $exe
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    foreach ($value in @('-NoProfile','-NonInteractive','-Command','Start-Sleep -Seconds 30')) { $info.ArgumentList.Add($value) }
    $child = [Diagnostics.Process]::Start($info)
    if ($null -eq $child) { throw 'Child startup failed' }
    try {
        $heldHandle = $child.SafeHandle
        $started = $child.StartTime
        $rows = @(Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId = {0}' -f $child.Id) -Property ProcessId,ParentProcessId,Name,CreationDate -OperationTimeoutSec 5 -ErrorAction Stop)
        if ($rows.Count -ne 1 -or $child.HasExited) { throw 'Owned live instance not established' }
        $row = $rows[0]
        $snapshot = @{ ProcessId=$row.ProcessId; ParentProcessId=$row.ParentProcessId; ImageName=$row.Name; ObservedStart=$started.ToString('o'); StartTimeKind=$started.Kind.ToString() }
        $null = Assert-OwnedSnapshot $snapshot $child.Id $PID ([IO.Path]::GetFileName($exe))
        $creation = if ($null -eq $row.CreationDate) { $null } else { $row.CreationDate.ToString('o') }
        $result = [ordered]@{ executed=$true; scope='Only the harmless child created by this invocation'; powershell_version=$PSVersionTable.PSVersion.ToString(); selected_snapshot=$snapshot; cim_creation_date=$creation; source='Local Win32_Process and held Diagnostics.Process'; cross_source_clock_accuracy_validated=$false; student_account_privileges_validated=$false }
    } finally {
        try {
            if (-not $child.HasExited) { $child.Kill() }
            if (-not $child.WaitForExit(5000)) { throw 'Owned child cleanup not verified' }
        } finally { $child.Dispose() }
    }
    $result['owned_child_closed'] = $true
    return $result
}

if ($MyInvocation.InvocationName -ne '.') {
    if ($args.Count -ne 0) { throw 'No arguments accepted' }
    Invoke-OwnedWindowsObservation | ConvertTo-Json -Depth 6
}
