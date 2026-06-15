param(
  [switch]$Force,
  [switch]$OnlyMissing,
  [string]$Langs = "sk,cs,en,de,pl,hu"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$script = Join-Path $ProjectRoot "scripts\_create-localized-video-manuals.cjs"
if (-not (Test-Path $script)) {
  throw "Skript sa nenašiel: $script"
}

$argsList = @($script, "--langs=$Langs")
if ($Force) { $argsList += "--force" }
if ($OnlyMissing) { $argsList += "--only-missing" }

Write-Host "Spúšťam generovanie video manuálov..." -ForegroundColor Cyan
node @argsList
