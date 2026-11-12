#requires -Version 7.2
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/verify_windows.ps1"
$script:count = 0
$good = @{ ProcessId=123; ParentProcessId=99; ImageName='pwsh.exe'; ObservedStart='2026-01-01T10:00:00.0000000Z'; StartTimeKind='Utc' }
function Copy-Case { $copy=@{}; foreach ($key in $good.Keys) { $copy[$key]=$good[$key] }; return $copy }
function Expect-Rejection {
    param([scriptblock]$Body)
    $rejected=$false
    try { & $Body | Out-Null } catch { $rejected=$true }
    if (-not $rejected) { throw 'Expected rejection did not occur' }
    $script:count++
}
if (-not (Assert-OwnedSnapshot $good 123 99 'pwsh.exe')) { throw 'Valid fixture rejected' }; $script:count++
$x=Copy-Case; $x.ProcessId=$true; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.ProcessId='123'; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.ProcessId=124; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.ParentProcessId=98; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.ImageName='other.exe'; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.ImageName='C:\private\pwsh.exe'; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.ObservedStart='not a time'; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.StartTimeKind='Unspecified'; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.Remove('ImageName'); Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$x=Copy-Case; $x.Secret='not collected'; Expect-Rejection { Assert-OwnedSnapshot $x 123 99 'pwsh.exe' }
$before=$good | ConvertTo-Json -Compress
$null=Assert-OwnedSnapshot $good 123 99 'pwsh.exe'
if (($good | ConvertTo-Json -Compress) -ne $before) { throw 'Fixture mutated' }; $script:count++
[ordered]@{ synthetic_record_checks=$script:count; failures=0; native_windows_execution_claim=$false } | ConvertTo-Json
