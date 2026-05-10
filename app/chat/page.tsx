'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  Home,
  Library,
  Mic,
  Paintbrush,
  Paperclip,
  PenLine,
  Send,
  UploadCloud,
  X,
} from 'lucide-react';

// ================= TYPES =================

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';
type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type AttachedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  file: File;
};

type ExtractedFileInfo = {
  name: string;
  type?: string;
  size?: number;
  extension?: string;
  label?: string;
  extractedChars?: number;
  charCount?: number;
  extractedPreview?: string;
  preview?: string;
  status?: string;
  error?: string | null;
  warning?: string | null;
  text?: string;
  content?: string;
  extractedText?: string;
};

type ParsedResult = {
  output: string;
  analysis: string;
  score: string;
  tips: string;
  sources: string;
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

const textExtractableExtensions = [
  '.pdf',
  '.docx',
  '.txt',
  '.rtf',
  '.md',
  '.csv',
];

const allowedFileAccept = allowedFileExtensions.join(',');

const maxFilesCount = 10;
const maxFileSizeMb = 25;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const agents: { key: Agent; label: string }[] = [
  { key: 'openai', label: 'OPEN AI' },
  { key: 'claude', label: 'Claude' },
  { key: 'gemini', label: 'Gemini' },
  { key: 'mistral', label: 'Mistral' },
  { key: 'grok', label: 'Grok' },
];

const suggestions: {
  title: string;
  actionTitle: string;
  instruction: string;
  icon: any;
}[] = [
  {
    title: 'Navrhni mi úvod mojej práce',
    actionTitle: 'Úvod práce',
    instruction:
      'Na základe uloženého profilu práce vytvor profesionálny akademický úvod práce. Najprv použi text extrahovaný z priložených dokumentov. Ak prílohy súvisia s profilom práce, použi ich ako hlavný zdroj. Ak prílohy nesúvisia s profilom práce, jasne to uveď. Na konci vypíš všetky identifikované zdroje, autorov, názvy diel, roky, URL a bibliografické údaje nájdené v priložených dokumentoch. Nevymýšľaj zdroje.',
    icon: PenLine,
  },
  {
    title: 'Napíš mi abstrakt',
    actionTitle: 'Abstrakt',
    instruction:
      'Na základe uloženého profilu práce vytvor akademický abstrakt. Najprv použi text extrahovaný z priložených dokumentov. Má obsahovať tému, cieľ, problém, metodológiu, výsledky alebo očakávaný prínos práce. Na konci vypíš použité zdroje a autorov nájdených v dokumentoch.',
    icon: BookOpen,
  },
  {
    title: 'Navrhni štruktúru kapitol',
    actionTitle: 'Štruktúra kapitol',
    instruction:
      'Na základe uloženého profilu práce navrhni detailnú štruktúru kapitol a podkapitol. Najprv spracuj priložené dokumenty a vychádzaj z extrahovaného textu. Rešpektuj typ práce, cieľ, metodológiu, praktickú časť a logické akademické členenie.',
    icon: GraduationCap,
  },
  {
    title: 'Napíš návrh kapitoly',
    actionTitle: 'Návrh kapitoly',
    instruction:
      'Na základe uloženého profilu práce priprav návrh kapitoly. Najprv použi priložené dokumenty a extrahovaný text z nich. Potom navrhni osnovu kapitoly, podkapitoly a následne ukážkový odborný text. Na konci vypíš použité zdroje a autorov z dokumentov.',
    icon: FileText,
  },
  {
    title: 'Spracuj zdroje a citácie',
    actionTitle: 'Citácie a bibliografia',
    instruction:
      'Správaj sa ako citačná špecialistka. Analyzuj priložené dokumenty a uložený profil práce. Identifikuj všetky zdroje uvedené v dokumentoch, uprav ich podľa citačnej normy z profilu práce, priprav formátované bibliografické záznamy, varianty odkazov v texte, špeciálne prípady, validáciu a finálny zoznam literatúry. Ak chýbajú roky, vydania, autori, DOI alebo URL, označ ich ako údaj je potrebné overiť. Ak sú v dokumente výstupy zo štatistického softvéru JASP, SPSS, Jamovi, R alebo Excel, uveď aj softvér ako zdroj a priprav vetu do metodológie.',
    icon: Library,
  },
  {
    title: 'Prepíš text akademicky',
    actionTitle: 'Akademický jazyk',
    instruction:
      'Na základe uloženého profilu práce prepíš text do akademického jazyka. Ak sú priložené dokumenty, najprv použi ich extrahovaný text ako kontext. Ak text od používateľa chýba, vytvor ukážku odborného formulovania podľa témy práce.',
    icon: BookOpen,
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

function isTextExtractableFile(fileName: string) {
  return textExtractableExtensions.includes(getFileExtension(fileName));
}

function getFileKindLabel(fileName: string) {
  const extension = getFileExtension(fileName);

  if (extension === '.pdf') return 'PDF';

  if (['.doc', '.docx', '.txt', '.rtf', '.odt', '.md'].includes(extension)) {
    return 'Dokument';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return 'Obrázok';
  }

  if (['.xls', '.xlsx', '.csv'].includes(extension)) {
    return 'Tabuľka';
  }

  if (['.ppt', '.pptx'].includes(extension)) {
    return 'Prezentácia';
  }

  return 'Súbor';
}

function cleanAiOutput(text: string) {
  return String(text || '')
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
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function parseSections(text: string): ParsedResult {
  const cleanedText = cleanAiOutput(text);

  const get = (name: string) =>
    cleanedText.split(`=== ${name} ===`)[1]?.split('===')[0]?.trim() || '';

  const output = get('VÝSTUP') || cleanedText;

  return {
    output: cleanAiOutput(output),
    analysis: cleanAiOutput(get('ANALÝZA')),
    score: cleanAiOutput(get('SKÓRE')),
    tips: cleanAiOutput(get('ODPORÚČANIA')),
    sources: cleanAiOutput(get('POUŽITÉ ZDROJE A AUTORI')),
  };
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

function createFileId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function createDocHtml(title: string, text: string) {
  const paragraphs = text
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
      font-size: 22pt;
      margin-bottom: 24px;
    }
    p {
      margin: 0 0 12px 0;
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

async function readApiErrorResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const data = await res.json();

      const message =
        data?.message ||
        data?.error ||
        data?.detail ||
        data?.details ||
        data?.reason ||
        data?.code ||
        `API error ${res.status}`;

      return String(message);
    }

    const text = await res.text();
    const cleaned = text.trim();

    if (!cleaned) return `API error ${res.status}`;

    if (
      cleaned.startsWith('<!DOCTYPE') ||
      cleaned.startsWith('<html') ||
      cleaned.includes('<body') ||
      cleaned.includes('__next_error__')
    ) {
      return `Server vrátil chybu ${res.status}. Detail je v termináli pri trase /api/chat.`;
    }

    return cleaned.length > 1000 ? `${cleaned.slice(0, 1000)}...` : cleaned;
  } catch {
    return `API error ${res.status}`;
  }
}

function buildAttachmentPrompt(files: AttachedFile[]) {
  if (!files.length) {
    return 'Používateľ nepriložil žiadne dokumenty.';
  }

  const lines = files.map((item, index) => {
    const extractable = isTextExtractableFile(item.name)
      ? 'áno – API má extrahovať text'
      : 'nie – súbor je doplnkový alebo v tejto trase nemusí byť textovo extrahovateľný';

    return `${index + 1}. ${item.name} (${getFileKindLabel(
      item.name
    )}, ${formatBytes(item.size)}), extrakcia textu: ${extractable}`;
  });

  return lines.join('\n');
}

function getExtractedCharCount(file: ExtractedFileInfo) {
  return Number(file.extractedChars ?? file.charCount ?? 0);
}

function normalizeExtractedFiles(value: any): ExtractedFileInfo[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const name =
        item.name ||
        item.original_name ||
        item.originalName ||
        item.safe_name ||
        'neznámy súbor';

      const extractedText = String(
        item.extractedText || item.text || item.content || ''
      );

      const charCount = Number(
        item.extractedChars ?? item.charCount ?? extractedText.length ?? 0
      );

      return {
        name,
        type: item.type,
        size: item.size,
        extension: item.extension,
        label: item.label || item.kind,
        extractedChars: charCount,
        charCount,
        extractedPreview:
          item.extractedPreview ||
          item.preview ||
          extractedText.slice(0, 600),
        status:
          item.status ||
          (charCount > 0 ? 'TEXT_EXTRACTED' : 'NO_TEXT_EXTRACTED'),
        error: item.error || null,
        warning: item.warning || null,
        text: extractedText,
        content: extractedText,
        extractedText,
      };
    });
}

// ================= PAGE =================

export default function ChatPage() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);

  const [agent, setAgent] = useState<Agent>('gemini');
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFileInfo[]>([]);
  const [lastExtractionSummary, setLastExtractionSummary] = useState('');

  const [isListening, setIsListening] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);

  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasText, setCanvasText] = useState('');

  const [popup, setPopup] = useState(false);
  const [popupData, setPopupData] = useState<ParsedResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const orderedAgents = useMemo(() => {
    const selected = agents.find((item) => item.key === agent);
    const rest = agents.filter((item) => item.key !== agent);
    return selected ? [selected, ...rest] : agents;
  }, [agent]);

  const activeAgentLabel = useMemo(() => {
    return agents.find((item) => item.key === agent)?.label || 'Gemini';
  }, [agent]);

  const exportTitle = useMemo(() => {
    const base = activeProfile?.title || 'Zedpera výstup';
    return base.trim() || 'Zedpera výstup';
  }, [activeProfile]);

  const canSubmit =
    isMounted && (input.trim().length > 0 || attachedFiles.length > 0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPopup(false);
        setCanvasOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectAgent = (nextAgent: Agent) => {
    setAgent(nextAgent);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content,
      },
    ]);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incomingFiles = Array.from(files);
    const validFiles: AttachedFile[] = [];

    for (const file of incomingFiles) {
      if (!isAllowedUploadFile(file)) {
        alert(
          `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, Word, TXT, RTF, ODT, obrázky, Excel, CSV a PowerPoint.`
        );
        continue;
      }

      if (file.size > maxFileSizeBytes) {
        alert(
          `Súbor "${file.name}" je príliš veľký. Maximálna veľkosť jedného súboru je ${maxFileSizeMb} MB.`
        );
        continue;
      }

      validFiles.push({
        id: createFileId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        file,
      });
    }

    if (validFiles.length === 0) {
      return;
    }

    setAttachedFiles((prev) => {
      const next = [...prev];

      for (const file of validFiles) {
        if (next.length >= maxFilesCount) {
          alert(`Môžete priložiť maximálne ${maxFilesCount} súborov.`);
          break;
        }

        const duplicate = next.some(
          (item) => item.name === file.name && item.size === file.size
        );

        if (!duplicate) {
          next.push(file);
        }
      }

      return next;
    });

    setExtractedFiles([]);
    setLastExtractionSummary('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id));
    setExtractedFiles([]);
    setLastExtractionSummary('');
  };

  const startDictation = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Diktovanie nie je v tomto prehliadači podporované. Skús Google Chrome.'
      );
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

  const getExportText = () => {
    const parts = [
      popupData?.output || canvasText || '',
      popupData?.sources
        ? `\n\nPoužité zdroje a autori\n\n${popupData.sources}`
        : '',
    ];

    return parts.join('').trim();
  };

  const downloadDoc = () => {
    const text = getExportText();
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
    const text = getExportText();
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

  const buildFinalUserPrompt = ({
    apiUserText,
    attachmentPrompt,
  }: {
    apiUserText: string;
    attachmentPrompt: string;
  }) => {
    const citationStyle =
      activeProfile?.citation ||
      activeProfile?.schema?.aiInstruction ||
      'APA 7';

    return `
${apiUserText.trim() || 'Spracuj priložené dokumenty podľa aktívneho profilu práce.'}

AKTÍVNY PROFIL PRÁCE:
- Názov práce: ${activeProfile?.title || 'nezadané'}
- Téma: ${activeProfile?.topic || 'nezadané'}
- Typ práce: ${activeProfile?.type || 'nezadané'}
- Odbor: ${activeProfile?.field || 'nezadané'}
- Vedúci práce: ${activeProfile?.supervisor || 'nezadané'}
- Cieľ práce: ${activeProfile?.goal || 'nezadané'}
- Výskumný problém: ${activeProfile?.problem || 'nezadané'}
- Metodológia: ${activeProfile?.methodology || 'nezadané'}
- Citačná norma: ${citationStyle}

PRILOŽENÉ DOKUMENTY:
${attachmentPrompt}

DÔLEŽITÉ TECHNICKÉ PRAVIDLÁ:
1. Najprv použi technicky extrahovaný text z priložených dokumentov.
2. Ak bol text z PDF/DOCX/TXT/RTF/MD/CSV extrahovaný, odpoveď musí vychádzať primárne z neho.
3. Ak sa extrakcia z PDF nepodarila, nepíš vymyslený obsah dokumentu.
4. Nevymýšľaj autorov, názvy článkov, roky, DOI, URL, vydavateľov, časopisy ani rozsahy strán.
5. Ak údaj v dokumente chýba, napíš: „údaj je potrebné overiť“.
6. Ak dokument obsahuje bibliografické údaje, identifikuj ich a uprav podľa citačnej normy: ${citationStyle}.
7. Ak používateľ žiada zdroje, citácie, literatúru alebo bibliografiu, výstup priprav v štýle Kontexta podľa častí A až D.

POVINNÝ FORMÁT ODPOVEDE PRE ZDROJE, CITÁCIE A BIBLIOGRAFIU:

=== VÝSTUP ===

Na základe poskytnutých dokumentov som pripravil citácie podľa normy ${citationStyle}. Ak niektoré údaje v dokumentoch neboli dostupné, označujem ich ako údaj je potrebné overiť.

### A) Formátované bibliografické záznamy

Vypíš bibliografické záznamy podľa normy ${citationStyle}.

### B) Varianty odkazov v texte

Pre každý identifikovaný zdroj priprav parentetický odkaz, naratívny odkaz a odkaz s konkrétnou stranou.

### C) Špeciálne prípady podľa citačnej normy

Vysvetli špeciálne prípady citovania podľa zvolenej normy.

### D) Validácia a korekcia

Skontroluj chýbajúce DOI, URL, číslo časopisu, skratky časopisov, rozsahy strán, autorov, rok vydania a typ zdroja.

=== ANALÝZA ===
Stručne vysvetli, z ktorých dokumentov boli údaje získané a či bola extrakcia dostatočná.

=== SKÓRE ===
Uveď orientačné skóre kvality extrakcie a spoľahlivosti bibliografických údajov v percentách.

=== ODPORÚČANIA ===
Daj konkrétne odporúčania, ktoré údaje ešte overiť.

=== POUŽITÉ ZDROJE A AUTORI ===
Vypíš všetkých identifikovaných autorov, názvy dokumentov, roky, názvy časopisov, ročníky, čísla, strany, DOI alebo URL nájdené v priložených dokumentoch.
`.trim();
  };

  const sendPromptToApi = async ({
    visibleUserText,
    apiUserText,
  }: {
    visibleUserText: string;
    apiUserText: string;
  }) => {
    if (!isMounted || isLoading) return;

    const userVisibleContent =
      visibleUserText.trim() ||
      `Spracuj priložené dokumenty (${attachedFiles.length})`;

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: userVisibleContent,
      },
    ]);

    setInput('');
    setIsLoading(true);
    setPopup(false);
    setPopupData(null);
    setExtractedFiles([]);
    setLastExtractionSummary('');

    try {
      const attachmentPrompt = buildAttachmentPrompt(attachedFiles);

      const finalApiUserText = buildFinalUserPrompt({
        apiUserText,
        attachmentPrompt,
      });

      const apiMessages = [
        ...messages,
        {
          role: 'user' as const,
          content: finalApiUserText,
        },
      ];

      const formData = new FormData();

      formData.append('agent', agent);
      formData.append('messages', JSON.stringify(apiMessages));
      formData.append('profile', JSON.stringify(activeProfile || null));

      if (activeProfile?.id) {
        formData.append('projectId', activeProfile.id);
      }

      formData.append('useSemanticScholar', 'false');
      formData.append('sourceMode', 'uploaded_documents_first');
      formData.append('validateAttachmentsAgainstProfile', 'true');
      formData.append('requireSourceList', 'true');
      formData.append('allowAiKnowledgeFallback', 'true');
      formData.append('extractUploadedText', 'true');
      formData.append('useExtractedTextFirst', 'true');
      formData.append('returnExtractedFilesInfo', 'true');
      formData.append('contextaCitationFormat', 'true');

      formData.append(
        'filesMetadata',
        JSON.stringify(
          attachedFiles.map((item) => ({
            name: item.name,
            size: item.size,
            type: item.type,
            kind: getFileKindLabel(item.name),
            extractable: isTextExtractableFile(item.name),
            uploadedAt: item.uploadedAt,
          }))
        )
      );

      attachedFiles.forEach((item) => {
        formData.append('files', item.file, item.name);
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorMessage = await readApiErrorResponse(res);

        appendAssistantMessage(
          `❌ API chyba ${res.status}

${errorMessage}

Skús prepnúť model na Gemini alebo OPEN AI. Ak chyba ostane, pozri terminál pri /api/chat.`
        );

        return;
      }

      const contentType = res.headers.get('content-type') || '';

      let fullText = '';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
        },
      ]);

      if (contentType.includes('application/json')) {
        const data = await res.json();

        const apiExtractedFiles = normalizeExtractedFiles(
          data.extractedFiles || data.files || data.uploadedFiles || []
        );

        if (apiExtractedFiles.length > 0) {
          setExtractedFiles(apiExtractedFiles);

          const totalChars = apiExtractedFiles.reduce(
            (sum, file) => sum + getExtractedCharCount(file),
            0
          );

          setLastExtractionSummary(
            `Spracované dokumenty: ${apiExtractedFiles.length}, extrahované znaky spolu: ${totalChars}`
          );
        }

        fullText =
          String(
            data.output ||
              data.result ||
              data.message ||
              data.text ||
              data.answer ||
              ''
          ).trim() || '';

        if (!fullText && data.ok === false) {
          appendAssistantMessage(
            `❌ API nevrátilo výstup.

${data.message || data.error || 'Neznáma chyba API.'}`
          );
          return;
        }

        if (!fullText) {
          fullText =
            'API odpovedalo úspešne, ale nevrátilo žiadny textový výstup.';
        }

        const visibleText = cleanAiOutput(fullText);

        setMessages((prev) => {
          const updated = [...prev];

          updated[updated.length - 1] = {
            role: 'assistant',
            content: visibleText,
          };

          return updated;
        });
      } else {
        if (!res.body) {
          appendAssistantMessage('❌ API nevrátilo stream odpovede.');
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          const visibleText = cleanAiOutput(fullText);

          setMessages((prev) => {
            const updated = [...prev];

            updated[updated.length - 1] = {
              role: 'assistant',
              content: visibleText,
            };

            return updated;
          });
        }
      }

      const cleanedFullText = cleanAiOutput(fullText);
      const parsed = parseSections(cleanedFullText);

      const canvasParts = [
        parsed.output || cleanedFullText,
        parsed.sources
          ? `\n\nPoužité zdroje a autori\n\n${parsed.sources}`
          : '',
      ];

      setCanvasText(canvasParts.join('').trim());

      const looksLikeError =
        parsed.output.includes('AI_APICallError') ||
        parsed.output.includes('API error') ||
        parsed.output.includes('model is not found') ||
        parsed.output.includes('not found for API version') ||
        parsed.output.includes('ORIGINALITY_CHECK_FAILED') ||
        parsed.output.includes('UPLOAD_FAILED') ||
        parsed.output.includes('Forbidden');

      if (
        !looksLikeError &&
        (parsed.output ||
          parsed.analysis ||
          parsed.score ||
          parsed.tips ||
          parsed.sources)
      ) {
        setPopupData(parsed);
        setPopup(true);
      }
    } catch (error) {
      console.error('CHAT SEND ERROR:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Nastala chyba pri komunikácii s API.';

      appendAssistantMessage(
        `❌ Nepodarilo sa spracovať požiadavku.

${message}

Skontroluj terminál pri /api/chat.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();

    if (!isMounted || !canSubmit || isLoading) return;

    await sendPromptToApi({
      visibleUserText: text,
      apiUserText: text,
    });
  };

  const runSuggestion = async (item: (typeof suggestions)[number]) => {
    await sendPromptToApi({
      visibleUserText: item.title,
      apiUserText: item.instruction,
    });
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setCanvasText('');
    setPopup(false);
    setPopupData(null);
    setExtractedFiles([]);
    setLastExtractionSummary('');

    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  };

  return (
    <>
      <style jsx global>{`
        html,
        body {
          overflow: hidden;
          background: #050711;
        }

        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        *::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
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

      <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#050711] text-white">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col overflow-hidden px-4 py-3 md:px-8">
          {/* TOP ACTION BAR */}
          <header className="shrink-0 border-b border-white/10 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-slate-200 transition hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white"
                title="Späť do menu"
              >
                <Home className="h-4 w-4" />
                Menu
              </button>

              <button
                type="button"
                onClick={resetChat}
                className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-700/30 transition hover:-translate-y-0.5 hover:bg-violet-500"
              >
                + Nový chat
              </button>
            </div>
          </header>

          {/* ACTIVE PROFILE BAR */}
          <section className="shrink-0 py-3">
            <div className="flex justify-end">
              <div className="max-w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                Aktívny profil:{' '}
                <span className="font-black text-white">
                  {activeProfile?.title || 'Nie je vybraný'}
                </span>
              </div>
            </div>
          </section>

          {/* CHAT CARD */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#070a16] shadow-2xl shadow-black/30">
            {/* MESSAGES */}
            <div
              ref={scrollAreaRef}
              className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-8"
            >
              {messages.length === 0 ? (
                <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center py-2">
                  <div className="mb-4 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                      <Brain className="h-6 w-6" />
                    </div>

                    <h3 className="text-3xl font-black">
                      Začnite konverzáciu
                    </h3>

                    <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
                      Vyber model, nahraj dokumenty alebo klikni na rýchlu
                      voľbu. Chat okno je pripravené už na úvodnej obrazovke.
                    </p>
                  </div>

                  <div className="grid w-full gap-3 md:grid-cols-3">
                    {suggestions.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => runSuggestion(item)}
                          disabled={!isMounted || isLoading}
                          className="group flex min-h-[76px] items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-white/[0.085] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-600 group-hover:text-white">
                            <Icon className="h-5 w-5" />
                          </span>

                          <span>
                            <span className="block text-sm font-black leading-5 text-slate-100">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/70">
                              Spustiť
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-5xl space-y-5 pb-2">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${
                        message.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-5 py-4 text-sm leading-7 shadow-lg ${
                          message.role === 'user'
                            ? 'bg-violet-600 text-white shadow-violet-700/20'
                            : 'border border-white/10 bg-white/[0.065] text-slate-200 shadow-black/20'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-3xl border border-white/10 bg-white/[0.065] px-5 py-4 text-sm font-bold text-violet-200">
                        🤖 {activeAgentLabel} premýšľa... spracúvam požiadavku.
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* COMPOSER */}
            <div className="shrink-0 border-t border-white/10 bg-[#070a16]/95 px-4 py-3 backdrop-blur md:px-8">
              <div
                className={`mx-auto max-w-6xl rounded-[28px] border p-3 shadow-2xl transition-all duration-300 ${
                  composerFocused
                    ? 'border-violet-400/70 bg-violet-950/45 shadow-violet-800/40'
                    : 'border-violet-500/40 bg-violet-950/30 shadow-violet-950/40'
                }`}
              >
                {attachedFiles.length > 0 && (
                  <div className="no-scrollbar mb-3 max-h-[64px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                      <UploadCloud className="h-4 w-4 text-violet-300" />
                      Pripojené podklady ({attachedFiles.length})
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs text-violet-100"
                        >
                          <FileText className="h-4 w-4 shrink-0" />

                          <span className="rounded-lg bg-violet-600/30 px-2 py-1 text-[10px] font-black uppercase text-violet-100">
                            {getFileKindLabel(file.name)}
                          </span>

                          <span className="max-w-[210px] truncate font-bold">
                            {file.name}
                          </span>

                          <span className="shrink-0 text-[11px] text-violet-200/70">
                            {formatBytes(file.size)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="shrink-0 rounded-full p-1 text-violet-100 transition hover:bg-white/10"
                            title="Odstrániť súbor"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extractedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-100">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-black">Spracované dokumenty:</span>
                    <span>{lastExtractionSummary}</span>
                  </div>
                )}

                {/* MODEL ROW */}
                <div
                  className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2 transition-all duration-300 ${
                    composerFocused
                      ? 'border-violet-400/40 bg-black/25'
                      : 'border-white/10 bg-black/10'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Model
                    </span>

                    {orderedAgents.map((item, index) => {
                      const active = agent === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => selectAgent(item.key)}
                          disabled={!isMounted || isLoading}
                          className={`rounded-2xl px-4 py-2 text-xs font-black transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                            active
                              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-800/40'
                              : 'border border-white/10 bg-white/[0.055] text-slate-300 hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white'
                          }`}
                          title={
                            index === 0 && active
                              ? 'Aktívny model'
                              : `Prepnúť na ${item.label}`
                          }
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCanvasOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-slate-300 transition hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white"
                  >
                    <Paintbrush className="h-4 w-4" />
                    Canvas
                  </button>
                </div>

                {/* INPUT */}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendMessage();
                  }}
                  className="flex items-end gap-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={allowedFileAccept}
                    multiple
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isMounted || isLoading}
                    className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-slate-300 transition hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    title="Priložiť súbory"
                  >
                    <Paperclip className="h-6 w-6" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    rows={2}
                    onFocus={() => setComposerFocused(true)}
                    onBlur={() => setComposerFocused(false)}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={
                      attachedFiles.length > 0
                        ? 'Napíšte správu alebo odošlite len priložené dokumenty...'
                        : 'Napíšte správu...'
                    }
                    className="no-scrollbar min-h-[48px] max-h-[110px] flex-1 resize-none rounded-2xl bg-white/[0.035] px-4 py-3 text-base leading-6 text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.06]"
                  />

                  <button
                    type="button"
                    onClick={startDictation}
                    disabled={!isMounted || isLoading}
                    className={`mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${
                      isListening
                        ? 'border-red-400/50 bg-red-500 text-white shadow-lg shadow-red-700/30'
                        : 'border-white/10 bg-white/[0.055] text-slate-300 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white'
                    }`}
                    title="Diktovať"
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={!isMounted || isLoading || !canSubmit}
                    className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-700/40 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    title="Odoslať"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* CANVAS */}
          {canvasOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm">
              <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div>
                    <h2 className="text-2xl font-black">Canvas</h2>
                    <p className="text-sm text-slate-400">
                      Tu si môžeš upravovať, kopírovať alebo pripravovať
                      výsledný text.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadDoc}
                      disabled={!canvasText.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" />
                      DOC
                    </button>

                    <button
                      type="button"
                      onClick={downloadPdf}
                      disabled={!canvasText.trim()}
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
                  value={canvasText}
                  onChange={(event) => setCanvasText(event.target.value)}
                  placeholder="Canvas je zatiaľ prázdny. Po odpovedi AI sa sem vloží posledný výstup."
                  className="no-scrollbar flex-1 resize-none bg-[#050711] p-6 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          {/* POPUP RESULT */}
          {popup && popupData && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#070a16] px-6 py-4">
                  <div>
                    <h2 className="text-2xl font-black">📄 Výstup</h2>
                    <p className="text-sm text-slate-400">
                      Výsledok môžeš zavrieť, otvoriť v Canvase alebo stiahnuť.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadDoc}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
                    >
                      <Download className="h-4 w-4" />
                      Stiahnuť DOC
                    </button>

                    <button
                      type="button"
                      onClick={downloadPdf}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
                    >
                      <FileDown className="h-4 w-4" />
                      Stiahnuť PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const canvasParts = [
                          popupData.output || '',
                          popupData.sources
                            ? `\n\nPoužité zdroje a autori\n\n${popupData.sources}`
                            : '',
                        ];

                        setCanvasText(canvasParts.join('').trim());
                        setCanvasOpen(true);
                        setPopup(false);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-500"
                    >
                      <Paintbrush className="h-4 w-4" />
                      Canvas
                    </button>

                    <button
                      type="button"
                      onClick={() => setPopup(false)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-400"
                    >
                      <X className="h-4 w-4" />
                      Zavrieť
                    </button>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 md:grid-cols-[1fr_360px]">
                  <div className="no-scrollbar min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-black/10 p-6 pr-4">
                    <div className="whitespace-pre-wrap text-sm leading-8 text-slate-300">
                      {popupData.output}
                    </div>

                    {popupData.sources && (
                      <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                        <h3 className="mb-3 font-black text-emerald-200">
                          📚 Použité zdroje a autori
                        </h3>

                        <div className="whitespace-pre-wrap text-sm leading-7 text-emerald-50/90">
                          {popupData.sources}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="no-scrollbar min-h-0 space-y-4 overflow-y-auto pr-1">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">📊 Skóre</h3>

                      <div className="text-3xl font-black text-emerald-400">
                        {popupData.score || '—'}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">⚠️ Analýza</h3>

                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {popupData.analysis || 'Bez analýzy.'}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">✏️ Odporúčania</h3>

                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {popupData.tips || 'Bez odporúčaní.'}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                      <h3 className="mb-2 font-black text-emerald-200">
                        📚 Zdroje
                      </h3>

                      <div className="whitespace-pre-wrap text-sm leading-6 text-emerald-50/90">
                        {popupData.sources ||
                          'Zdroje neboli v odpovedi samostatne vypísané.'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPopup(false)}
                      className="w-full rounded-2xl bg-red-500 py-3 font-black text-white hover:bg-red-400"
                    >
                      Zavrieť okno
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}