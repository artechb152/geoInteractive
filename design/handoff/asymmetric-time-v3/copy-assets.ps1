param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$manifestPath = Join-Path $PSScriptRoot 'asset-manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$projectRoot = [IO.Path]::GetFullPath('C:\Users\idog2\Desktop\Programming\Artech\geoInteractive')
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'assets'))
$targetRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'public\assets\lessons\topic01\scene-asymmetric\time-pressure'))
$intendedPrefix = $projectRoot.TrimEnd('\') + '\'
if (-not $targetRoot.StartsWith($intendedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Destination is outside the intended project.'
}

# Validate all inputs and conflicts before copying any file.
$copyPlan = foreach ($asset in $manifest.assets) {
    $filename = [string]$asset.filename
    if ([IO.Path]::GetFileName($filename) -ne $filename) {
        throw "Only a plain filename is allowed: $filename"
    }
    $sourcePath = Join-Path $sourceRoot $filename
    $targetPath = Join-Path $targetRoot $filename
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Missing source: $sourcePath"
    }
    $sourceHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
    if ($sourceHash -ne $asset.sha256) {
        throw "Source hash does not match the manifest: $filename"
    }
    $action = 'copy'
    if (Test-Path -LiteralPath $targetPath) {
        if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
            throw "Destination is not a regular file: $targetPath"
        }
        if ((Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash -ne $sourceHash) {
            throw "Destination exists with different content; keep it and choose a versioned name: $targetPath"
        }
        $action = 'already identical'
    }
    [PSCustomObject]@{ Name = $filename; Source = $sourcePath; Target = $targetPath; Hash = $sourceHash; Action = $action }
}

if ($CheckOnly) {
    $copyPlan | Select-Object Name, Action, Target
    Write-Output 'Preflight passed. No files copied.'
    return
}

New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
foreach ($item in $copyPlan) {
    if ($item.Action -eq 'copy') {
        # File.Copy with overwrite=false also protects against a new file appearing after preflight.
        [IO.File]::Copy($item.Source, $item.Target, $false)
    }
    if ((Get-FileHash -LiteralPath $item.Target -Algorithm SHA256).Hash -ne $item.Hash) {
        throw "Copy verification failed: $($item.Target)"
    }
    Write-Output "$($item.Action): $($item.Target)"
}
Write-Output 'All assets verified. Source files preserved.'
