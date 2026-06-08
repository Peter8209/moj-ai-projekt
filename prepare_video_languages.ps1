# ============================================================
# ZEDPERA - Tvorba jazykových verzií video manuálov
# ============================================================
# Spúšťanie z koreňa projektu:
# powershell -ExecutionPolicy Bypass -File scripts/create-localized-video-manuals.ps1
#
# Potrebné:
# 1. ffmpeg musí byť nainštalovaný
# 2. Python musí byť nainštalovaný
# 3. edge-tts:
#    pip install edge-tts
#
# Vstup:
# public/video-manualy/sk/02_profil.mp4
#
# Výstup:
# public/video-manualy/cs/02_profil.mp4
# public/video-manualy/en/02_profil.mp4
# public/video-manualy/de/02_profil.mp4
# public/video-manualy/pl/02_profil.mp4
# public/video-manualy/hu/02_profil.mp4
#
# Poznámka:
# Tento skript vytvorí nový dabing v danom jazyku.
# Ak má video text priamo v obraze, ten sa automaticky nezmení.
# Na to treba mať zdrojový projekt videa alebo použiť titulky/prekrytie.
# ============================================================

$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$VideoRoot = Join-Path $ProjectRoot "public\video-manualy"

$SourceLanguage = "sk"

$Languages = @(
    @{
        Code = "cs"
        Name = "Čeština"
        Voice = "cs-CZ-VlastaNeural"
    },
    @{
        Code = "en"
        Name = "English"
        Voice = "en-US-JennyNeural"
    },
    @{
        Code = "de"
        Name = "Deutsch"
        Voice = "de-DE-KatjaNeural"
    },
    @{
        Code = "pl"
        Name = "Polski"
        Voice = "pl-PL-ZofiaNeural"
    },
    @{
        Code = "hu"
        Name = "Magyar"
        Voice = "hu-HU-NoemiNeural"
    }
)

# ============================================================
# TEXTY PRE VIDEO 02_PROFIL
# Tu dopĺňaš texty pre konkrétne video.
# Neskôr môžeš pridať ďalšie videá rovnakým spôsobom.
# ============================================================

$Manuals = @(
    @{
        FileBase = "02_profil"
        SourceVideo = "02_profil.mp4"

        Texts = @{
            cs = @"
Profil uživatele v aplikaci Zedpera slouží ke správě základních údajů, nastavení účtu a informací o aktivním balíčku.

Po otevření profilu si nejdříve zkontrolujte jméno, e-mail a údaje klienta.

Dále si můžete ověřit informace o svém balíčku, dostupných službách a možnostech využití jednotlivých nástrojů.

V profilu je důležité zkontrolovat také jazyk rozhraní a základní nastavení účtu.

Pokud některé údaje nejsou správné, upravte je a změny uložte.

Správně vyplněný profil pomáhá systému Zedpera lépe pracovat s vašimi projekty, akademickými texty a výstupy.
"@

            en = @"
The user profile in Zedpera is used to manage basic account information, client details, and subscription settings.

After opening the profile section, first check your name, email address, and client information.

You can also review your active package, available services, and the tools included in your plan.

It is important to check the interface language and basic account settings as well.

If any information is incorrect, update it and save the changes.

A properly completed profile helps Zedpera work more accurately with your projects, academic texts, and generated outputs.
"@

            de = @"
Das Benutzerprofil in Zedpera dient zur Verwaltung grundlegender Kontodaten, Kundendaten und Paketinformationen.

Nach dem Öffnen des Profils überprüfen Sie zuerst Ihren Namen, Ihre E-Mail-Adresse und die Kundendaten.

Sie können außerdem Informationen zu Ihrem aktiven Paket, verfügbaren Diensten und enthaltenen Werkzeugen einsehen.

Wichtig ist auch die Kontrolle der Sprache der Benutzeroberfläche und der Grundeinstellungen des Kontos.

Wenn Angaben nicht korrekt sind, aktualisieren Sie diese und speichern Sie die Änderungen.

Ein korrekt ausgefülltes Profil hilft Zedpera, genauer mit Ihren Projekten, akademischen Texten und Ergebnissen zu arbeiten.
"@

            pl = @"
Profil użytkownika w aplikacji Zedpera służy do zarządzania podstawowymi danymi konta, danymi klienta oraz informacjami o pakiecie.

Po otwarciu profilu najpierw sprawdź imię, adres e-mail oraz dane klienta.

Możesz również sprawdzić aktywny pakiet, dostępne usługi oraz narzędzia zawarte w planie.

Ważne jest także sprawdzenie języka interfejsu oraz podstawowych ustawień konta.

Jeżeli niektóre dane są nieprawidłowe, popraw je i zapisz zmiany.

Prawidłowo uzupełniony profil pomaga Zedpera lepiej pracować z projektami, tekstami akademickimi i generowanymi wynikami.
"@

            hu = @"
A Zedpera felhasználói profilja az alapvető fiókadatok, ügyféladatok és csomaginformációk kezelésére szolgál.

A profil megnyitása után először ellenőrizze a nevét, az e-mail-címét és az ügyféladatokat.

Itt megtekintheti az aktív csomagot, az elérhető szolgáltatásokat és a csomagban szereplő eszközöket is.

Fontos ellenőrizni a felület nyelvét és az alapvető fiókbeállításokat.

Ha valamelyik adat nem megfelelő, módosítsa, majd mentse a változtatásokat.

A megfelelően kitöltött profil segíti a Zedpera rendszert abban, hogy pontosabban dolgozzon a projektekkel, akadémiai szövegekkel és generált kimenetekkel.
"@
        }
    }
)

# ============================================================
# KONTROLA PROGRAMOV
# ============================================================

function Test-CommandExists {
    param(
        [string]$Command
    )

    $commandResult = Get-Command $Command -ErrorAction SilentlyContinue

    return $null -ne $commandResult
}

if (!(Test-CommandExists "ffmpeg")) {
    Write-Host "CHYBA: ffmpeg nie je nainštalovaný alebo nie je v PATH." -ForegroundColor Red
    Write-Host "Nainštaluj ffmpeg a spusti skript znova." -ForegroundColor Yellow
    exit 1
}

if (!(Test-CommandExists "python")) {
    Write-Host "CHYBA: Python nie je nainštalovaný alebo nie je v PATH." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Kontrolujem edge-tts..." -ForegroundColor Cyan

python -m edge_tts --help *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "edge-tts nie je dostupné. Inštalujem..." -ForegroundColor Yellow
    python -m pip install edge-tts

    if ($LASTEXITCODE -ne 0) {
        Write-Host "CHYBA: Nepodarilo sa nainštalovať edge-tts." -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# VYTVORENIE PRIEČINKOV
# ============================================================

if (!(Test-Path $VideoRoot)) {
    New-Item -ItemType Directory -Path $VideoRoot -Force | Out-Null
}

foreach ($Language in $Languages) {
    $LanguageFolder = Join-Path $VideoRoot $Language.Code

    if (!(Test-Path $LanguageFolder)) {
        New-Item -ItemType Directory -Path $LanguageFolder -Force | Out-Null
        Write-Host "Vytvorený priečinok: $LanguageFolder" -ForegroundColor Green
    }
}

# ============================================================
# FUNKCIA NA VYTVORENIE DABINGU
# ============================================================

function New-VoiceAudio {
    param(
        [string]$Text,
        [string]$Voice,
        [string]$OutputAudio
    )

    $TempTextFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $TempTextFile -Value $Text -Encoding UTF8

    python -m edge_tts `
        --voice $Voice `
        --file $TempTextFile `
        --write-media $OutputAudio

    Remove-Item $TempTextFile -Force

    if (!(Test-Path $OutputAudio)) {
        throw "Nepodarilo sa vytvoriť audio: $OutputAudio"
    }
}

# ============================================================
# TVORBA VIDEÍ
# ============================================================

foreach ($Manual in $Manuals) {
    $FileBase = $Manual.FileBase
    $SourceVideoPath = Join-Path $VideoRoot "$SourceLanguage\$($Manual.SourceVideo)"

    if (!(Test-Path $SourceVideoPath)) {
        Write-Host "CHÝBA zdrojové slovenské video: $SourceVideoPath" -ForegroundColor Red
        continue
    }

    Write-Host ""
    Write-Host "Spracovávam video: $FileBase" -ForegroundColor Cyan

    foreach ($Language in $Languages) {
        $Code = $Language.Code
        $Voice = $Language.Voice
        $TargetFolder = Join-Path $VideoRoot $Code
        $TargetVideo = Join-Path $TargetFolder "$FileBase.mp4"
        $TargetAudio = Join-Path $TargetFolder "$FileBase.voice.mp3"
        $TargetText = Join-Path $TargetFolder "$FileBase.voice.txt"
        $TargetSrt = Join-Path $TargetFolder "$FileBase.srt"

        $Text = $Manual.Texts[$Code]

        if ([string]::IsNullOrWhiteSpace($Text)) {
            Write-Host "Chýba text pre jazyk $Code pri videu $FileBase" -ForegroundColor Yellow
            continue
        }

        Write-Host " - Vytváram jazyk: $Code ($($Language.Name))" -ForegroundColor White

        Set-Content -Path $TargetText -Value $Text -Encoding UTF8

        New-VoiceAudio -Text $Text -Voice $Voice -OutputAudio $TargetAudio

        # Jednoduché SRT titulky
        $SrtContent = @"
1
00:00:00,000 --> 00:00:30,000
$($Text -replace "`r?`n", " ")

"@

        Set-Content -Path $TargetSrt -Value $SrtContent -Encoding UTF8

        # Nahradenie zvuku vo videu novým dabingom
        # -map 0:v:0 = zoberie obraz z pôvodného videa
        # -map 1:a:0 = zoberie nový dabing
        # -shortest = video skončí podľa kratšej stopy
        ffmpeg `
            -y `
            -i $SourceVideoPath `
            -i $TargetAudio `
            -map 0:v:0 `
            -map 1:a:0 `
            -c:v copy `
            -c:a aac `
            -b:a 192k `
            -shortest `
            $TargetVideo

        if (Test-Path $TargetVideo) {
            Write-Host "   Hotovo: public\video-manualy\$Code\$FileBase.mp4" -ForegroundColor Green
        } else {
            Write-Host "   CHYBA: Video sa nevytvorilo pre jazyk $Code" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Hotovo. Jazykové video manuály sú vytvorené." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Teraz spusti:" -ForegroundColor Cyan
Write-Host "npm run build" -ForegroundColor White
Write-Host ""