<#
.SYNOPSIS
  Dummy-data test for scripts\qa-worktree.ps1. Touches only folders it creates.

.DESCRIPTION
  Builds a throwaway git repo (path with spaces) with fake node_modules and
  public folders and an external folder, each holding marker files. Runs the
  helper as a child process, as a user would, through: guard rejections, a
  normal New/Remove, a forced link-removal failure (read-only junction), a real
  folder where a link should be, a link to the wrong target, a process that
  still names the worktree, a stray link deep inside the worktree, and a linked
  worktree passed as RepoRoot. After every case it checks the markers by SHA-256.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\qa-worktree.test.ps1 -Root "$env:TEMP\qa-worktree test"
#>
param(
  # Parent folder for the dummy data. Must not exist yet, and must be outside this repo.
  [string]$Root = (Join-Path ([IO.Path]::GetTempPath()) ("qa-worktree test " + [Guid]::NewGuid().ToString('N').Substring(0, 8))),
  [switch]$Keep
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$helper = Join-Path $PSScriptRoot 'qa-worktree.ps1'
$realRepo = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$Root = [IO.Path]::GetFullPath($Root)
if ($Root.StartsWith($realRepo + '\', [StringComparison]::OrdinalIgnoreCase) -or $Root -eq $realRepo) {
  throw "Test root '$Root' is inside the real repo. Use a temp folder."
}
if (Test-Path -LiteralPath $Root) { throw "Test root '$Root' already exists. Pick a new one." }

$script:failures = 0
function Check([bool]$Condition, [string]$What) {
  if ($Condition) { Write-Host "  PASS  $What" } else { Write-Host "  FAIL  $What"; $script:failures++ }
}

function Invoke-Helper([string[]]$HelperArgs) {
  $saved = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { $out = & powershell -NoProfile -ExecutionPolicy Bypass -File $helper @HelperArgs 2>&1 | ForEach-Object { "$_" } }
  finally { $ErrorActionPreference = $saved }
  $code = $LASTEXITCODE
  $out | ForEach-Object { Write-Host "      | $_" }
  return @{ Code = $code; Text = ($out -join "`n") }
}

function Get-Fingerprint([string]$Dir) {
  $base = $Dir.Length + 1
  return (Get-ChildItem -LiteralPath $Dir -Recurse -Force -File |
      Sort-Object FullName |
      ForEach-Object { $_.FullName.Substring($base) + '=' + (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }) -join "`n"
}

function Test-IsLink([string]$Path) {
  $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  return ($null -ne $item) -and ($item.LinkType -eq 'Junction')
}

function Test-Registered([string]$Wt) {
  $list = (& git -C $repo worktree list --porcelain) -join "`n"
  return $list.IndexOf($Wt.Replace('\', '/'), [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Remove-JunctionOnly([string]$Path) { [IO.Directory]::Delete($Path, $false) }

# ---- dummy data ----------------------------------------------------------
$repo = Join-Path $Root 'dummy repo with spaces'
$external = Join-Path $Root 'external target'
$shared = @{
  node_modules = Join-Path $repo 'node_modules'
  public       = Join-Path $repo 'public'
  external     = $external
}
foreach ($d in @("$repo\src\app", "$repo\content", "$($shared.node_modules)\pkg a\lib", "$($shared.public)\embeds", $external)) {
  [void](New-Item -ItemType Directory -Force -Path $d)
}
Set-Content -LiteralPath "$repo\src\app\page.tsx" 'export default function P() { return null }'
Set-Content -LiteralPath "$repo\content\topic.md" '# dummy'
foreach ($f in @('next.config.mjs', 'tailwind.config.ts', 'postcss.config.mjs', 'tsconfig.json', 'next-env.d.ts', 'package.json')) {
  Set-Content -LiteralPath "$repo\$f" "// dummy $f"
}
Set-Content -LiteralPath "$repo\.gitignore" "node_modules/`npublic/`n.claude/"
Set-Content -LiteralPath "$($shared.node_modules)\MARKER.txt" "shared node_modules marker $(Get-Random)"
Set-Content -LiteralPath "$($shared.node_modules)\pkg a\lib\index.js" 'module.exports = 1'
Set-Content -LiteralPath "$($shared.public)\MARKER.txt" "shared public marker $(Get-Random)"
Set-Content -LiteralPath "$($shared.public)\embeds\asset.svg" '<svg/>'
Set-Content -LiteralPath "$external\MARKER.txt" "external marker $(Get-Random)"

& git -C $repo init -q
& git -C $repo -c core.autocrlf=false add -A
& git -C $repo -c user.name=qa-test -c user.email=qa-test@example.invalid commit -q -m dummy
if ($LASTEXITCODE -ne 0) { throw 'git setup of the dummy repo failed' }

$before = @{}
foreach ($k in $shared.Keys) { $before[$k] = Get-Fingerprint $shared[$k] }
function Check-Markers([string]$When) {
  foreach ($k in @('node_modules', 'public', 'external')) {
    Check ((Get-Fingerprint $shared[$k]) -eq $before[$k]) "$k markers unchanged ($When)"
  }
}

$wtRoot = Join-Path $repo '.claude\worktrees'
Write-Host "Dummy repo: $repo"
Write-Host "External target: $external"

# ---- 1. guards -----------------------------------------------------------
Write-Host "`n== 1. Guards reject bad names and paths before touching anything"
foreach ($bad in @('..\..\escape', 'qa-a\b', 'north-task29', 'qa-trailing ', 'C:\Windows')) {
  $r = Invoke-Helper @('-Action', 'Remove', '-Name', $bad, '-RepoRoot', $repo)
  Check ($r.Code -eq 1 -and $r.Text -match 'is not allowed') "name '$bad' rejected"
}
$plain = Join-Path $wtRoot 'qa-not registered'
[void](New-Item -ItemType Directory -Force -Path $plain)
Set-Content -LiteralPath "$plain\keep.txt" 'keep'
$r = Invoke-Helper @('-Action', 'Remove', '-Name', 'qa-not registered', '-RepoRoot', $repo)
Check ($r.Code -eq 1) 'plain folder that is not a registered worktree: stopped'
Check (Test-Path -LiteralPath "$plain\keep.txt") 'plain folder left intact'
Remove-Item -LiteralPath $plain -Recurse -Force

# ---- 2. normal run, spaces, forward-slash RepoRoot -----------------------
Write-Host "`n== 2. New + Remove with spaces in every path (RepoRoot given with forward slashes)"
$name = 'qa-space test'
$wt = Join-Path $wtRoot $name
$r = Invoke-Helper @('-Action', 'New', '-Name', $name, '-RepoRoot', $repo.Replace('\', '/'))
Check ($r.Code -eq 0) 'New exit 0'
Check ((Test-IsLink "$wt\node_modules") -and (Test-IsLink "$wt\public")) 'both links are junctions'
Check (Test-Path -LiteralPath "$wt\node_modules\MARKER.txt") 'shared node_modules visible through the link'
Check (Test-Path -LiteralPath "$wt\src\app\page.tsx") 'src checked out'
[void](New-Item -ItemType Directory -Force -Path "$wt\.next\cache")
Set-Content -LiteralPath "$wt\.next\cache\build.txt" 'fake build output'
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo.Replace('\', '/'))
Check ($r.Code -eq 0) 'Remove exit 0'
Check (-not (Test-Path -LiteralPath $wt)) 'worktree folder gone'
Check (-not (Test-Registered $wt)) 'worktree no longer registered'
Check-Markers 'after normal run'

# ---- 3. forced failure while removing a link -----------------------------
Write-Host "`n== 3. Link removal fails (read-only junction on public): cleanup must stop"
$name = 'qa-fail case'
$wt = Join-Path $wtRoot $name
$r = Invoke-Helper @('-Action', 'New', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 0) 'New exit 0'
$link = Get-Item -LiteralPath "$wt\public" -Force
$link.Attributes = $link.Attributes -bor [IO.FileAttributes]::ReadOnly
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 1) 'Remove exit 1'
Check ($r.Text -match '\[STOPPED\].*denied') 'output shows STOPPED with the access-denied error'
Check ($r.Text -notmatch 'no links left' -and $r.Text -notmatch 'QA worktree removed') 'did not reach the worktree removal step'
Check (Test-IsLink "$wt\public") 'public link still in place'
Check (Test-Path -LiteralPath "$wt\src\app\page.tsx") 'worktree files still in place (git worktree remove did not run)'
Check (Test-Registered $wt) 'worktree still registered'
Check-Markers 'after failed removal'
$link = Get-Item -LiteralPath "$wt\public" -Force
$link.Attributes = $link.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly)
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 0 -and $r.Text -match 'node_modules link already absent') 're-run after fixing the cause: exit 0, resumes where it stopped'
Check (-not (Test-Path -LiteralPath $wt)) 'worktree folder gone'
Check-Markers 'after re-run'

# ---- 4. real folder where a link should be -------------------------------
Write-Host "`n== 4. node_modules is a real folder, not a link"
$name = 'qa-real folder'
$wt = Join-Path $wtRoot $name
[void](Invoke-Helper @('-Action', 'New', '-Name', $name, '-RepoRoot', $repo))
Remove-JunctionOnly "$wt\node_modules"
[void](New-Item -ItemType Directory -Path "$wt\node_modules\pkg")
Set-Content -LiteralPath "$wt\node_modules\pkg\keep.js" 'keep'
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 1 -and $r.Text -match 'not a link') 'Remove stopped: not a link'
Check (Test-Path -LiteralPath "$wt\node_modules\pkg\keep.js") 'real folder content kept'
Check (Test-IsLink "$wt\public") 'public link untouched (stopped before it)'
Check (Test-Registered $wt) 'worktree still registered'
Remove-Item -LiteralPath "$wt\node_modules" -Recurse -Force   # dummy real folder created by this test
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 0) 'Remove exit 0 after the real folder is dealt with'
Check-Markers 'after real-folder case'

# ---- 5. link to an unexpected target -------------------------------------
Write-Host "`n== 5. public points at an external folder instead of the shared one"
$name = 'qa-wrong target'
$wt = Join-Path $wtRoot $name
[void](Invoke-Helper @('-Action', 'New', '-Name', $name, '-RepoRoot', $repo))
Remove-JunctionOnly "$wt\public"
[void](New-Item -ItemType Junction -Path "$wt\public" -Target $external)
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 1 -and $r.Text -match 'not at the expected') 'Remove stopped: unexpected target'
Check (Test-IsLink "$wt\public") 'link to the external folder left in place'
Check (Test-Registered $wt) 'worktree still registered'
Check-Markers 'after wrong-target stop'
Remove-JunctionOnly "$wt\public"
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 0) 'Remove exit 0 after the stray link is removed'
Check-Markers 'after wrong-target case'

# ---- 6. a process still names the worktree -------------------------------
Write-Host "`n== 6. A process started by this test still names the worktree"
$name = 'qa-busy'
$wt = Join-Path $wtRoot $name
[void](Invoke-Helper @('-Action', 'New', '-Name', $name, '-RepoRoot', $repo))
$sleeper = Start-Process -FilePath powershell -PassThru -WindowStyle Hidden `
  -ArgumentList @('-NoProfile', '-Command', "Start-Sleep -Seconds 120 # `"$wt`"")
Start-Sleep -Milliseconds 800
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 1 -and $r.Text -match "PID $($sleeper.Id)") 'Remove stopped and named the PID'
Check ((Test-IsLink "$wt\node_modules") -and (Test-IsLink "$wt\public")) 'both links still in place'
Check (-not $sleeper.HasExited) 'the script did not stop the process'
Stop-Process -Id $sleeper.Id   # the sleeper this test started
$sleeper.WaitForExit()
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 0) 'Remove exit 0 once the process is gone'
Check-Markers 'after busy case'

# ---- 7. an extra link deep inside the worktree ---------------------------
Write-Host "`n== 7. A stray junction deep inside the worktree points at the external folder"
$name = 'qa-stray link'
$wt = Join-Path $wtRoot $name
[void](Invoke-Helper @('-Action', 'New', '-Name', $name, '-RepoRoot', $repo))
[void](New-Item -ItemType Directory -Force -Path "$wt\.next\cache")
[void](New-Item -ItemType Junction -Path "$wt\.next\cache\stray" -Target $external)
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 1 -and $r.Text -match 'Links still inside the worktree') 'Remove stopped before git worktree remove'
Check (Test-IsLink "$wt\.next\cache\stray") 'stray link left in place'
Check (Test-Registered $wt) 'worktree still registered'
Check-Markers 'after stray-link stop'
Remove-JunctionOnly "$wt\.next\cache\stray"
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 0) 'Remove exit 0 after the stray link is removed'
Check-Markers 'after stray-link case'

# ---- 8. RepoRoot must be the main checkout -------------------------------
Write-Host "`n== 8. RepoRoot pointing at a linked worktree is rejected"
$name = 'qa-as root'
$wt = Join-Path $wtRoot $name
[void](Invoke-Helper @('-Action', 'New', '-Name', $name, '-RepoRoot', $repo))
$r = Invoke-Helper @('-Action', 'New', '-Name', 'qa-nested', '-RepoRoot', $wt)
Check ($r.Code -eq 1 -and $r.Text -match 'not the main checkout') 'New with a worktree as RepoRoot: stopped'
Check (-not (Test-Path -LiteralPath "$wt\.claude")) 'nothing created inside that worktree'
$r = Invoke-Helper @('-Action', 'Remove', '-Name', $name, '-RepoRoot', $repo)
Check ($r.Code -eq 0) 'Remove exit 0'
Check-Markers 'after RepoRoot case'

# ---- summary + teardown --------------------------------------------------
Write-Host "`n== Registered worktrees left in the dummy repo"
& git -C $repo worktree list | ForEach-Object { Write-Host "      | $_" }
if ($Keep) {
  Write-Host "Kept dummy data at $Root"
} else {
  # Remove any junction non-recursively first, then the dummy tree.
  $links = @(Get-ChildItem -LiteralPath $Root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue)
  foreach ($l in $links) { Remove-JunctionOnly $l.FullName }
  Remove-Item -LiteralPath $Root -Recurse -Force
}
if ($script:failures -gt 0) { Write-Host "`n$($script:failures) check(s) FAILED"; exit 1 }
Write-Host "`nAll checks passed"
exit 0
