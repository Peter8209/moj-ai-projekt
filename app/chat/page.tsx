'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Brain,
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
};

type ParsedResult = {
  output: string;
  analysis: string;
  score: string;
  tips: string;
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

const agents: {
  key: Agent;
  label: string;
}[] = [
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
    title: 'Navrhni mi úvod mé práce',
    actionTitle: 'Úvod práce',
    instruction:
      'Na základe uloženého profilu práce vytvor profesionálny akademický úvod práce. Úvod má vychádzať výlučne z profilu práce, témy, cieľa, odboru, typu práce, metodológie, anotácie a ďalších dostupných údajov. Úvod má byť plynulý, odborný, vhodný pre záverečnú prácu a bez zbytočných všeobecných fráz.',
    icon: PenLine,
  },
  {
    title: 'Napiš mi abstrakt',
    actionTitle: 'Abstrakt',
    instruction:
      'Na základe uloženého profilu práce vytvor abstrakt. Abstrakt má obsahovať tému, cieľ práce, problém, metodológiu, očakávané výsledky alebo prínos práce. Text má byť akademický, stručný, vecný a pripravený na vloženie do práce.',
    icon: BookOpen,
  },
  {
    title: 'Brainstormuj se mnou strukturu kapitol a podkapitol',
    actionTitle: 'Štruktúra kapitol',
    instruction:
      'Na základe uloženého profilu práce navrhni detailnú štruktúru kapitol a podkapitol. Štruktúra musí rešpektovať typ práce, odporúčaný rozsah, cieľ, metodológiu, praktickú časť a citačný štýl. Ku každej kapitole doplň krátke vysvetlenie, čo má obsahovať.',
    icon: GraduationCap,
  },
  {
    title: 'Teď mi pomůžeš napsat návrh kapitoly.',
    actionTitle: 'Návrh kapitoly',
    instruction:
      'Na základe uloženého profilu práce priprav návrh kapitoly. Najprv navrhni vhodnú kapitolu, potom jej podkapitoly a následne napíš ukážkový akademický text. Text musí zodpovedať typu práce, odboru, cieľu a metodológii.',
    icon: FileText,
  },
  {
    title: 'Pomoz mi citovat tento zdroj',
    actionTitle: 'Citovanie zdroja',
    instruction:
      'Na základe uloženého profilu práce a zvoleného citačného štýlu vysvetli, ako správne citovať zdroje v texte a v zozname literatúry. Ak sú priložené PDF dokumenty, zohľadni ich ako potenciálne zdroje a upozorni, že bibliografické údaje treba skontrolovať.',
    icon: Library,
  },
  {
    title: 'Pomoz mi přepsat můj text do akademického jazyka.',
    actionTitle: 'Akademické preformulovanie',
    instruction:
      'Na základe uloženého profilu práce priprav akademický štýl písania pre túto prácu. Ak používateľ doplní text, prepíš ho odborne. Ak text nedoplnil, vytvor ukážku akademicky formulovaného odseku podľa témy, cieľa a odboru práce.',
    icon: BookOpen,
  },
];

// ================= HELPERS =================

function parseSections(text: string): ParsedResult {
  const get = (name: string) =>
    text.split(`=== ${name} ===`)[1]?.split('===')[0]?.trim() || '';

  return {
    output: get('VÝSTUP') || text,
    analysis: get('ANALÝZA'),
    score: get('SKÓRE'),
    tips: get('ODPORÚČANIA'),
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
      interfaceLanguage: raw.interfaceLanguage,
      workLanguage: raw.workLanguage || raw.profile.workLanguage,
      savedAt: raw.savedAt || raw.generatedAt || raw.profile.savedAt,
    };
  }

  return raw as SavedProfile;
}

function profileToPrompt(profile: SavedProfile | null) {
  if (!profile) {
    return `
ULOŽENÝ PROFIL PRÁCE:
Profil práce nie je dostupný. Používateľ pravdepodobne ešte neuložil profil práce.
V odpovedi ho upozorni, že pre presnejší výstup má najprv vytvoriť a uložiť profil práce v sekcii Profil práce.
`;
  }

  const keywords =
    profile.keywordsList && profile.keywordsList.length > 0
      ? profile.keywordsList
      : profile.keywords || [];

  return `
ULOŽENÝ PROFIL PRÁCE:
Názov práce: ${profile.title || 'Neuvedené'}
Téma práce: ${profile.topic || 'Neuvedené'}
Typ práce: ${profile.schema?.label || profile.type || 'Neuvedené'}
Odbornosť / úroveň: ${profile.level || 'Neuvedené'}
Odbor / predmet / oblasť: ${profile.field || 'Neuvedené'}
Vedúci práce / školiteľ: ${profile.supervisor || 'Neuvedené'}
Jazyk rozhrania: ${profile.language || 'Neuvedené'}
Jazyk výslednej práce: ${profile.workLanguage || profile.language || 'SK'}
Citačná norma: ${profile.citation || 'Neuvedené'}
Odporúčaný rozsah: ${profile.schema?.recommendedLength || 'Neuvedené'}

Anotácia:
${profile.annotation || 'Neuvedené'}

Cieľ práce:
${profile.goal || 'Neuvedené'}

Výskumný / odborný problém:
${profile.problem || 'Neuvedené'}

Metodológia:
${profile.methodology || 'Neuvedené'}

Hypotézy:
${profile.hypotheses || 'Neuvedené'}

Výskumné otázky:
${profile.researchQuestions || 'Neuvedené'}

Praktická / analytická časť:
${profile.practicalPart || 'Neuvedené'}

Vedecký / odborný prínos:
${profile.scientificContribution || 'Neuvedené'}

Firemný / manažérsky problém:
${profile.businessProblem || 'Neuvedené'}

Manažérsky cieľ:
${profile.businessGoal || 'Neuvedené'}

Implementácia:
${profile.implementation || 'Neuvedené'}

Prípadová štúdia / organizácia:
${profile.caseStudy || 'Neuvedené'}

Reflexia:
${profile.reflection || 'Neuvedené'}

Požiadavky na zdroje:
${profile.sourcesRequirement || 'Neuvedené'}

Kľúčové slová:
${keywords.length > 0 ? keywords.join(', ') : 'Neuvedené'}

Štruktúra práce podľa šablóny:
${
  profile.schema?.structure?.length
    ? profile.schema.structure.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : 'Neuvedené'
}

Povinné časti:
${
  profile.schema?.requiredSections?.length
    ? profile.schema.requiredSections.map((item) => `- ${item}`).join('\n')
    : 'Neuvedené'
}

Špecifická AI inštrukcia typu práce:
${profile.schema?.aiInstruction || 'Neuvedené'}
`;
}

function filesToPrompt(files: AttachedFile[]) {
  if (!files.length) return '';

  return `
PRIPOJENÉ PDF DOKUMENTY:
${files
  .map((file, index) => {
    return `${index + 1}. ${file.name} (${formatBytes(file.size)})`;
  })
  .join('\n')}

Poznámka:
Ak backend tieto PDF dokumenty spracúva, použi ich obsah ako doplnkový zdroj.
Ak backend posiela iba názvy súborov bez obsahu, výslovne upozorni, že nebolo možné overiť obsah PDF.
`;
}

function buildPromptFromProfile({
  userInstruction,
  userText,
  profile,
  files,
}: {
  userInstruction: string;
  userText?: string;
  profile: SavedProfile | null;
  files: AttachedFile[];
}) {
  const workLanguage = profile?.workLanguage || profile?.language || 'SK';

  return `
Si ZEDPERA, akademický AI asistent a AI vedúci práce.

TVOJA ÚLOHA:
${userInstruction}

DÔLEŽITÉ PRAVIDLÁ:
- Odpovedaj v jazyku práce: ${workLanguage}.
- Čerpaj primárne z uloženého profilu práce.
- Ak sú priložené PDF dokumenty, zohľadni ich ako doplnkové zdroje.
- Nevymýšľaj konkrétne bibliografické údaje ako autor, rok, DOI alebo názov článku, ak ich nemáš overené.
- Text má byť akademický, použiteľný v záverečnej práci a logicky členený.
- Nepíš všeobecné frázy bez nadväznosti na profil práce.
- Ak v profile chýbajú údaje, doplň ich rozumne, ale jasne uveď, čo by bolo vhodné doplniť.

${profileToPrompt(profile)}

${filesToPrompt(files)}

DOPLŇUJÚCE ZADANIE OD POUŽÍVATEĽA:
${userText?.trim() || 'Bez doplňujúceho zadania.'}

FORMÁT ODPOVEDE:
=== VÝSTUP ===
Vytvor hlavný výsledný text.

=== ANALÝZA ===
Stručne vysvetli, z ktorých údajov profilu si čerpal.

=== SKÓRE ===
Ohodnoť použiteľnosť výstupu pre akademickú prácu od 0 do 100.

=== ODPORÚČANIA ===
Uveď konkrétne odporúčania, čo má používateľ doplniť alebo skontrolovať.
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const activeAgentLabel = useMemo(() => {
    return agents.find((item) => item.key === agent)?.label || 'Gemini';
  }, [agent]);

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

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const nextFiles: AttachedFile[] = Array.from(files)
      .filter((file) => {
        const isPdf =
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf');

        return isPdf;
      })
      .map((file) => ({
        id: createFileId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
      }));

    if (nextFiles.length === 0) {
      alert('Priložiť je možné iba PDF dokumenty.');
      return;
    }

    setAttachedFiles((prev) => [...prev, ...nextFiles]);

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

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';

      if (transcript) {
        setInput((prev) => {
          const spacer = prev.trim() ? ' ' : '';
          return `${prev}${spacer}${transcript}`;
        });
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const sendPromptToApi = async ({
    visibleUserText,
    promptForApi,
  }: {
    visibleUserText: string;
    promptForApi: string;
  }) => {
    if (isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: visibleUserText,
    };

    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = [
        ...messages,
        {
          role: 'user' as const,
          content: promptForApi,
        },
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          agent,
          attachedFiles,
          profile: activeProfile,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      if (!res.body) {
        throw new Error('No stream');
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

        setMessages((prev) => {
          const updated = [...prev];

          updated[updated.length - 1] = {
            role: 'assistant',
            content: fullText,
          };

          return updated;
        });
      }

      setCanvasText(fullText);

      const parsed = parseSections(fullText);

      if (parsed.analysis || parsed.score || parsed.tips) {
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
            '❌ Nastala chyba pri komunikácii s API. Skontroluj /api/chat, API kľúče a vybraného AI agenta.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || isLoading) return;

    const promptForApi = buildPromptFromProfile({
      userInstruction:
        'Odpovedz na otázku alebo zadanie používateľa. Pri odpovedi vychádzaj z uloženého profilu práce a z priložených PDF dokumentov, ak sú dostupné.',
      userText: text,
      profile: activeProfile,
      files: attachedFiles,
    });

    await sendPromptToApi({
      visibleUserText: text,
      promptForApi,
    });
  };

  const runSuggestion = async (suggestion: (typeof suggestions)[number]) => {
    const promptForApi = buildPromptFromProfile({
      userInstruction: suggestion.instruction,
      userText: '',
      profile: activeProfile,
      files: attachedFiles,
    });

    await sendPromptToApi({
      visibleUserText: suggestion.title,
      promptForApi,
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
        {/* TOP NAV FIXED */}
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
                Historie
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
                Více
              </button>
            </nav>
          </div>
        </header>

        {/* TITLE FIXED */}
        <section className="shrink-0 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black tracking-tight">CHAT</h2>

              <p className="mt-2 text-sm text-slate-400">
                Chat čerpá z uloženého profilu práce, vybraného AI agenta a
                pripojených PDF dokumentov.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              Aktívny profil:{' '}
              <span className="font-black text-white">
                {activeProfile?.title || 'Nie je vybraný'}
              </span>
            </div>
          </div>
        </section>

        {/* MAIN CHAT FIXED CONTAINER */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl shadow-black/30">
          {/* SCROLLABLE INNER CONTENT */}
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

                  <h3 className="text-3xl font-black">Začněte konverzaci</h3>

                  <p className="mt-2 text-slate-400">
                    Vyberte okno nižšie. AI použije uložený profil práce a
                    pripojené PDF dokumenty.
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
                      🤖 {activeAgentLabel} premýšľa...
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
                  Pripojené súbory ({attachedFiles.length})
                </div>

                <div className="flex max-h-[92px] flex-wrap gap-2 overflow-y-auto pr-1">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="inline-flex items-center gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-4 py-3 text-sm text-violet-100"
                    >
                      <FileText className="h-4 w-4" />

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

          {/* INPUT PANEL FIXED */}
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

                <button
                  type="button"
                  onClick={() => setCanvasOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <Paintbrush className="h-4 w-4" />
                  Canvas
                </button>
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
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFiles(event.target.files)}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                  title="Priložiť PDF"
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

            <p className="mt-3 text-center text-xs text-slate-500">
              Zedpera si může vymýšlet zdroje. Veškeré zdroje si zkontrolujte.
            </p>
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

              <button
                type="button"
                onClick={() => setCanvasOpen(false)}
                className="rounded-2xl bg-white/10 p-3 text-slate-300 hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
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
          <div className="grid max-h-[90vh] w-full max-w-6xl gap-6 overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] p-6 shadow-2xl md:grid-cols-3">
            <div className="col-span-2 overflow-y-auto pr-2">
              <h2 className="mb-4 text-2xl font-black">📄 Výstup</h2>

              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {popupData.output}
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto">
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

              <button
                type="button"
                onClick={() => {
                  setCanvasText(popupData.output || '');
                  setCanvasOpen(true);
                  setPopup(false);
                }}
                className="w-full rounded-2xl bg-violet-600 py-3 font-black text-white hover:bg-violet-500"
              >
                Otvoriť v Canvase
              </button>

              <button
                type="button"
                onClick={() => setPopup(false)}
                className="w-full rounded-2xl bg-red-500 py-3 font-black text-white hover:bg-red-400"
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}