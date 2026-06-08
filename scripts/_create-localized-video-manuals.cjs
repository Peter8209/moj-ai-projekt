const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = process.cwd();
const videoManualsPath = path.join(projectRoot, 'lib', 'videoManuals.ts');
const videoRoot = path.join(projectRoot, 'public', 'video-manualy');

const languages = [
  { code: 'sk', name: 'Slovencina', voice: 'sk-SK-ViktoriaNeural' },
  { code: 'cs', name: 'Cestina', voice: 'cs-CZ-VlastaNeural' },
  { code: 'en', name: 'English', voice: 'en-US-JennyNeural' },
  { code: 'de', name: 'Deutsch', voice: 'de-DE-KatjaNeural' },
  { code: 'pl', name: 'Polski', voice: 'pl-PL-ZofiaNeural' },
  { code: 'hu', name: 'Magyar', voice: 'hu-HU-NoemiNeural' },
];

const targetLanguages = languages.filter((item) => item.code !== 'sk');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    shell: true,
    stdio: 'ignore',
  });

  return result.status === 0;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStringField(body, fieldName) {
  const regex = new RegExp(fieldName + "\\s*:\\s*'([\\s\\S]*?)'", 'm');
  const match = body.match(regex);
  return match ? normalizeText(match[1]) : '';
}

function extractSteps(body) {
  const stepsBlock = body.match(/steps\s*:\s*\[([\s\S]*?)\]/m);

  if (!stepsBlock) return [];

  const matches = [...stepsBlock[1].matchAll(/'([\s\S]*?)'/g)];

  return matches
    .map((match) => normalizeText(match[1]))
    .filter(Boolean);
}

function extractLanguageBody(segment, languageCode) {
  const startRegex = new RegExp("\\b" + languageCode + "\\s*:\\s*\\{", 'm');
  const startMatch = segment.match(startRegex);

  if (!startMatch || typeof startMatch.index !== 'number') return '';

  const startIndex = startMatch.index + startMatch[0].length;
  let index = startIndex;
  let depth = 1;

  while (index < segment.length) {
    const char = segment[index];

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0) {
      return segment.slice(startIndex, index);
    }

    index += 1;
  }

  return '';
}

function buildVoiceText(segment, languageCode, fileBase) {
  const body = extractLanguageBody(segment, languageCode);

  if (!body) {
    return Zedpera video manual. Missing translation for language . File: .;
  }

  const title = extractStringField(body, 'title');
  const description = extractStringField(body, 'description');
  const category = extractStringField(body, 'category');
  const steps = extractSteps(body);

  const parts = [];

  if (title) parts.push(title);
  if (description) parts.push(description);
  if (category) parts.push(Kategoria: );

  if (steps.length > 0) {
    parts.push('Postup krok za krokom.');

    steps.forEach((step, index) => {
      parts.push(${index + 1}. );
    });
  }

  return parts.join('\n\n').trim() || Zedpera video manual .;
}

function getManualSegments(content) {
  const matches = [...content.matchAll(/fileBase\s*:\s*'([^']+)'/g)];
  const manuals = [];

  for (let i = 0; i < matches.length; i += 1) {
    const fileBase = matches[i][1];
    const start = matches[i].index || 0;
    const end = i < matches.length - 1 ? matches[i + 1].index : content.length;
    const segment = content.slice(start, end);

    manuals.push({ fileBase, segment });
  }

  return manuals;
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function copyIfExists(source, target) {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    return true;
  }

  return false;
}

function createSrtText(text) {
  const oneLine = String(text || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

  return 1
00:00:00,000 --> 00:01:30,000


;
}

function runEdgeTts(textFile, voice, audioFile) {
  return spawnSync('python', [
    '-m',
    'edge_tts',
    '--voice',
    voice,
    '--file',
    textFile,
    '--write-media',
    audioFile,
  ], {
    encoding: 'utf8',
    shell: true,
    stdio: 'inherit',
  });
}

function runFfmpeg(sourceVideo, audioFile, targetVideo) {
  return spawnSync('ffmpeg', [
    '-y',
    '-i',
    sourceVideo,
    '-i',
    audioFile,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    targetVideo,
  ], {
    encoding: 'utf8',
    shell: true,
    stdio: 'inherit',
  });
}

console.log('');
console.log('============================================================');
console.log('ZEDPERA - tvorba jazykovych verzii video manualov');
console.log('============================================================');
console.log('');

if (!fs.existsSync(videoManualsPath)) {
  console.error('CHYBA: Subor lib/videoManuals.ts neexistuje.');
  process.exit(1);
}

ensureDir(videoRoot);

for (const language of languages) {
  ensureDir(path.join(videoRoot, language.code));
}

const hasPython = commandExists('python');
const hasFfmpeg = commandExists('ffmpeg');

let hasEdgeTts = false;

if (hasPython) {
  const edgeCheck = spawnSync('python', ['-m', 'edge_tts', '--help'], {
    encoding: 'utf8',
    shell: true,
    stdio: 'ignore',
  });

  hasEdgeTts = edgeCheck.status === 0;

  if (!hasEdgeTts) {
    console.log('edge-tts nie je dostupne. Skusam instalaciu...');
    const install = spawnSync('python', ['-m', 'pip', 'install', 'edge-tts'], {
      encoding: 'utf8',
      shell: true,
      stdio: 'inherit',
    });

    if (install.status === 0) {
      const secondCheck = spawnSync('python', ['-m', 'edge_tts', '--help'], {
        encoding: 'utf8',
        shell: true,
        stdio: 'ignore',
      });

      hasEdgeTts = secondCheck.status === 0;
    }
  }
}

console.log('Kontrola nastrojov:');
console.log('python:   ' + hasPython);
console.log('edge-tts: ' + hasEdgeTts);
console.log('ffmpeg:   ' + hasFfmpeg);
console.log('');

const content = fs.readFileSync(videoManualsPath, 'utf8');
const manuals = getManualSegments(content);

if (manuals.length === 0) {
  console.error('CHYBA: Nenasli sa ziadne fileBase hodnoty.');
  process.exit(1);
}

console.log('Najdene manualy:');
for (const manual of manuals) {
  console.log(' - ' + manual.fileBase);
}
console.log('');

let textCount = 0;
let videoCount = 0;
let copiedCount = 0;
let missingSourceCount = 0;

for (const manual of manuals) {
  const fileBase = manual.fileBase;

  const skFolder = path.join(videoRoot, 'sk');
  const sourceVideo = path.join(skFolder, fileBase + '.mp4');
  const sourcePng = path.join(skFolder, fileBase + '.png');

  console.log('Spracovanie: ' + fileBase);

  const skText = buildVoiceText(manual.segment, 'sk', fileBase);
  writeUtf8(path.join(skFolder, fileBase + '.voice.txt'), skText);
  writeUtf8(path.join(skFolder, fileBase + '.srt'), createSrtText(skText));
  textCount += 2;

  if (!fs.existsSync(sourceVideo)) {
    console.log('  CHYBA: chyba slovenske video public/video-manualy/sk/' + fileBase + '.mp4');
    missingSourceCount += 1;
  }

  for (const language of targetLanguages) {
    const targetFolder = path.join(videoRoot, language.code);
    const targetText = path.join(targetFolder, fileBase + '.voice.txt');
    const targetSrt = path.join(targetFolder, fileBase + '.srt');
    const targetAudio = path.join(targetFolder, fileBase + '.voice.mp3');
    const targetVideo = path.join(targetFolder, fileBase + '.mp4');
    const targetPng = path.join(targetFolder, fileBase + '.png');

    const voiceText = buildVoiceText(manual.segment, language.code, fileBase);

    writeUtf8(targetText, voiceText);
    writeUtf8(targetSrt, createSrtText(voiceText));
    textCount += 2;

    copyIfExists(sourcePng, targetPng);

    if (!fs.existsSync(sourceVideo)) {
      continue;
    }

    if (hasPython && hasEdgeTts && hasFfmpeg) {
      try {
        const tts = runEdgeTts(targetText, language.voice, targetAudio);

        if (tts.status !== 0 || !fs.existsSync(targetAudio)) {
          throw new Error('edge-tts audio sa nevytvorilo');
        }

        const ffmpeg = runFfmpeg(sourceVideo, targetAudio, targetVideo);

        if (ffmpeg.status !== 0 || !fs.existsSync(targetVideo)) {
          throw new Error('ffmpeg video sa nevytvorilo');
        }

        console.log('  OK video ' + language.code + '/' + fileBase + '.mp4');
        videoCount += 1;
      } catch (error) {
        console.log('  Chyba pri dabingu ' + language.code + '/' + fileBase + ': ' + error.message);
        fs.copyFileSync(sourceVideo, targetVideo);
        console.log('  Skopirovana pracovna verzia ' + language.code + '/' + fileBase + '.mp4');
        copiedCount += 1;
      }
    } else {
      fs.copyFileSync(sourceVideo, targetVideo);
      console.log('  Skopirovana pracovna verzia ' + language.code + '/' + fileBase + '.mp4');
      copiedCount += 1;
    }
  }

  console.log('');
}

console.log('============================================================');
console.log('HOTOVO');
console.log('============================================================');
console.log('Textove subory vytvorene: ' + textCount);
console.log('Jazykove videa s dabingom: ' + videoCount);
console.log('Pracovne kopie videi: ' + copiedCount);
console.log('Chybajuce slovenske zdrojove videa: ' + missingSourceCount);
console.log('');
console.log('Zdrojove SK videa musia byt v: public/video-manualy/sk');
console.log('Nazvy musia sediet s fileBase z lib/videoManuals.ts.');
console.log('');