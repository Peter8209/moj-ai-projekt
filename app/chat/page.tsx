'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Brain,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  History,
  Library,
  Mic,
  MoreHorizontal,
  Paintbrush,
  Paperclip,
  PenLine,
  Send,
  Sparkles,
  UploadCloud,
  User,
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

const allowedFileAccept = allowedFileExtensions.join(',');

const maxFilesCount = 10;
const maxFileSizeMb = 25;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const agents: { key: Agent; label: string }[] = [
  { key: 'openai', label: 'GPT' },
  { key: 'claude', label: 'Claude' },
  { key: 'gemini', label: 'Gemini' },
  { key: 'grok', label: 'Grok' },
  { key: 'mistral', label: 'Mistral' },
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
      'Na základe uloženého profilu práce vytvor profesionálny akademický úvod práce. Najprv použi profil práce, následne akademické zdroje zo Semantic Scholar a na konci vypíš použité zdroje a autorov.',
    icon: PenLine,
  },
  {
    title: 'Napíš mi abstrakt',
    actionTitle: 'Abstrakt',
    instruction:
      'Na základe uloženého profilu práce vytvor akademický abstrakt. Má obsahovať tému, cieľ, problém, metodológiu, výsledky alebo očakávaný prínos práce. Ak sú dostupné zdroje zo Semantic Scholar, zohľadni ich a vypíš použitých autorov.',
    icon: BookOpen,
  },
  {
    title: 'Pomôž mi navrhnúť štruktúru kapitol a podkapitol',
    actionTitle: 'Štruktúra kapitol',
    instruction:
      'Na základe uloženého profilu práce navrhni detailnú štruktúru kapitol a podkapitol. Rešpektuj typ práce, cieľ, metodológiu, praktickú časť a logické akademické členenie. Zohľadni aj akademické zdroje zo Semantic Scholar.',
    icon: GraduationCap,
  },
  {
    title: 'Pomôž mi napísať návrh kapitoly.',
    actionTitle: 'Návrh kapitoly',
    instruction:
      'Na základe uloženého profilu práce priprav návrh kapitoly. Najprv navrhni osnovu kapitoly, potom podkapitoly a následne ukážkový odborný text. Použi akademické zdroje zo Semantic Scholar a na konci vypíš použité zdroje a autorov.',
    icon: FileText,
  },
  {
    title: 'Pomôž mi citovať tento zdroj',
    actionTitle: 'Citovanie zdroja',
    instruction:
      'Na základe uloženého profilu práce a zvoleného citačného štýlu vysvetli, ako správne citovať zdroj v texte a v zozname literatúry. Ak sú priložené súbory, napríklad PDF, Word dokumenty, texty, obrázky, tabuľky alebo prezentácie, zohľadni ich.',
    icon: Library,
  },
  {
    title: 'Pomôž mi prepísať môj text do akademického jazyka.',
    actionTitle: 'Akademický jazyk',
    instruction:
      'Na základe uloženého profilu práce prepíš text do akademického jazyka. Ak text od používateľa chýba, vytvor ukážku odborného formulovania podľa témy práce. Ak sú dostupné zdroje zo Semantic Scholar, použi ich na odborné ukotvenie textu.',
    icon: BookOpen,
  },
];

// ================= FILE HELPERS =================

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function isAllowedUploadFile(file: File) {
  const extension = getFileExtension(file.name);
  return allowedFileExtensions.includes(extension);
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

// ================= TEXT HELPERS =================

function cleanAiOutput(text: string) {
  return text
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
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

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
  return value
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

// ================= PAGE =================

export default function ChatPage() {
  const router = useRouter();

  const [agent, setAgent] = useState<Agent>('gemini');
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isListening, setIsListening] = useState(false);

  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasText, setCanvasText] = useState('');

  const [popup, setPopup] = useState(false);
  const [popupData, setPopupData] = useState<ParsedResult | null>(null);

  const [useSemanticScholar, setUseSemanticScholar] = useState(true);
  const [semanticScholarLimit, setSemanticScholarLimit] = useState(10);
  const [semanticScholarYearFrom, setSemanticScholarYearFrom] = useState(2000);
  const [semanticScholarPdfOnly, setSemanticScholarPdfOnly] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const activeAgentLabel = useMemo(() => {
    return agents.find((item) => item.key === agent)?.label || 'Gemini';
  }, [agent]);

  const exportTitle = useMemo(() => {
    const base = activeProfile?.title || 'Zedpera výstup';
    return base.trim() || 'Zedpera výstup';
  }, [activeProfile]);

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

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id));
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

  const sendPromptToApi = async ({
    visibleUserText,
    apiUserText,
  }: {
    visibleUserText: string;
    apiUserText: string;
  }) => {
    if (isLoading) return;

    const visibleMessage: ChatMessage = {
      role: 'user',
      content: visibleUserText,
    };

    const nextVisibleMessages = [...messages, visibleMessage];

    setMessages(nextVisibleMessages);
    setInput('');
    setIsLoading(true);
    setPopup(false);
    setPopupData(null);

    try {
      const apiMessages = [
        ...messages,
        {
          role: 'user' as const,
          content: apiUserText,
        },
      ];

      const formData = new FormData();

      formData.append('agent', agent);
      formData.append('messages', JSON.stringify(apiMessages));
      formData.append('profile', JSON.stringify(activeProfile || null));

      if (activeProfile?.id) {
        formData.append('projectId', activeProfile.id);
      }

      formData.append('useSemanticScholar', String(useSemanticScholar));
      formData.append('semanticScholarLimit', String(semanticScholarLimit));
      formData.append('semanticScholarYearFrom', String(semanticScholarYearFrom));
      formData.append('semanticScholarPdfOnly', String(semanticScholarPdfOnly));

      attachedFiles.forEach((item) => {
        formData.append('files', item.file, item.name);
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `API error ${res.status}`);
      }

      if (!res.body) {
        throw new Error('API nevrátilo stream odpovede.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let fullText = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

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
        parsed.output.includes('not found for API version');

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
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? `❌ ${error.message}`
              : '❌ Nastala chyba pri komunikácii s API.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || isLoading) return;

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

    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#050711] text-white">
      <div className="mx-auto flex h-screen w-full max-w-[1400px] flex-col px-4 py-4 md:px-8">
        {/* TOP NAV */}
        <header className="shrink-0 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 shadow-lg shadow-violet-700/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>

              <div className="text-left">
                <h1 className="text-2xl font-black tracking-tight">ZEDPERA</h1>
                <p className="text-sm text-slate-400">AI vedúci práce</p>
              </div>
            </button>

            <nav className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={resetChat}
                className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-700/30"
              >
                + Nový chat
              </button>

              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white"
              >
                Chat
              </button>

              <button
                type="button"
                onClick={() => router.push('/history')}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <History className="h-4 w-4" />
                História
              </button>

              <button
                type="button"
                onClick={() => router.push('/sources')}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <Library className="h-4 w-4" />
                Zdroje
              </button>

              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <User className="h-4 w-4" />
                Profil
              </button>

              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="inline-flex items-center gap-1 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
                Viac
              </button>
            </nav>
          </div>
        </header>

        {/* TITLE */}
        <section className="shrink-0 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black tracking-tight">CHAT</h2>

              <p className="mt-2 text-sm text-slate-400">
                Chat čerpá z uloženého profilu práce, vybraného AI agenta,
                pripojených súborov a akademických zdrojov zo Semantic Scholar.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${
                    useSemanticScholar
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-500/30 bg-slate-500/10 text-slate-300'
                  }`}
                >
                  {useSemanticScholar
                    ? 'Semantic Scholar aktívny'
                    : 'Semantic Scholar vypnutý'}
                </span>

                <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-200">
                  Zdroje sa načítajú podľa Profilu práce
                </span>

                <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
                  Limit zdrojov: {semanticScholarLimit}
                </span>

                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">
                  Od roku: {semanticScholarYearFrom}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              Aktívny profil:{' '}
              <span className="font-black text-white">
                {activeProfile?.title || 'Nie je vybraný'}
              </span>
            </div>
          </div>
        </section>

        {/* MAIN CHAT */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl shadow-black/30">
          {/* SCROLLABLE AREA */}
          <div
            ref={scrollAreaRef}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8"
          >
            {messages.length === 0 ? (
              <div className="mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center py-8">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                    <Brain className="h-7 w-7" />
                  </div>

                  <h3 className="text-3xl font-black">Začnite konverzáciu</h3>

                  <p className="mt-2 text-slate-400">
                    Vyberte okno nižšie. AI použije uložený profil práce,
                    pripojené podklady a zdroje zo Semantic Scholar.
                  </p>
                </div>

                <div className="grid w-full gap-4 md:grid-cols-2">
                  {suggestions.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => runSuggestion(item)}
                        disabled={isLoading}
                        className="group flex min-h-[110px] items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.055] p-6 text-left transition hover:border-violet-400/50 hover:bg-white/[0.085] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-600 group-hover:text-white">
                          <Icon className="h-6 w-6" />
                        </span>

                        <span className="text-lg font-black leading-7 text-slate-100">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-5xl space-y-5">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
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
                      🤖 {activeAgentLabel} premýšľa...{' '}
                      {useSemanticScholar
                        ? 'Načítavam aj zdroje zo Semantic Scholar.'
                        : ''}
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* ATTACHED FILES */}
          {attachedFiles.length > 0 && (
            <div className="shrink-0 border-t border-white/10 px-5 py-3 md:px-8">
              <div className="mx-auto max-w-5xl">
                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                  <UploadCloud className="h-4 w-4 text-violet-300" />
                  Pripojené podklady ({attachedFiles.length})
                </div>

                <div className="flex max-h-[92px] flex-wrap gap-2 overflow-y-auto pr-1">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="inline-flex items-center gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-4 py-3 text-sm text-violet-100"
                    >
                      <FileText className="h-4 w-4" />

                      <span className="rounded-lg bg-violet-600/30 px-2 py-1 text-[10px] font-black uppercase text-violet-100">
                        {getFileKindLabel(file.name)}
                      </span>

                      <span className="max-w-[220px] truncate font-bold">
                        {file.name}
                      </span>

                      <span className="text-xs text-violet-200/70">
                        {formatBytes(file.size)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="rounded-full p-1 text-violet-100 hover:bg-white/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* INPUT */}
          <div className="shrink-0 border-t border-white/10 bg-[#070a16] px-5 py-4 md:px-8">
            <div className="mx-auto max-w-5xl rounded-[28px] border border-violet-500/40 bg-violet-950/30 p-4 shadow-2xl shadow-violet-950/40">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Model
                  </span>

                  {agents.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setAgent(item.key)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                        agent === item.key
                          ? 'bg-violet-600 text-white'
                          : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseSemanticScholar((prev) => !prev)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                      useSemanticScholar
                        ? 'bg-emerald-600 text-white'
                        : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                    title="Zapnúť alebo vypnúť automatické akademické zdroje zo Semantic Scholar"
                  >
                    {useSemanticScholar ? 'Semantic Scholar ON' : 'Semantic Scholar OFF'}
                  </button>

                  <select
                    value={semanticScholarLimit}
                    onChange={(event) =>
                      setSemanticScholarLimit(Number(event.target.value))
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-200 outline-none"
                    title="Počet zdrojov zo Semantic Scholar"
                  >
                    <option value={5}>5 zdrojov</option>
                    <option value={10}>10 zdrojov</option>
                    <option value={15}>15 zdrojov</option>
                    <option value={20}>20 zdrojov</option>
                  </select>

                  <select
                    value={semanticScholarYearFrom}
                    onChange={(event) =>
                      setSemanticScholarYearFrom(Number(event.target.value))
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-200 outline-none"
                    title="Rok od ktorého sa majú hľadať zdroje"
                  >
                    <option value={1990}>od 1990</option>
                    <option value={2000}>od 2000</option>
                    <option value={2010}>od 2010</option>
                    <option value={2015}>od 2015</option>
                    <option value={2020}>od 2020</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setSemanticScholarPdfOnly((prev) => !prev)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                      semanticScholarPdfOnly
                        ? 'bg-blue-600 text-white'
                        : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                    title="Ak je zapnuté, API použije iba zdroje s dostupným PDF"
                  >
                    {semanticScholarPdfOnly ? 'PDF only ON' : 'PDF only OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanvasOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <Paintbrush className="h-4 w-4" />
                    Canvas
                  </button>
                </div>
              </div>

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
                  className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                  title="Priložiť súbory: PDF, Word, TXT, obrázky, Excel alebo PowerPoint"
                >
                  <Paperclip className="h-6 w-6" />
                </button>

                <textarea
                  value={input}
                  rows={2}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Napíšte správu..."
                  className="min-h-[54px] flex-1 resize-none bg-transparent px-2 py-3 text-base leading-6 text-white outline-none placeholder:text-slate-500"
                />

                <button
                  type="button"
                  onClick={startDictation}
                  className={`mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
                    isListening
                      ? 'bg-red-500 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Diktovať"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-700/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                    Tu si môžeš upravovať, kopírovať alebo pripravovať výsledný
                    text.
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
                className="flex-1 resize-none bg-[#050711] p-6 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        )}

        {/* POPUP RESULT */}
        {popup && popupData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
              {/* POPUP HEADER */}
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

              {/* POPUP BODY */}
              <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 md:grid-cols-[1fr_380px]">
                <div className="min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-black/10 p-6 pr-4">
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

                <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                    <h3 className="mb-2 font-black">📊 Skóre</h3>

                    <div className="text-4xl font-black text-emerald-400">
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
  );
}