$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$VideoRoot = Join-Path $ProjectRoot "public\video-manualy"

$Languages = @("sk", "cs", "en", "de", "pl", "hu")

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " ZEDPERA - priprava jazykovych video priecinkov" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path $VideoRoot)) {
    New-Item -ItemType Directory -Path $VideoRoot -Force | Out-Null
    Write-Host "Vytvoreny priecinok: public\video-manualy" -ForegroundColor Green
}

foreach ($Language in $Languages) {
    $Folder = Join-Path $VideoRoot $Language

    if (!(Test-Path $Folder)) {
        New-Item -ItemType Directory -Path $Folder -Force | Out-Null
        Write-Host "Vytvoreny priecinok: public\video-manualy\$Language" -ForegroundColor Green
    }
}

$SourceVideo = Join-Path $ProjectRoot "02_profil.mp4"
$SkVideo = Join-Path $VideoRoot "sk\02_profil.mp4"

if (Test-Path $SourceVideo) {
    Copy-Item $SourceVideo $SkVideo -Force
    Write-Host "Skopirovane slovenske video do: public\video-manualy\sk\02_profil.mp4" -ForegroundColor Green
}

$Texts = @{
    cs = "Profil uzivatele v aplikaci Zedpera slouzi ke sprave zakladnich udaju, nastaveni uctu a informaci o aktivnim balicku. Po otevreni profilu si zkontrolujte jmeno, email a udaje klienta. Dale si muzete overit informace o svem balicku, dostupnych sluzbach a moznostech vyuziti jednotlivych nastroju."
    en = "The user profile in Zedpera is used to manage basic account information, client details, and subscription settings. After opening the profile section, check your name, email address, and client information. You can also review your active package, available services, and the tools included in your plan."
    de = "Das Benutzerprofil in Zedpera dient zur Verwaltung grundlegender Kontodaten, Kundendaten und Paketinformationen. Nach dem Öffnen des Profils überprüfen Sie zuerst Ihren Namen, Ihre E-Mail-Adresse und die Kundendaten. Sie können außerdem Informationen zu Ihrem aktiven Paket und verfügbaren Diensten einsehen."
    pl = "Profil użytkownika w aplikacji Zedpera służy do zarządzania podstawowymi danymi konta, danymi klienta oraz informacjami o pakiecie. Po otwarciu profilu sprawdź imię, adres e-mail oraz dane klienta. Możesz również sprawdzić aktywny pakiet i dostępne usługi."
    hu = "A Zedpera felhasználói profilja az alapvető fiókadatok, ügyféladatok és csomaginformációk kezelésére szolgál. A profil megnyitása után ellenőrizze a nevét, az e-mail-címét és az ügyféladatokat. Itt megtekintheti az aktív csomagot és az elérhető szolgáltatásokat is."
}

foreach ($Language in @("cs", "en", "de", "pl", "hu")) {
    $TargetFolder = Join-Path $VideoRoot $Language
    $TargetText = Join-Path $TargetFolder "02_profil.voice.txt"
    $TargetVideo = Join-Path $TargetFolder "02_profil.mp4"

    [System.IO.File]::WriteAllText(
        $TargetText,
        $Texts[$Language],
        [System.Text.UTF8Encoding]::new($false)
    )

    if (Test-Path $SkVideo) {
        Copy-Item $SkVideo $TargetVideo -Force
        Write-Host "Pracovna video verzia vytvorena: public\video-manualy\$Language\02_profil.mp4" -ForegroundColor Yellow
    }

    Write-Host "Text pre dabing vytvoreny: public\video-manualy\$Language\02_profil.voice.txt" -ForegroundColor Green
}

Write-Host ""
Write-Host "Hotovo." -ForegroundColor Green
Write-Host ""
Write-Host "Dolezite:" -ForegroundColor Yellow
Write-Host "Tento skript pripravil jazykove texty a pracovne videa."
Write-Host "Realny dabing sa vytvori v dalsom kroku cez TTS alebo nahratim finalnych MP4 do jazykovych priecinkov."
Write-Host ""