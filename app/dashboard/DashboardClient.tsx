'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  BookOpen,
  ClipboardCheck,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  Languages,
  Mail,
  Mic,
  Paintbrush,
  Paperclip,
  Presentation,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

// ================= TYPES =================

type ModuleKey =
  | 'supervisor'
  | 'quality'
  | 'defense'
  | 'translation'
  | 'data'
  | 'planning'
  | 'emails'
  | 'originality';

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';

type AttachedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
};

type SavedProfile = {
  id?: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  businessProblem?: string;
  businessGoal?: string;
  implementation?: string;
  caseStudy?: string;
  reflection?: string;
  sourcesRequirement?: string;
  keywordsList?: string[];
  keywords?: string[];
  savedAt?: string;
  schema?: {
    label?: string;
    description?: string;
    recommendedLength?: string;
    structure?: string[];
    requiredSections?: string[];
    aiInstruction?: string;
  };
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

// ================= CONFIG =================

const defaultAgent: Agent = 'gemini';

const ORIGINALITY_PROTOCOL_STORAGE_KEY =
  'zedpera_originality_protocol_result';

const allowedFileExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.odt',
  '.md',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
];

const allowedFileAccept = allowedFileExtensions.join(',');

const maxFilesCount = 12;
const maxFileSizeMb = 30;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const modules: {
  key: ModuleKey;
  label: string;
  subtitle: string;
  icon: any;
}[] = [
  {
    key: 'supervisor',
    label: 'AI vedúci',
    subtitle: 'Kontrola logiky práce',
    icon: GraduationCap,
  },
  {
    key: 'quality',
    label: 'Audit kvality',
    subtitle: 'Štylistika, logika, citácie',
    icon: ClipboardCheck,
  },
  {
    key: 'defense',
    label: 'Obhajoba',
    subtitle: 'Prezentácia, sprievodný text, otázky a odpovede',
    icon: Presentation,
  },
  {
    key: 'translation',
    label: 'Preklad',
    subtitle: 'Akademický preklad',
    icon: Languages,
  },
  {
    key: 'data',
    label: 'Analýza dát',
    subtitle: 'JASP, SPSS, Excel, CSV',
    icon: Search,
  },
  {
    key: 'planning',
    label: 'Plánovanie',
    subtitle: 'Harmonogram práce',
    icon: BookOpen,
  },
  {
    key: 'emails',
    label: 'Emaily',
    subtitle: 'Formálne správy',
    icon: Mail,
  },
  {
    key: 'originality',
    label: 'Originalita práce',
    subtitle: 'Predbežná kontrola',
    icon: ShieldCheck,
  },
];

// ================= HELPERS =================

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function isAllowedUploadFile(file: File) {
  return allowedFileExtensions.includes(getFileExtension(file.name));
}

function createFileId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeProfile(raw: any): SavedProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.profile && typeof raw.profile === 'object') {
    return {
      ...raw.profile,
      schema: raw.schema || raw.profile.schema,
      workLanguage: raw.workLanguage || raw.profile.workLanguage,
      savedAt: raw.savedAt || raw.generatedAt || raw.profile.savedAt,
    };
  }

  return raw as SavedProfile;
}

function fixEncodingArtifacts(text: string) {
  return String(text || '')
    .replace(/\uFFFD/g, '')
    .replace(/Â/g, '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã½/g, 'ý')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã„/g, 'Ä')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Á')
    .replace(/Ä/g, 'č')
    .replace(/Ä/g, 'ď')
    .replace(/Ä¾/g, 'ľ')
    .replace(/Ä˝/g, 'Ľ')
    .replace(/Äº/g, 'ĺ')
    .replace(/Å¡/g, 'š')
    .replace(/Å /g, 'Š')
    .replace(/Å¾/g, 'ž')
    .replace(/Å½/g, 'Ž')
    .replace(/Å¥/g, 'ť')
    .replace(/Å¤/g, 'Ť')
    .replace(/Åˆ/g, 'ň')
    .replace(/Å‡/g, 'Ň')
    .replace(/Å•/g, 'ŕ')
    .replace(/Å”/g, 'Ŕ')
    .replace(/Å/g, '')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€¦/g, '...')
    .replace(/â€˘/g, '•')
    .replace(/ðŸ“„/g, '')
    .replace(/ðŸ“Š/g, '')
    .replace(/ðŸ“š/g, '')
    .replace(/ðŸ¤–/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function removeBadGeneratedPrefix(text: string) {
  return String(text || '')
    .replace(/^\s*AI\s+vedúci\s+práce\s*[-–—:]*\s*/i, '')
    .replace(/^\s*AI\s+veduci\s+prace\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Audit\s+kvality\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Obhajoba\s*[-–—:]*\s*/i, '')
    .replace(
      /^\s*Prezentácia\s*[-–—:]*\s*(?=Názov práce|Cieľ práce|Úvod|Slide|Snímka)/i,
      '',
    );
}

function cleanAiOutput(text: string) {
  return fixEncodingArtifacts(String(text || ''))
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function cleanFinalOutput(text: string) {
  return removeBadGeneratedPrefix(cleanAiOutput(text))
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function sanitizeFileName(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'zedpera-vystup'
  );
}

function htmlEscape(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createDocHtml(title: string, text: string) {
  const paragraphs = cleanFinalOutput(text)
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<p>&nbsp;</p>';
      return `<p>${htmlEscape(line)}</p>`;
    })
    .join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111827;
      padding: 40px;
    }
    h1 {
      font-size: 20pt;
      margin-bottom: 24px;
    }
    p {
      margin: 0 0 11px 0;
    }
  </style>
</head>
<body>
  <h1>${htmlEscape(title)}</h1>
  ${paragraphs}
</body>
</html>
`;
}

function downloadBlob({
  content,
  fileName,
  mimeType,
}: {
  content: BlobPart;
  fileName: string;
  mimeType: string;
}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function getWorkType(profile: SavedProfile | null) {
  return profile?.schema?.label || profile?.type || 'Neuvedené';
}

function getCitationStyle(profile: SavedProfile | null) {
  return profile?.citation || 'ISO 690';
}

function getWorkLanguage(profile: SavedProfile | null) {
  return profile?.workLanguage || profile?.language || 'slovenčina';
}

function buildProfileBlock(profile: SavedProfile | null) {
  if (!profile) {
    return 'Profil práce nebol vybraný.';
  }

  const keywords =
    profile.keywordsList && profile.keywordsList.length > 0
      ? profile.keywordsList
      : profile.keywords || [];

  return `
Názov práce: ${profile.title || 'Neuvedené'}
Typ práce: ${getWorkType(profile)}
Odbor: ${profile.field || 'Neuvedené'}
Vedúci práce: ${profile.supervisor || 'Neuvedené'}
Citačná norma: ${getCitationStyle(profile)}
Jazyk práce: ${getWorkLanguage(profile)}
Cieľ práce: ${profile.goal || 'Neuvedené'}
Výskumný problém: ${profile.problem || 'Neuvedené'}
Metodológia: ${profile.methodology || 'Neuvedené'}
Výskumné otázky: ${profile.researchQuestions || 'Neuvedené'}
Hypotézy: ${profile.hypotheses || 'Neuvedené'}
Praktická časť: ${profile.practicalPart || 'Neuvedené'}
Kľúčové slová: ${keywords.length ? keywords.join(', ') : 'Neuvedené'}
`.trim();
}

function buildAttachmentBlock(files: AttachedFile[]) {
  if (!files.length) {
    return 'Používateľ nepriložil žiadne súbory.';
  }

  return files
    .map((file, index) => {
      return `${index + 1}. ${file.name} (${file.type || 'neznámy typ'}, ${formatBytes(
        file.size,
      )})`;
    })
    .join('\n');
}

async function readApiErrorResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const data = await res.json();

      return String(
        data?.message ||
          data?.error ||
          data?.detail ||
          data?.details ||
          `API error ${res.status}`,
      );
    }

    const text = await res.text();
    const cleaned = text.trim();

    if (!cleaned) return `API error ${res.status}`;

    if (
      cleaned.startsWith('<!DOCTYPE') ||
      cleaned.startsWith('<html') ||
      cleaned.includes('__next_error__')
    ) {
      return `Server vrátil chybu ${res.status}. Detail pozri v termináli.`;
    }

    return cleaned.length > 1200 ? `${cleaned.slice(0, 1200)}...` : cleaned;
  } catch {
    return `API error ${res.status}`;
  }
}

// ================= PAGE =================

export default function DashboardPage() {
  const agent = defaultAgent;

  const [activeModule, setActiveModule] = useState<ModuleKey>('supervisor');
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  const [input, setInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasText, setCanvasText] = useState('');

  const [qualityMode, setQualityMode] = useState('style');
  const [outputMode, setOutputMode] = useState('detailed');
  const [translationFrom, setTranslationFrom] = useState('Slovenčina');
  const [translationTo, setTranslationTo] = useState('Maďarčina');
  const [emailType, setEmailType] = useState('Email vedúcemu');
  const [emailTone, setEmailTone] = useState('Profesionálny a slušný');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const activeModuleInfo = useMemo(() => {
    return modules.find((item) => item.key === activeModule) || modules[0];
  }, [activeModule]);

  const exportTitle = useMemo(() => {
    return `${activeModuleInfo.label} - ${
      activeProfile?.title || 'výstup'
    }`.trim();
  }, [activeModuleInfo.label, activeProfile]);

  useEffect(() => {
    const activeRaw = localStorage.getItem('active_profile');
    const profileRaw = localStorage.getItem('profile');
    const profilesRaw = localStorage.getItem('profiles_full');

    const active = normalizeProfile(safeJsonParse<any>(activeRaw));
    const profile = normalizeProfile(safeJsonParse<any>(profileRaw));
    const profiles = safeJsonParse<any[]>(profilesRaw);

    if (active) {
      setActiveProfile(active);
      return;
    }

    if (profile) {
      setActiveProfile(profile);
      return;
    }

    if (Array.isArray(profiles) && profiles.length > 0) {
      setActiveProfile(normalizeProfile(profiles[0]));
    }
  }, []);

  useEffect(() => {
    setInput('');
    setSecondaryInput('');
    setResult('');
    setAttachedFiles([]);
    setCanvasText('');
  }, [activeModule]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incomingFiles = Array.from(files);
    const validFiles: AttachedFile[] = [];

    for (const file of incomingFiles) {
      if (!isAllowedUploadFile(file)) {
        alert(
          `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, Word, TXT, RTF, ODT, obrázky, Excel, CSV a PowerPoint.`,
        );
        continue;
      }

      if (file.size > maxFileSizeBytes) {
        alert(
          `Súbor "${file.name}" je príliš veľký. Maximum je ${maxFileSizeMb} MB.`,
        );
        continue;
      }

      validFiles.push({
        id: createFileId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        file,
      });
    }

    if (validFiles.length === 0) return;

    setAttachedFiles((prev) => {
      const next = [...prev];

      for (const file of validFiles) {
        if (next.length >= maxFilesCount) {
          alert(`Môžete priložiť maximálne ${maxFilesCount} súborov.`);
          break;
        }

        const duplicate = next.some(
          (item) => item.name === file.name && item.size === file.size,
        );

        if (!duplicate) next.push(file);
      }

      return next;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const resetCurrentModule = () => {
    setInput('');
    setSecondaryInput('');
    setResult('');
    setCanvasText('');
    setAttachedFiles([]);
  };

  const startDictation = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Diktovanie nie je podporované. Skús Google Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = 'sk-SK';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';

      if (transcript) {
        setInput((prev) => `${prev}${prev.trim() ? ' ' : ''}${transcript}`);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const buildModulePrompt = () => {
    const profileBlock = buildProfileBlock(activeProfile);
    const citationStyle = getCitationStyle(activeProfile);
    const workLanguage = getWorkLanguage(activeProfile);
    const attachmentBlock = buildAttachmentBlock(attachedFiles);

    const baseRules = `
PROFIL PRÁCE:
${profileBlock}

PRILOŽENÉ SÚBORY:
${attachmentBlock}

DÔLEŽITÉ PRAVIDLÁ PRE VŠETKY MODULY:
- Výstup musí byť v jazyku práce: ${workLanguage}.
- Výstup píš ako čistý text vhodný do Wordu.
- Nepíš Markdown znaky ako #, ##, ###, **, *, --- ani kódové bloky.
- Nevkladaj na úplný začiatok technické nadpisy typu „AI vedúci“, „Audit kvality“, „Obhajoba“, „Výstup“ ani názov modulu.
- Začni priamo vecným nadpisom podľa obsahu práce, napríklad názvom práce alebo názvom časti.
- Nepoužívaj poškodené znaky, kódovanie ani nečitateľné symboly.
- Nevymýšľaj zdroje, autorov, DOI, URL, roky ani vydavateľov.
- Ak údaj chýba, napíš: údaj je potrebné overiť.
- Ak sú priložené súbory, najprv over, či súvisia s aktívnym profilom práce.
- Ak priložený dokument pravdepodobne nesúvisí s profilom práce, jasne uveď upozornenie a nepouži ho ako hlavný zdroj.
- Ak príloha súvisí s profilom práce, použi jej extrahovaný text ako hlavný podklad.
- Ak sú priložené súbory, v závere uveď, z ktorých príloh sa čerpalo.
- Citačná norma: ${citationStyle}.
`.trim();

    if (activeModule === 'supervisor') {
      return `
${baseRules}

ÚLOHA:
Správaj sa ako odborný vedúci akademickej práce. Skontroluj logiku, cieľ, výskumný problém, metodológiu, štruktúru, argumentáciu a nadväznosť práce.

TEXT NA KONTROLU:
${input || 'Použi text z priložených dokumentov, ak je dostupný.'}

ZAČIATOK ODPOVEDE:
Začni priamo nadpisom:
Hodnotenie práce: ${activeProfile?.title || 'bez názvu'}

POVINNÁ ŠTRUKTÚRA:
1. Celkové hodnotenie práce
2. Silné stránky
3. Slabé stránky
4. Logika a nadväznosť textu
5. Cieľ, výskumný problém a metodológia
6. Chýbajúce časti alebo nedostatočne rozpracované miesta
7. Konkrétne pripomienky vedúceho práce
8. Odporúčané opravy
9. Otázky na konzultáciu
10. Skóre kvality 0–100
`.trim();
    }

    if (activeModule === 'quality') {
      const modeInstruction =
        qualityMode === 'style'
          ? 'Kontroluj výhradne štylistiku, jazyk, akademickosť, plynulosť viet, nevhodné formulácie a zrozumiteľnosť. Nehodnoť obsah práce.'
          : qualityMode === 'citations'
            ? 'Kontroluj výhradne citácie, odkazy v texte, zoznam literatúry, úplnosť bibliografických údajov a citačnú normu. Nehodnoť celú prácu obsahovo.'
            : qualityMode === 'logic'
              ? 'Kontroluj logiku, nadväznosť, argumentáciu, duplicity a vnútornú súdržnosť textu.'
              : 'Urob celkový audit kvality, ale jasne oddeľ štylistiku, logiku, citácie a metodológiu.';

      return `
${baseRules}

ÚLOHA:
Urob audit kvality akademickej práce.

REŽIM KONTROLY:
${qualityMode}

PRESNÁ INŠTRUKCIA:
${modeInstruction}

TEXT NA KONTROLU:
${input || 'Použi text z priložených dokumentov, ak je dostupný.'}

ZAČIATOK ODPOVEDE:
Začni priamo nadpisom:
${activeProfile?.title || 'Audit kontrolovaného textu'}

POVINNÁ ŠTRUKTÚRA:
1. Stručné hodnotenie
2. Nájdené problémy
3. Konkrétne opravy
4. Ukážky upravených viet
5. Skóre kvality od 0 do 100
6. Odporúčané ďalšie kroky
`.trim();
    }

    if (activeModule === 'defense') {
      return `
${baseRules}

ÚLOHA:
Priprav kompletnú obhajobu práce. Musí vzniknúť aj prezentácia, aj sprievodný text, aj otázky a odpovede.

TEXT / PODKLAD:
${input || 'Použi aktívny profil práce a priložené dokumenty.'}

ZAČIATOK ODPOVEDE:
Začni priamo názvom práce:
${activeProfile?.title || 'Prezentácia k obhajobe práce'}

POVINNÁ ŠTRUKTÚRA VÝSTUPU:
ČASŤ A: PREZENTÁCIA – OBSAH SNÍMOK
ČASŤ B: SPRIEVODNÝ TEXT K PREZENTÁCII
ČASŤ C: OTÁZKY KOMISIE A VZOROVÉ ODPOVEDE
ČASŤ D: SLABÉ MIESTA PRÁCE
ČASŤ E: KRÁTKA VERZIA OBHAJOBY NA 3–5 MINÚT
ČASŤ F: KONTROLA PRÍLOH
`.trim();
    }

    if (activeModule === 'translation') {
      return `
${baseRules}

ÚLOHA:
Prelož text akademicky a prirodzene.

Zo jazyka: ${translationFrom}
Do jazyka: ${translationTo}

TEXT NA PREKLAD:
${input}

ZAČIATOK ODPOVEDE:
Začni priamo preloženým textom.
`.trim();
    }

    if (activeModule === 'data') {
      return `
${baseRules}

ÚLOHA:
Analyzuj dáta a štatistické výstupy.

DÁTA / VÝSTUPY:
${input || 'Použi priložené dátové súbory, ak sú dostupné.'}

OTÁZKA ALEBO CIEĽ ANALÝZY:
${secondaryInput || 'Vysvetli výsledky a priprav akademickú interpretáciu.'}

VÝSTUP:
1. Popis dát
2. Použitá metóda
3. Interpretácia výsledkov
4. Ako to zapísať do práce
5. Upozornenia na chýbajúce údaje
`.trim();
    }

    if (activeModule === 'planning') {
      return `
${baseRules}

ÚLOHA:
Vytvor plán práce bez markdown znakov.

ZADANIE:
${input}

VÝSTUP:
Štruktúrovaný harmonogram, etapy, termíny, úlohy a kontrolné body.
`.trim();
    }

    if (activeModule === 'emails') {
      return `
${baseRules}

ÚLOHA:
Vytvor profesionálny email.

Typ emailu: ${emailType}
Tón: ${emailTone}

ČO MÁ EMAIL RIEŠIŤ:
${input}

VÝSTUP:
Predmet:
Text emailu:
`.trim();
    }

    if (activeModule === 'originality') {
      return `
${baseRules}

ÚLOHA:
Urob predbežnú orientačnú kontrolu originality práce.

TEXT / PODKLAD:
${input || 'Použi priložený súbor práce.'}

VÝSTUP:
1. Orientačné riziko podobnosti
2. Rizikové pasáže
3. Chýbajúce citácie
4. Odporúčania na poctivé dopracovanie
5. Upozornenie, že výsledok nenahrádza oficiálnu kontrolu
`.trim();
    }

    return input;
  };

  const runModule = async () => {
    if (isLoading) return;

    if (!input.trim() && attachedFiles.length === 0) {
      alert('Najprv napíš text alebo nahraj prílohu.');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      if (activeModule === 'originality') {
        /**
         * Nové okno otvoríme okamžite po kliknutí.
         * Ak by sme ho otvárali až po AI odpovedi, prehliadač ho môže zablokovať.
         */
        let protocolWindow: Window | null = null;

        try {
          localStorage.removeItem(ORIGINALITY_PROTOCOL_STORAGE_KEY);

          protocolWindow = window.open(
            '/originality/protocol?loading=1',
            '_blank',
            'width=1300,height=900',
          );
        } catch {
          protocolWindow = null;
        }

        const formData = new FormData();

        formData.append('agent', agent);
        formData.append('text', input);
        formData.append('activeProfile', JSON.stringify(activeProfile || null));

        formData.append(
          'title',
          activeProfile?.title || 'Kontrola originality',
        );
        formData.append('author', '');
        formData.append('authorName', '');
        formData.append('school', '');
        formData.append('faculty', '');
        formData.append('studyProgram', '');
        formData.append('supervisor', activeProfile?.supervisor || '');
        formData.append('workType', getWorkType(activeProfile));
        formData.append('citationStyle', getCitationStyle(activeProfile));
        formData.append('language', getWorkLanguage(activeProfile));
        formData.append('checkAuthenticity', 'true');

        if (activeProfile?.id) {
          formData.append('profileId', activeProfile.id);
        }

        attachedFiles.forEach((item) => {
          formData.append('files', item.file, item.name);
        });

        const res = await fetch('/api/originality', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(await readApiErrorResponse(res));
        }

        const data = await res.json();

        if (!data || data.ok === false) {
          throw new Error(
            data?.message ||
              data?.error ||
              'Kontrola originality nevrátila platný výsledok.',
          );
        }

        /**
         * Dôležité:
         * Ukladáme CELÝ JSON, nie iba textový report.
         * Nová podstránka potom vie vykresliť grafy:
         * - corpuses
         * - dictionaryStats
         * - histogram
         * - documents
         * - passages
         * - plaintext
         */
        localStorage.setItem(
          ORIGINALITY_PROTOCOL_STORAGE_KEY,
          JSON.stringify(data),
        );

        const similarityScore =
          data?.score ??
          data?.similarityRiskScore ??
          data?.similarityScore ??
          data?.percent ??
          data?.overallPercent ??
          'neuvedené';

        const output = cleanFinalOutput(
          [
            'Kontrola originality bola dokončená.',
            '',
            `Percento podobnosti: ${
              typeof similarityScore === 'number'
                ? `${similarityScore.toFixed(2).replace('.', ',')}%`
                : similarityScore
            }`,
            '',
            data?.summary || '',
            '',
            data?.recommendation || '',
            '',
            'Kompletný vizuálny protokol s grafmi, histogramom, tabuľkami a pasážami bol otvorený na novej podstránke.',
          ].join('\n'),
        );

        setResult(output);
        setCanvasText(output);

        const protocolUrl = `/originality/protocol?ts=${Date.now()}`;

        if (protocolWindow && !protocolWindow.closed) {
          protocolWindow.location.href = protocolUrl;
          protocolWindow.focus();
        } else {
          window.open(protocolUrl, '_blank', 'width=1300,height=900');
        }

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);

        return;
      }

      const prompt = buildModulePrompt();

      const apiMessages = [
        {
          role: 'user' as const,
          content: prompt,
        },
      ];

      const formData = new FormData();

      formData.append('agent', agent);
      formData.append('messages', JSON.stringify(apiMessages));
      formData.append('profile', JSON.stringify(activeProfile || null));
      formData.append('useSemanticScholar', 'false');
      formData.append('sourceMode', 'uploaded_documents_first');
      formData.append('validateAttachmentsAgainstProfile', 'true');
      formData.append('requireSourceList', 'true');
      formData.append('allowAiKnowledgeFallback', 'true');
      formData.append('extractUploadedText', 'true');
      formData.append('useExtractedTextFirst', 'true');
      formData.append('returnExtractedFilesInfo', 'true');
      formData.append(
        'contextaCitationFormat',
        activeModule === 'defense' ? 'true' : 'false',
      );

      formData.append(
        'filesMetadata',
        JSON.stringify(
          attachedFiles.map((item) => ({
            name: item.name,
            size: item.size,
            type: item.type,
            extension: getFileExtension(item.name),
          })),
        ),
      );

      if (activeProfile?.id) {
        formData.append('projectId', activeProfile.id);
      }

      attachedFiles.forEach((item) => {
        formData.append('files', item.file, item.name);
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await readApiErrorResponse(res));
      }

      const contentType = res.headers.get('content-type') || '';

      let fullText = '';

      if (contentType.includes('application/json')) {
        const data = await res.json();

        fullText =
          data.output ||
          data.result ||
          data.message ||
          data.text ||
          data.answer ||
          '';

        if (!fullText && data.ok === false) {
          throw new Error(data.message || data.error || 'API nevrátilo výstup.');
        }
      } else {
        if (!res.body) {
          throw new Error('API nevrátilo odpoveď.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          setResult(cleanFinalOutput(fullText));
        }
      }

      const cleaned = cleanFinalOutput(fullText);

      setResult(cleaned);
      setCanvasText(cleaned);

      try {
        localStorage.setItem('latest_generated_work_text', cleaned);
        localStorage.setItem('last_ai_output', cleaned);
      } catch {
        // localStorage nemusí byť dostupný v niektorých režimoch prehliadača
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nastala chyba pri spracovaní požiadavky.';

      setResult(`Chyba:\n${cleanFinalOutput(message)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDoc = () => {
    const text = cleanFinalOutput(canvasText || result);

    if (!text.trim()) return;

    const fileBase = sanitizeFileName(exportTitle);
    const html = createDocHtml(exportTitle, text);

    downloadBlob({
      content: html,
      fileName: `${fileBase}.doc`,
      mimeType: 'application/msword;charset=utf-8',
    });
  };

  const downloadPdf = () => {
    const text = cleanFinalOutput(canvasText || result);

    if (!text.trim()) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      alert('Prehliadač zablokoval otvorenie PDF okna. Povoľ pop-up okná.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(createDocHtml(exportTitle, text));
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const ModuleIcon = activeModuleInfo.icon;

  return (
    <>
      <style jsx global>{`
        html,
        body {
          min-height: 100%;
          background: #050711;
          overflow-x: hidden;
          overflow-y: auto;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 92, 246, 0.7)
            rgba(255, 255, 255, 0.06);
        }

        *::-webkit-scrollbar {
          width: 10px;
          height: 8px;
        }

        *::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }

        *::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.75);
          border-radius: 999px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.95);
        }

        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .no-scrollbar::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
      `}</style>

      <main className="flex min-h-screen w-full bg-[#050711] text-white">
        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-[#050711]/95 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="hidden flex-wrap items-center gap-2 xl:flex">
                {modules.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveModule(item.key)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition ${
                        active
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/30'
                          : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-300">
                Aktívny profil:{' '}
                <span className="font-black text-white">
                  {activeProfile?.title || 'Nie je vybraný'}
                </span>
              </div>
            </div>

            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto xl:hidden">
              {modules.map((item) => {
                const Icon = item.icon;
                const active = activeModule === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveModule(item.key)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black ${
                      active
                        ? 'bg-violet-600 text-white'
                        : 'border border-white/10 bg-white/[0.06] text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-40 md:px-8">
            <div className="mx-auto max-w-6xl">
              <section className="mb-10 rounded-[28px] border border-white/10 bg-[#070a16] p-5 shadow-2xl shadow-black/30">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                      <ModuleIcon className="h-6 w-6" />
                    </div>

                    <div>
                      <h1 className="text-2xl font-black">
                        {activeModuleInfo.label}
                      </h1>

                      <p className="mt-1 text-sm text-slate-400">
                        {activeModuleInfo.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {activeModule === 'quality' && (
                  <div className="mb-4 grid gap-3 md:grid-cols-3">
                    <FieldSelect
                      label="Kontrola"
                      value={qualityMode}
                      onChange={setQualityMode}
                      options={[
                        ['style', 'Štylistika'],
                        ['citations', 'Citácie'],
                        ['logic', 'Logika a nadväznosť'],
                        ['full', 'Celkový audit'],
                      ]}
                    />

                    <FieldSelect
                      label="Výstup"
                      value={outputMode}
                      onChange={setOutputMode}
                      options={[
                        ['detailed', 'Detailná správa'],
                        ['short', 'Stručná správa'],
                      ]}
                    />

                    <FieldSelect
                      label="Citačná norma"
                      value={getCitationStyle(activeProfile)}
                      onChange={() => undefined}
                      options={[
                        [
                          getCitationStyle(activeProfile),
                          getCitationStyle(activeProfile),
                        ],
                      ]}
                    />
                  </div>
                )}

                {activeModule === 'translation' && (
                  <div className="mb-4 grid gap-3 md:grid-cols-3">
                    <FieldSelect
                      label="Z jazyka"
                      value={translationFrom}
                      onChange={setTranslationFrom}
                      options={[
                        ['Slovenčina', 'Slovenčina'],
                        ['Čeština', 'Čeština'],
                        ['Angličtina', 'Angličtina'],
                        ['Nemčina', 'Nemčina'],
                        ['Maďarčina', 'Maďarčina'],
                        ['Poľština', 'Poľština'],
                      ]}
                    />

                    <FieldSelect
                      label="Do jazyka"
                      value={translationTo}
                      onChange={setTranslationTo}
                      options={[
                        ['Slovenčina', 'Slovenčina'],
                        ['Čeština', 'Čeština'],
                        ['Angličtina', 'Angličtina'],
                        ['Nemčina', 'Nemčina'],
                        ['Maďarčina', 'Maďarčina'],
                        ['Poľština', 'Poľština'],
                      ]}
                    />

                    <FieldSelect
                      label="Štýl prekladu"
                      value="Akademický"
                      onChange={() => undefined}
                      options={[['Akademický', 'Akademický']]}
                    />
                  </div>
                )}

                {activeModule === 'emails' && (
                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                    <FieldSelect
                      label="Typ emailu"
                      value={emailType}
                      onChange={setEmailType}
                      options={[
                        ['Email vedúcemu', 'Email vedúcemu'],
                        ['Žiadosť o konzultáciu', 'Žiadosť o konzultáciu'],
                        ['Ospravedlnenie', 'Ospravedlnenie'],
                        ['Doplnenie podkladov', 'Doplnenie podkladov'],
                        [
                          'Všeobecný akademický email',
                          'Všeobecný akademický email',
                        ],
                      ]}
                    />

                    <FieldSelect
                      label="Tón"
                      value={emailTone}
                      onChange={setEmailTone}
                      options={[
                        [
                          'Profesionálny a slušný',
                          'Profesionálny a slušný',
                        ],
                        ['Stručný', 'Stručný'],
                        ['Veľmi formálny', 'Veľmi formálny'],
                      ]}
                    />
                  </div>
                )}

                {activeModule === 'data' && (
                  <div className="mb-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                    Môžeš priložiť dáta alebo výstupy z JASP, SPSS, Excel, CSV
                    alebo vložiť text výsledkov.
                  </div>
                )}

                {(activeModule === 'supervisor' ||
                  activeModule === 'quality' ||
                  activeModule === 'defense' ||
                  activeModule === 'data' ||
                  activeModule === 'originality') && (
                  <FileUploadBox
                    files={attachedFiles}
                    fileInputRef={fileInputRef}
                    onFiles={handleFiles}
                    onRemove={removeFile}
                  />
                )}

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-black text-slate-300">
                    {activeModule === 'translation'
                      ? 'Text na preklad'
                      : activeModule === 'data'
                        ? 'Dáta alebo výsledky'
                        : activeModule === 'emails'
                          ? 'Obsah / zámer emailu'
                          : activeModule === 'defense'
                            ? 'Stručný obsah práce alebo podklady k prezentácii'
                            : activeModule === 'originality'
                              ? 'Text práce alebo nahraj súbor'
                              : 'Zadanie alebo text'}
                  </label>

                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={getPlaceholder(activeModule)}
                    className="min-h-[170px] w-full resize-y rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
                  />
                </div>

                {activeModule === 'data' && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-black text-slate-300">
                      Otázka alebo cieľ analýzy
                    </label>

                    <textarea
                      value={secondaryInput}
                      onChange={(event) =>
                        setSecondaryInput(event.target.value)
                      }
                      placeholder="Napríklad: Interpretuj výsledky deskriptívnej štatistiky a korelácií pre praktickú časť práce."
                      className="min-h-[110px] w-full resize-y rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
                    />
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3 pb-6">
                  <button
                    type="button"
                    onClick={runModule}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        Spracúvam...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {getButtonLabel(activeModule)}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={startDictation}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                      isListening
                        ? 'border-red-400/50 bg-red-500 text-white'
                        : 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                    Diktovať
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanvasOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-300 hover:bg-white/[0.1]"
                  >
                    <Paintbrush className="h-4 w-4" />
                    Canvas
                  </button>

                  <button
                    type="button"
                    onClick={resetCurrentModule}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Vyčistiť
                  </button>
                </div>
              </section>

              {result && (
                <section
                  ref={resultRef}
                  className="mb-40 rounded-[28px] border border-white/10 bg-[#070a16] p-5 shadow-2xl shadow-black/30"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">
                        {getResultTitle(activeModule)}
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Výstup je očistený od poškodených znakov a pripravený na
                        kopírovanie alebo export.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadDoc}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-black text-white hover:bg-white/[0.13]"
                      >
                        <Download className="h-4 w-4" />
                        DOC
                      </button>

                      <button
                        type="button"
                        onClick={downloadPdf}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-black text-white hover:bg-white/[0.13]"
                      >
                        <FileDown className="h-4 w-4" />
                        PDF
                      </button>
                    </div>
                  </div>

                  <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-8 text-slate-200">
                    {result}
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>

        {canvasOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm">
            <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div>
                  <h2 className="text-2xl font-black">Canvas</h2>

                  <p className="text-sm text-slate-400">
                    Tu môžeš upravovať výsledný text a stiahnuť ho ako DOC
                    alebo PDF.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadDoc}
                    disabled={!cleanFinalOutput(canvasText || result).trim()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" />
                    DOC
                  </button>

                  <button
                    type="button"
                    onClick={downloadPdf}
                    disabled={!cleanFinalOutput(canvasText || result).trim()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanvasOpen(false)}
                    className="rounded-2xl bg-red-500/90 p-3 text-white hover:bg-red-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <textarea
                value={canvasText || result}
                onChange={(event) =>
                  setCanvasText(cleanFinalOutput(event.target.value))
                }
                placeholder="Canvas je zatiaľ prázdny."
                className="no-scrollbar flex-1 resize-none bg-[#050711] p-6 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// ================= COMPONENTS =================

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-300">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-[#070a16]">
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileUploadBox({
  files,
  fileInputRef,
  onFiles,
  onRemove,
}: {
  files: AttachedFile[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedFileAccept}
        multiple
        className="hidden"
        onChange={(event) => onFiles(event.target.files)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-200">
            <UploadCloud className="h-4 w-4 text-violet-300" />
            Prílohy
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Nahraj PDF, DOCX, TXT, Excel, CSV, PPT alebo obrázky. Systém má
            overiť, či príloha súvisí s aktívnym profilom práce.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-100 hover:bg-violet-500/20"
        >
          <Paperclip className="h-4 w-4" />
          Priložiť súbor
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs text-violet-100"
            >
              <FileText className="h-4 w-4 shrink-0" />

              <span className="max-w-[240px] truncate font-bold">
                {file.name}
              </span>

              <span className="shrink-0 text-violet-200/70">
                {formatBytes(file.size)}
              </span>

              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="shrink-0 rounded-full p-1 text-violet-100 hover:bg-white/10"
                title="Odstrániť súbor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= TEXTS =================

function getPlaceholder(module: ModuleKey) {
  if (module === 'supervisor') {
    return 'Vlož kapitolu, osnovu alebo problém, ktorý má AI vedúci posúdiť. Výstup nebude začínať textom „AI vedúci“.';
  }

  if (module === 'quality') {
    return 'Vlož text na kontrolu. Výstup bude očistený od poškodených znakov a nebude začínať nadpisom „Audit kvality“.';
  }

  if (module === 'defense') {
    return 'Vlož stručný obsah práce alebo nahraj dokument. Systém pripraví prezentáciu, sprievodný text, otázky komisie a odpovede.';
  }

  if (module === 'translation') {
    return 'Vlož text, ktorý chceš preložiť.';
  }

  if (module === 'data') {
    return 'Vlož tabuľku, výstup z JASP/SPSS/Excel alebo nahraj dátový súbor.';
  }

  if (module === 'planning') {
    return 'Napíš termín odovzdania, stav práce a požadovaný plán.';
  }

  if (module === 'emails') {
    return 'Napíš, čo má email riešiť. Systém vytvorí nový profesionálny email bez zbytočných nezmyslov po hlavnej časti.';
  }

  if (module === 'originality') {
    return 'Vlož text práce alebo nahraj celý dokument práce ako prílohu.';
  }

  return 'Napíš zadanie.';
}

function getButtonLabel(module: ModuleKey) {
  if (module === 'supervisor') return 'Spustiť AI vedúceho';
  if (module === 'quality') return 'Spustiť audit kvality';
  if (module === 'defense') return 'Vytvoriť prezentáciu a obhajobu';
  if (module === 'translation') return 'Preložiť text';
  if (module === 'data') return 'Analyzovať dáta';
  if (module === 'planning') return 'Vytvoriť plán práce';
  if (module === 'emails') return 'Vytvoriť email';
  if (module === 'originality') return 'Skontrolovať originalitu';
  return 'Spustiť';
}

function getResultTitle(module: ModuleKey) {
  if (module === 'supervisor') return 'Hodnotenie práce';
  if (module === 'quality') return 'Výsledok kontroly kvality';
  if (module === 'defense') return 'Prezentácia, sprievodný text a obhajoba';
  if (module === 'translation') return 'Preložený text';
  if (module === 'data') return 'Výsledok analýzy dát';
  if (module === 'planning') return 'Výsledný plán práce';
  if (module === 'emails') return 'Vytvorený email';
  if (module === 'originality') return 'Výsledok kontroly originality';
  return 'Výstup';
}