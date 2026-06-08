$ErrorActionPreference = "Stop"

Set-Location "C:\ZEDPERA\moj-ai-projekt"

node "scripts\_create-localized-video-manuals.cjs"

if ($LASTEXITCODE -ne 0) {
  throw "Node skript skoncil s chybou."
}