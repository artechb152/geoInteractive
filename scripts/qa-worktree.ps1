<#
.SYNOPSIS
  Create or remove an isolated QA worktree under .claude\worktrees\qa-*,
  whose node_modules and public are junctions to the main checkout.

.DESCRIPTION
  Procedure and rationale: docs/dev-environment.md.

  Remove never deletes through a junction. For each link it checks that the
  path is inside this QA worktree, is a junction (not a real folder), and
  points at the expected shared folder of the main checkout. It removes the
  link with a non-recursive delete, which cannot remove folder contents, and
  confirms the link is gone. Only when no reparse point is left anywhere in
  the worktree does it run `git worktree remove`. Any error or unexpected
  state stops the script with exit code 1 before the next step.

  The script never stops processes. If a process command line still names the
  worktree, Remove stops and lists it.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\qa-worktree.ps1 -Action New -Name qa-mytask

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\qa-worktree.ps1 -Action Remove -Name qa-mytask
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidateSet('New', 'Remove')][string]$Action,
  [Parameter(Mandatory = $true)][string]$Name,
  # Main checkout. Defaults to the repo this script lives in.
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$LinkNames = @('node_modules', 'public')
$CheckoutPaths = @('src', 'content', 'next.config.mjs', 'tailwind.config.ts', 'postcss.config.mjs',
  'tsconfig.json', 'next-env.d.ts', 'package.json')
$ReparsePoint = [IO.FileAttributes]::ReparsePoint
$IgnoreCase = [StringComparison]::OrdinalIgnoreCase

function Fail([string]$Message) { throw $Message }

function Step([string]$Message) { Write-Host "[ok] $Message" }

function Get-FullPath([string]$Path) {
  $full = [IO.Path]::GetFullPath($Path)
  if ($full.Length -gt 3) { $full = $full.TrimEnd('\') }
  return $full
}

function Test-SamePath([string]$A, [string]$B) {
  return [string]::Equals((Get-FullPath $A), (Get-FullPath $B), $IgnoreCase)
}

# Attributes of the path itself (a junction is not followed); $null if absent.
function Get-Attributes([string]$Path) {
  try { return [IO.File]::GetAttributes($Path) }
  catch [IO.FileNotFoundException] { return $null }
  catch [IO.DirectoryNotFoundException] { return $null }
}

function Test-IsReparsePoint([string]$Path) {
  $attr = Get-Attributes $Path
  return ($null -ne $attr) -and (($attr -band $ReparsePoint) -ne 0)
}

function Invoke-Git([string[]]$GitArgs) {
  # git reports progress on stderr; collect it as text instead of letting
  # PowerShell 5.1 turn it into a terminating NativeCommandError.
  $saved = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { $out = & git @GitArgs 2>&1 | ForEach-Object { "$_" } }
  finally { $ErrorActionPreference = $saved }
  if ($LASTEXITCODE -ne 0) { Fail "git $($GitArgs -join ' ') failed (exit $LASTEXITCODE): $($out -join ' ')" }
  return $out
}

function Resolve-MainRepo([string]$Path) {
  $root = Get-FullPath $Path
  $attr = Get-Attributes $root
  if ($null -eq $attr -or ($attr -band [IO.FileAttributes]::Directory) -eq 0) { Fail "RepoRoot '$root' is not a directory." }
  if (($attr -band $ReparsePoint) -ne 0) { Fail "RepoRoot '$root' is itself a link." }
  if (-not [IO.Directory]::Exists((Join-Path $root '.git'))) {
    Fail "RepoRoot '$root' is not the main checkout (.git is not a folder; a linked worktree has a .git file)."
  }
  $top = @(Invoke-Git @('-C', $root, 'rev-parse', '--show-toplevel'))[0]
  if (-not (Test-SamePath $top $root)) { Fail "RepoRoot '$root' is not the top of its repository ('$top')." }
  return $root
}

function Resolve-QaWorktree([string]$Root, [string]$WorktreeName) {
  # A single folder name: qa- prefix, no separators, no trailing dot or space
  # (Windows strips those, so the name on disk would differ).
  if ($WorktreeName -notmatch '^qa-[A-Za-z0-9][A-Za-z0-9 ._-]*$' -or $WorktreeName -match '[ .]$') {
    Fail "Name '$WorktreeName' is not allowed. Use one folder name that starts with 'qa-' (letters, digits, space, . _ -)."
  }
  $claude = Join-Path $Root '.claude'
  $wtRoot = Join-Path $claude 'worktrees'
  foreach ($dir in @($claude, $wtRoot)) {
    if (Test-IsReparsePoint $dir) { Fail "'$dir' is a link; refusing to work under it." }
  }
  $wt = Get-FullPath (Join-Path $wtRoot $WorktreeName)
  if (-not (Test-SamePath (Split-Path -Parent $wt) $wtRoot)) { Fail "'$wt' is not directly inside '$wtRoot'." }
  if (Test-SamePath $wt $Root) { Fail "'$wt' is the main checkout." }
  foreach ($linkName in $LinkNames) {
    $target = Join-Path $Root $linkName
    if ((Test-SamePath $wt $target) -or $wt.StartsWith((Get-FullPath $target) + '\', $IgnoreCase)) {
      Fail "'$wt' is inside the shared folder '$target'."
    }
  }
  return @{ Root = $wtRoot; Path = $wt }
}

function Get-RegisteredWorktrees([string]$Root) {
  return @(Invoke-Git @('-C', $Root, 'worktree', 'list', '--porcelain') |
      Where-Object { $_ -like 'worktree *' } |
      ForEach-Object { Get-FullPath $_.Substring(9) })
}

function Test-IsRegistered([string]$Root, [string]$Wt) {
  # The first entry is the main checkout; only linked worktrees count.
  $linked = @(Get-RegisteredWorktrees $Root | Select-Object -Skip 1)
  return @($linked | Where-Object { Test-SamePath $_ $Wt }).Count -gt 0
}

# Throws unless $Link is a junction inside $Wt that points at $Target.
function Assert-QaLink([string]$Wt, [string]$Link, [string]$Target) {
  if (-not (Test-SamePath (Split-Path -Parent $Link) $Wt)) { Fail "'$Link' is not directly inside the QA worktree '$Wt'." }
  if (Test-SamePath $Link $Target) { Fail "'$Link' is the link target itself." }
  $attr = Get-Attributes $Link
  if (($attr -band $ReparsePoint) -eq 0) {
    Fail "'$Link' is a real folder or file, not a link. Leaving it and the worktree untouched; inspect it by hand."
  }
  if (($attr -band [IO.FileAttributes]::Directory) -eq 0) { Fail "'$Link' is a file link, not a folder junction." }
  $item = Get-Item -LiteralPath $Link -Force
  if ($item.LinkType -ne 'Junction' -and $item.LinkType -ne 'SymbolicLink') {
    Fail "'$Link' is a reparse point of type '$($item.LinkType)', not a junction."
  }
  $actual = @($item.Target)[0]
  if (-not $actual -or -not (Test-SamePath $actual $Target)) {
    Fail "'$Link' points at '$actual', not at the expected '$Target'."
  }
}

function Remove-QaLink([string]$Root, [string]$Wt, [string]$LinkName) {
  $link = Get-FullPath (Join-Path $Wt $LinkName)
  $target = Get-FullPath (Join-Path $Root $LinkName)
  if ($null -eq (Get-Attributes $link)) { Step "$LinkName link already absent"; return }
  Assert-QaLink $Wt $link $target
  # Non-recursive: removes the junction itself. On a real folder with content
  # it would fail rather than delete anything inside.
  [IO.Directory]::Delete($link, $false)
  if ($null -ne (Get-Attributes $link)) { Fail "'$link' still exists after removal." }
  if (-not [IO.Directory]::Exists($target)) { Fail "Shared folder '$target' is missing after removing the link." }
  Step "removed link $link (target $target still present)"
}

function Find-ReparsePoints([string]$Dir) {
  $found = New-Object System.Collections.Generic.List[string]
  $pending = New-Object System.Collections.Generic.Stack[string]
  $pending.Push($Dir)
  while ($pending.Count -gt 0) {
    foreach ($entry in [IO.Directory]::EnumerateFileSystemEntries($pending.Pop())) {
      $attr = [IO.File]::GetAttributes($entry)
      if (($attr -band $ReparsePoint) -ne 0) { $found.Add($entry) }
      elseif (($attr -band [IO.FileAttributes]::Directory) -ne 0) { $pending.Push($entry) }
    }
  }
  return $found
}

function Get-ProcessesNaming([string]$Wt) {
  $slashed = $Wt.Replace('\', '/')
  return @(Get-CimInstance Win32_Process | Where-Object {
      $_.CommandLine -and ($_.CommandLine.IndexOf($Wt, $IgnoreCase) -ge 0 -or $_.CommandLine.IndexOf($slashed, $IgnoreCase) -ge 0)
    })
}

function New-QaWorktree([string]$Root, [hashtable]$Target) {
  $wt = $Target.Path
  if ($null -ne (Get-Attributes $wt)) { Fail "'$wt' already exists." }
  foreach ($linkName in $LinkNames) {
    $shared = Join-Path $Root $linkName
    if (-not [IO.Directory]::Exists($shared) -or (Test-IsReparsePoint $shared)) { Fail "Shared folder '$shared' is missing or is a link." }
  }
  if (-not [IO.Directory]::Exists($Target.Root)) { [void][IO.Directory]::CreateDirectory($Target.Root) }

  [void](Invoke-Git @('-C', $Root, 'worktree', 'add', '--no-checkout', '--detach', $wt, 'HEAD'))
  Step "worktree $wt"
  [void](Invoke-Git (@('-C', $wt, 'checkout', 'HEAD', '--') + $CheckoutPaths))
  Step "checked out $($CheckoutPaths -join ', ')"
  foreach ($linkName in $LinkNames) {
    $link = Join-Path $wt $linkName
    $shared = Join-Path $Root $linkName
    [void](New-Item -ItemType Junction -Path $link -Target $shared)
    Assert-QaLink $wt (Get-FullPath $link) (Get-FullPath $shared)
    Step "junction $link -> $shared"
  }
  Write-Host "QA worktree ready: $wt"
}

function Remove-QaWorktree([string]$Root, [hashtable]$Target) {
  $wt = $Target.Path
  $attr = Get-Attributes $wt
  if ($null -eq $attr) { Fail "'$wt' does not exist." }
  if (($attr -band $ReparsePoint) -ne 0) { Fail "'$wt' is itself a link." }
  if (-not [IO.File]::Exists((Join-Path $wt '.git'))) { Fail "'$wt' has no .git file, so it is not a linked worktree." }
  if (-not (Test-IsRegistered $Root $wt)) { Fail "'$wt' is not a worktree registered in '$Root'." }
  Step "verified QA worktree $wt"

  $busy = @(Get-ProcessesNaming $wt)
  if ($busy.Count -gt 0) {
    $list = ($busy | ForEach-Object { "PID $($_.ProcessId) $($_.Name)" }) -join '; '
    Fail "Processes still name this worktree: $list. Stop the ones you started, then re-run. This script never stops processes."
  }
  Step 'no process names this worktree'

  foreach ($linkName in $LinkNames) { Remove-QaLink $Root $wt $linkName }

  $left = @(Find-ReparsePoints $wt)
  if ($left.Count -gt 0) { Fail "Links still inside the worktree: $($left -join '; '). Not removing the worktree." }
  Step 'no links left inside the worktree'

  [void](Invoke-Git @('-C', $Root, 'worktree', 'remove', '--force', $wt))
  if ($null -ne (Get-Attributes $wt)) { Fail "git reported success but '$wt' still exists." }
  if (Test-IsRegistered $Root $wt) { Fail "'$wt' is still registered as a worktree." }
  foreach ($linkName in $LinkNames) {
    $shared = Join-Path $Root $linkName
    if (-not [IO.Directory]::Exists($shared)) { Fail "Shared folder '$shared' is missing." }
  }
  Write-Host "QA worktree removed: $wt"
}

try {
  $root = Resolve-MainRepo $RepoRoot
  $target = Resolve-QaWorktree $root $Name
  if ($Action -eq 'New') { New-QaWorktree $root $target } else { Remove-QaWorktree $root $target }
  exit 0
} catch {
  Write-Host "[STOPPED] $($_.Exception.Message)"
  Write-Host 'Nothing after this step ran. Fix the cause and run the same command again.'
  exit 1
}
