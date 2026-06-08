const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = process.cwd();
const videoRoot = path.join(projectRoot, 'public', 'video-manualy');

const fileBases = [
  '01_hlavne_menu',
  '02_profil',
  '03_ai_chat',
  '04_moje_prace',
  '05_nova_praca',
  '06_ai_veduci',
  '07_audit_kvality',
  '08_obhajoba',
  '09_preklad',
  '10_analyza_dat',
  '11_planovanie',
  '12_emaily',
  '13_originalita_prace',
  '14_humanizacia_textu',
  '15_zdroje_citacie',
  '16_balicky',
  '17_historia_chatu',
  '18_video_navod',
];

const languages = [
  {
    code: 'cs',
    voice: 'cs-CZ-VlastaNeural',
    title: 'Video navod Zedpera',
    intro:
      'Toto je cesky video navod aplikace Zedpera. Ukazeme si hlavni postup, ovladani systemu a prakticke pouziti dane funkce krok za krokem.',
  },
  {
    code: 'en',
    voice: 'en-US-JennyNeural',
    title: 'Zedpera video guide',
    intro:
      'This is an English Zedpera video guide. We will show the main workflow, system navigation, and practical use of this feature step by step.',
  },
  {
    code: 'de',
    voice: 'de-DE-KatjaNeural',
    title: 'Zedpera Videoanleitung',
    intro:
      'Dies ist eine deutsche Videoanleitung fur Zedpera. Wir zeigen den wichtigsten Ablauf, die Navigation im System und die praktische Nutzung dieser Funktion Schritt fur Schritt.',
  },
  {
    code: 'pl',
    voice: 'pl-PL-ZofiaNeural',
    title: 'Instrukcja wideo Zedpera',
    intro:
      'To jest polska instrukcja wideo aplikacji Zedpera. Pokazemy glowny przebieg pracy, nawigacje w systemie oraz praktyczne uzycie tej funkcji krok po kroku.',
  },
  {
    code: 'hu',
    voice: 'hu-HU-NoemiNeural',
    title: 'Zedpera video utmutato',
    intro:
      'Ez a Zedpera magyar nyelvu video utmutatoja. Bemutatjuk a fo munkafolyamatot, a rendszer hasznalatat es az adott funkcio gyakorlati alkalmazasat lepesrol lepesre.',
  },
];

const manualNames = {
  '01_hlavne_menu': {
    cs: 'Hlavni menu',
    en: 'Main menu',
    de: 'Hauptmenu',
    pl: 'Menu glowne',
    hu: 'Fomenu',
  },
  '02_profil': {
    cs: 'Profil uzivatele',
    en: 'User profile',
    de: 'Benutzerprofil',
    pl: 'Profil uzytkownika',
    hu: 'Felhasznaloi profil',
  },
  '03_ai_chat': {
    cs: 'AI chat',
    en: 'AI chat',
    de: 'AI Chat',
    pl: 'AI chat',
    hu: 'AI chat',
  },
  '04_moje_prace': {
    cs: 'Moje prace',
    en: 'My works',
    de: 'Meine Arbeiten',
    pl: 'Moje prace',
    hu: 'Munkáim',
  },
  '05_nova_praca': {
    cs: 'Nova prace',
    en: 'New work',
    de: 'Neue Arbeit',
    pl: 'Nowa praca',
    hu: 'Uj munka',
  },
  '06_ai_veduci': {
    cs: 'AI skolitel',
    en: 'AI supervisor',
    de: 'KI Betreuer',
    pl: 'Opiekun AI',
    hu: 'AI temavezeto',
  },
  '07_audit_kvality': {
    cs: 'Audit kvality',
    en: 'Quality audit',
    de: 'Qualitatsaudit',
    pl: 'Audyt jakosci',
    hu: 'Minosegi audit',
  },
  '08_obhajoba': {
    cs: 'Obhajoba',
    en: 'Defense',
    de: 'Verteidigung',
    pl: 'Obrona',
    hu: 'Vedes',
  },
  '09_preklad': {
    cs: 'Preklad',
    en: 'Translation',
    de: 'Ubersetzung',
    pl: 'Tlumaczenie',
    hu: 'Forditas',
  },
  '10_analyza_dat': {
    cs: 'Analyza dat',
    en: 'Data analysis',
    de: 'Datenanalyse',
    pl: 'Analiza danych',
    hu: 'Adatelemzes',
  },
  '11_planovanie': {
    cs: 'Planovani',
    en: 'Planning',
    de: 'Planung',
    pl: 'Planowanie',
    hu: 'Tervezes',
  },
  '12_emaily': {
    cs: 'Emaily',
    en: 'Emails',
    de: 'E-Mails',
    pl: 'E-maile',
    hu: 'E-mailek',
  },
  '13_originalita_prace': {
    cs: 'Originalita prace',
    en: 'Work originality',
    de: 'Originalitat der Arbeit',
    pl: 'Oryginalnosc pracy',
    hu: 'A munka eredetisege',
  },
  '14_humanizacia_textu': {
    cs: 'Humanizace textu',
    en: 'Text humanization',
    de: 'Texthumanisierung',
    pl: 'Humanizacja tekstu',
    hu: 'Szoveg humanizalasa',
  },
  '15_zdroje_citacie': {
    cs: 'Zdroje a citace',
    en: 'Sources and citations',
    de: 'Quellen und Zitate',
    pl: 'Zrodla i cytowania',
    hu: 'Forrasok es idezetek',
  },
  '16_balicky': {
    cs: 'Balicky',
    en: 'Packages',
    de: 'Pakete',
    pl: 'Pakiety',
    hu: 'Csomagok',
  },
  '17_historia_chatu': {
    cs: 'Historie chatu',
    en: 'Chat history',
    de: 'Chatverlauf',
    pl: 'Historia czatu',
    hu: 'Csevegesi elozmenyek',
  },
  '18_video_navod': {
    cs: 'Video navody',
    en: 'Video guides',
    de: 'Videoanleitungen',
    pl: 'Instrukcje wideo',
    hu: 'Video utmutatok',
  },
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function commandWorks(command, args) {
  const result = spawnSync(command, args, {
    shell: true,
    stdio: 'ignore',
  });

  return result.status === 0;
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function createVoiceText(fileBase, language) {
  const name =
    manualNames[fileBase]?.[language.code] ||
    fileBase.replace(/_/g, ' ');

  return [
    language.title + ': ' + name + '.',
    language.intro,
    'Tento navod je pripraveny v jazyku: ' + language.code.toUpperCase() + '.',
    'Najprv si pozorne pozrite obrazovku a nasledne vykonajte jednotlive kroky priamo v aplikacii.',
    'Po skonceni videa odporucame otvorit dashboard Zedpera a vyskusat si danu funkciu na vlastnom projekte.',
  ].join('\n\n');
}

function createSrtText(text) {
  const oneLine = String(text || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return '1\n00:00:00,000 --> 00:01:30,000\n' + oneLine + '\n\n';
}

function createVttText(text) {
  const oneLine = String(text || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return 'WEBVTT\n\n00:00:00.000 --> 00:01:30.000\n' + oneLine + '\n\n';
}

function runEdgeTts(textFile, voice, audioFile) {
  return spawnSync(
    'python',
    [
      '-m',
      'edge_tts',
      '--voice',
      voice,
      '--file',
      textFile,
      '--write-media',
      audioFile,
    ],
    {
      shell: true,
      stdio: 'inherit',
    },
  );
}

function createVideoFromSource(sourceVideo, audioFile, targetVideo) {
  return spawnSync(
    'ffmpeg',
    [
      '-y',
      '-stream_loop',
      '-1',
      '-i',
      sourceVideo,
      '-i',
      audioFile,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      targetVideo,
    ],
    {
      shell: true,
      stdio: 'inherit',
    },
  );
}

function createFallbackVideo(audioFile, targetVideo) {
  return spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=0x020617:s=1280x720:r=30',
      '-i',
      audioFile,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      targetVideo,
    ],
    {
      shell: true,
      stdio: 'inherit',
    },
  );
}

function createSilentFallbackVideo(targetVideo) {
  return spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=0x020617:s=1280x720:r=30:d=8',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-shortest',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      targetVideo,
    ],
    {
      shell: true,
      stdio: 'inherit',
    },
  );
}

console.log('');
console.log('============================================================');
console.log('ZEDPERA - vytvorenie vsetkych jazykovych videi');
console.log('============================================================');
console.log('');

ensureDir(videoRoot);
ensureDir(path.join(videoRoot, 'sk'));

for (const language of languages) {
  ensureDir(path.join(videoRoot, language.code));
}

const hasPython = commandWorks('python', ['--version']);
const hasFfmpeg = commandWorks('ffmpeg', ['-version']);

let hasEdgeTts = false;

if (hasPython) {
  hasEdgeTts = commandWorks('python', ['-m', 'edge_tts', '--help']);

  if (!hasEdgeTts) {
    console.log('edge-tts nie je dostupne. Instalujem...');
    spawnSync('python', ['-m', 'pip', 'install', 'edge-tts'], {
      shell: true,
      stdio: 'inherit',
    });

    hasEdgeTts = commandWorks('python', ['-m', 'edge_tts', '--help']);
  }
}

console.log('Kontrola nastrojov:');
console.log('python:   ' + hasPython);
console.log('edge-tts: ' + hasEdgeTts);
console.log('ffmpeg:   ' + hasFfmpeg);
console.log('');

let createdTexts = 0;
let createdAudio = 0;
let createdVideos = 0;
let fallbackVideos = 0;
let missingSkVideos = 0;

for (const fileBase of fileBases) {
  console.log('Spracovanie: ' + fileBase);

  const sourceVideo = path.join(videoRoot, 'sk', fileBase + '.mp4');
  const sourcePng = path.join(videoRoot, 'sk', fileBase + '.png');

  if (!fs.existsSync(sourceVideo)) {
    console.log('  Nie je SK zdroj, vytvorim nahradne video: ' + fileBase);
    missingSkVideos += 1;
  }

  for (const language of languages) {
    const targetFolder = path.join(videoRoot, language.code);
    const targetText = path.join(targetFolder, fileBase + '.voice.txt');
    const targetSrt = path.join(targetFolder, fileBase + '.srt');
    const targetVtt = path.join(targetFolder, fileBase + '.vtt');
    const targetAudio = path.join(targetFolder, fileBase + '.voice.mp3');
    const targetVideo = path.join(targetFolder, fileBase + '.mp4');
    const targetPng = path.join(targetFolder, fileBase + '.png');

    const text = createVoiceText(fileBase, language);

    writeUtf8(targetText, text);
    writeUtf8(targetSrt, createSrtText(text));
    writeUtf8(targetVtt, createVttText(text));
    createdTexts += 3;

    if (fs.existsSync(sourcePng)) {
      fs.copyFileSync(sourcePng, targetPng);
    }

    if (!hasFfmpeg) {
      console.log('  CHYBA: ffmpeg nie je dostupny, MP4 sa neda vytvorit.');
      continue;
    }

    if (hasPython && hasEdgeTts) {
      const tts = runEdgeTts(targetText, language.voice, targetAudio);

      if (tts.status === 0 && fs.existsSync(targetAudio)) {
        createdAudio += 1;

        let result;

        if (fs.existsSync(sourceVideo)) {
          result = createVideoFromSource(sourceVideo, targetAudio, targetVideo);
        } else {
          result = createFallbackVideo(targetAudio, targetVideo);
          fallbackVideos += 1;
        }

        if (result.status === 0 && fs.existsSync(targetVideo)) {
          console.log('  OK MP4: ' + language.code + '/' + fileBase + '.mp4');
          createdVideos += 1;
        } else {
          console.log('  CHYBA: MP4 sa nevytvorilo, skusam tiche fallback video.');
          const silent = createSilentFallbackVideo(targetVideo);

          if (silent.status === 0 && fs.existsSync(targetVideo)) {
            createdVideos += 1;
            fallbackVideos += 1;
          }
        }
      } else {
        console.log('  CHYBA: TTS sa nevytvorilo, vytvaram tiche fallback video.');
        const silent = createSilentFallbackVideo(targetVideo);

        if (silent.status === 0 && fs.existsSync(targetVideo)) {
          createdVideos += 1;
          fallbackVideos += 1;
        }
      }
    } else {
      console.log('  TTS nie je dostupne, vytvaram tiche fallback video.');
      const silent = createSilentFallbackVideo(targetVideo);

      if (silent.status === 0 && fs.existsSync(targetVideo)) {
        createdVideos += 1;
        fallbackVideos += 1;
      }
    }
  }

  console.log('');
}

console.log('============================================================');
console.log('HOTOVO');
console.log('============================================================');
console.log('Vytvorene texty/titulky: ' + createdTexts);
console.log('Vytvorene audio subory: ' + createdAudio);
console.log('Vytvorene MP4 videa: ' + createdVideos);
console.log('Fallback videa: ' + fallbackVideos);
console.log('Chybajuce SK zdrojove videa: ' + missingSkVideos);
console.log('');
console.log('Skontroluj priecinky:');
console.log('public/video-manualy/cs');
console.log('public/video-manualy/en');
console.log('public/video-manualy/de');
console.log('public/video-manualy/pl');
console.log('public/video-manualy/hu');
console.log('');