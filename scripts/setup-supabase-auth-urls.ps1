$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "ZEDPERA - Supabase Auth URL Configuration" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

$envFile = ".env.local"

if (!(Test-Path $envFile)) {
  throw "Subor .env.local neexistuje. Najprv vytvor .env.local v koreni projektu."
}

Write-Host "Nacitavam .env.local..." -ForegroundColor Yellow

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()

  if (!$line) {
    return
  }

  if ($line.StartsWith("#")) {
    return
  }

  $parts = $line -split "=", 2

  if ($parts.Count -ne 2) {
    return
  }

  $name = $parts[0].Trim()
  $value = $parts[1].Trim()

  if (
    ($value.StartsWith('"') -and $value.EndsWith('"')) -or
    ($value.StartsWith("'") -and $value.EndsWith("'"))
  ) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

if (!$env:SUPABASE_ACCESS_TOKEN) {
  throw "Chyba SUPABASE_ACCESS_TOKEN v .env.local. Toto nie je service role key, ale Supabase Management API token."
}

if (!$env:SUPABASE_PROJECT_REF) {
  throw "Chyba SUPABASE_PROJECT_REF v .env.local."
}

$projectRef = $env:SUPABASE_PROJECT_REF
$accessToken = $env:SUPABASE_ACCESS_TOKEN

$uriAllowList = @(
  "http://localhost:3000/reset-password",
  "http://localhost:3000/reset-password?lang=sk",
  "http://localhost:3000/reset-password?lang=cs",
  "http://localhost:3000/reset-password?lang=en",
  "http://localhost:3000/reset-password?lang=de",
  "http://localhost:3000/reset-password?lang=pl",
  "http://localhost:3000/reset-password?lang=hu",

  "https://zedpera.com/reset-password",
  "https://zedpera.com/reset-password?lang=sk",
  "https://zedpera.com/reset-password?lang=cs",
  "https://zedpera.com/reset-password?lang=en",
  "https://zedpera.com/reset-password?lang=de",
  "https://zedpera.com/reset-password?lang=pl",
  "https://zedpera.com/reset-password?lang=hu",

  "https://www.zedpera.com/reset-password",
  "https://www.zedpera.com/reset-password?lang=sk",
  "https://www.zedpera.com/reset-password?lang=cs",
  "https://www.zedpera.com/reset-password?lang=en",
  "https://www.zedpera.com/reset-password?lang=de",
  "https://www.zedpera.com/reset-password?lang=pl",
  "https://www.zedpera.com/reset-password?lang=hu"
) -join ","

$body = @{
  SITE_URL = "https://zedpera.com"
  URI_ALLOW_LIST = $uriAllowList
} | ConvertTo-Json

Write-Host "Nastavujem Supabase Auth redirect URLs..." -ForegroundColor Yellow

$response = Invoke-RestMethod `
  -Method Patch `
  -Uri "https://api.supabase.com/v1/projects/$projectRef/config/auth" `
  -Headers @{
    Authorization = "Bearer $accessToken"
    "Content-Type" = "application/json"
  } `
  -Body $body

Write-Host ""
Write-Host "Hotovo. Supabase Auth redirect URLs boli nastavene." -ForegroundColor Green
Write-Host ""
Write-Host "Skontroluj v Supabase:" -ForegroundColor Cyan
Write-Host "Authentication -> URL Configuration -> Redirect URLs"
Write-Host ""