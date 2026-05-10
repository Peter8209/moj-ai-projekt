'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';

type FastbotSupervisorProps = {
  title?: string;
  subtitle?: string;
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
  keywords?: string[];
  keywordsList?: string[];
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

const DEFAULT_BOT_ID = 'cmonxnqsl0av1p81pwly2ti1x';

const STORAGE_KEYS = {
  activeProfile: 'active_profile',
  profile: 'profile',
  profiles: 'profiles_full',
  latestGeneratedText: 'latest_generated_work_text',
  generatedWorkText: 'generated_work_text',
  lastAiOutput: 'last_ai_output',
  lastChatOutput: 'zedpera_last_chat_output',
  canvasText: 'zedpera_canvas_text',
};

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

function cleanBrokenEncoding(value: string) {
  return String(value || '')
    // odstránenie BOM a neviditeľných znakov
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')

    // odstránenie náhradného znaku
    .replace(/\uFFFD/g, '')

    // časté mojibake znaky pri zlom UTF-8/Windows kódovaní
    .replace(/Â+/g, '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ãč/g, 'č')
    .replace(/Ä/g, 'č')
    .replace(/Ä/g, 'ď')
    .replace(/Ã©/g, 'é')
    .replace(/Ä›/g, 'ě')
    .replace(/Ã­/g, 'í')
    .replace(/Äľ/g, 'ľ')
    .replace(/Ä¾/g, 'ľ')
    .replace(/Åˆ/g, 'ň')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Å•/g, 'ŕ')
    .replace(/Å¡/g, 'š')
    .replace(/Å¥/g, 'ť')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã½/g, 'ý')
    .replace(/Å¾/g, 'ž')
    .replace(/ÄŚ/g, 'Č')
    .replace(/ÄŽ/g, 'Ď')
    .replace(/Ã‰/g, 'É')
    .replace(/Ä˝/g, 'Ľ')
    .replace(/Å‡/g, 'Ň')
    .replace(/Ã“/g, 'Ó')
    .replace(/Å Š/g, 'Š')
    .replace(/Å½/g, 'Ž')

    // typografické znaky
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€¦/g, '…')

    // odstránenie zvláštnych znakov na začiatku riadkov
    .replace(/^[^\p{L}\p{N}\s"'„“‚‘\-–—()[\]]{1,20}\s*/gmu, '')
    .replace(/^\s*[|/\\_~^`´¨]+/gm, '')

    // odstránenie markdown nadpisov, ak ich nechceme posielať do Wordu
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')

    // normalizácia riadkov
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function removeBadAiHeadings(value: string) {
  return cleanBrokenEncoding(value)
    .replace(/^AI\s+vedúci\s*:?\s*/i, '')
    .replace(/^AI\s+veduci\s*:?\s*/i, '')
    .replace(/^Ako\s+AI\s+vedúci\s+práce\s*,?\s*/i, '')
    .replace(/^Ako\s+vedúci\s+práce\s*,?\s*/i, '')
    .replace(/^Dobrý\s+deň\s*,?\s*/i, '')
    .replace(/^Vážený\s+študent\s*,?\s*/i, '')
    .replace(/^Predmet\s*:.*$/gim, '')
    .replace(/^Email\s*:.*$/gim, '')
    .trim();
}

function buildProfileText(profile: SavedProfile | null, keywords: string[]) {
  if (!profile) {
    return `
PROFIL PRÁCE:
Profil práce nie je vyplnený.

Dôležité:
- Upozorni používateľa, že hodnotenie bude menej presné.
- Nepýtaj sa všeobecne na všetko znova.
- Hodnoť iba text, ktorý je vložený nižšie.
`.trim();
  }

  return `
PROFIL PRÁCE:
Názov práce: ${profile.title || 'Nevyplnené'}
Typ práce: ${profile.schema?.label || profile.type || 'Nevyplnené'}
Úroveň práce: ${profile.level || 'Nevyplnené'}
Téma / zameranie: ${profile.topic || profile.title || 'Nevyplnené'}
Odbor / predmet / oblasť: ${profile.field || 'Nevyplnené'}
Vedúci práce / školiteľ: ${profile.supervisor || 'Nevyplnené'}
Citačná norma: ${profile.citation || 'Nevyplnené'}
Jazyk práce: ${profile.workLanguage || profile.language || 'Slovenčina'}
Anotácia: ${profile.annotation || 'Nevyplnené'}
Cieľ práce: ${profile.goal || 'Nevyplnené'}
Výskumný problém: ${profile.problem || 'Nevyplnené'}
Výskumné otázky: ${profile.researchQuestions || 'Nevyplnené'}
Hypotézy: ${profile.hypotheses || 'Nevyplnené'}
Metodológia: ${profile.methodology || 'Nevyplnené'}
Praktická časť: ${profile.practicalPart || 'Nevyplnené'}
Požiadavky na zdroje: ${profile.sourcesRequirement || 'Nevyplnené'}
Kľúčové slová: ${keywords.length ? keywords.join(', ') : 'Nevyplnené'}
`.trim();
}

function buildSupervisorPrompt({
  activeProfile,
  generatedText,
  keywords,
  strictness,
}: {
  activeProfile: SavedProfile | null;
  generatedText: string;
  keywords: string[];
  strictness: string;
}) {
  const cleanedText = removeBadAiHeadings(generatedText);

  return `
TVOJA ROLA:
Si odborný AI vedúci akademickej práce. Hodnotíš text ako vedúci práce, školiteľ alebo oponent.

ZÁKAZ:
- Nepíš email.
- Nepíš predmet emailu.
- Nepíš oslovenie typu „Dobrý deň“.
- Nepíš všeobecné marketingové frázy.
- Nepíš nadpis „AI vedúci“.
- Nepíš úvod typu „Ako AI vedúci práce...“.
- Nepíš text práce nanovo celý.
- Nevymýšľaj zdroje, autorov, roky, DOI ani URL.
- Neopravuj len gramatiku. Hodnoť odbornú kvalitu.
- Ak sú v texte poškodené znaky alebo zvláštne symboly, upozorni na to ako technický problém a potom hodnotiť zrozumiteľný obsah.

POVINNÝ ŠTÝL:
- Odpovedaj po slovensky.
- Buď konkrétny, odborný a priamy.
- Výstup musí byť spätná väzba k práci, nie email.
- Každú výčitku vysvetli a pridaj návrh opravy.
- Výstup píš čistým textom vhodným do Wordu.
- Nepoužívaj markdown znaky #, ##, **, --- ani kódové bloky.

PRÍSNOSŤ HODNOTENIA:
${strictness}

${buildProfileText(activeProfile, keywords)}

TEXT / KAPITOLA NA HODNOTENIE:
"""
${cleanedText || 'Text práce zatiaľ nebol vložený.'}
"""

VÝSTUP MUSÍ MAŤ PRESNE TÚTO ŠTRUKTÚRU:

1. CELKOVÉ HODNOTENIE
Zhodnoť, či text zodpovedá profilu práce, názvu práce, cieľu, metodológii a akademickej úrovni.

2. SILNÉ STRÁNKY
Uveď iba reálne silné stránky textu. Nechváľ všeobecne.

3. SLABÉ STRÁNKY
Uveď konkrétne slabiny textu. Pri každej slabine vysvetli, prečo je problémová.

4. ČO V TEXTE CHÝBA
Uveď chýbajúce argumenty, zdroje, metodické prvky, prepojenia na cieľ práce alebo výskumný problém.

5. ČO BY VYTKOL VEDÚCI PRÁCE
Napíš presné pripomienky, ktoré by mohol povedať reálny vedúci práce.

6. METODOLÓGIA
Zhodnoť, či je metodológia jasná, vhodná a prepojená s cieľom práce.

7. AKADEMICKÝ ŠTÝL
Zhodnoť odbornosť, plynulosť, terminológiu, logiku viet a vhodnosť pre akademický text.

8. CITÁCIE A ZDROJE
Zhodnoť, či text potrebuje doplniť citácie, odborné zdroje, normy, zákony, články alebo dáta.

9. KONKRÉTNE NÁVRHY NA ZLEPŠENIE
Napíš konkrétne kroky, čo má používateľ upraviť.

10. PREPÍSANÉ UKÁŽKY
Vyber 2 až 4 slabé vety alebo pasáže a ukáž lepšiu akademickú formuláciu.

11. OTÁZKY AKO OD VEDÚCEHO PRÁCE
Napíš otázky, ktoré by vedúci práce položil pri konzultácii.

12. SKÓRE KVALITY 0–100
Vyhodnoť:
Logika textu:
Metodológia:
Argumentácia:
Akademický štýl:
Práca so zdrojmi:
Celkové skóre:

13. PRIORITA OPRÁV
Rozdeľ opravy na:
Urgentné:
Dôležité:
Odporúčané:

14. TECHNICKÉ UPOZORNENIA
Ak text obsahuje poškodené znaky, chybné kódovanie, nezmyselné symboly alebo nečitateľné časti, uveď to presne tu.
`.trim();
}

export default function FastbotSupervisor({
  title = 'AI vedúci práce',
  subtitle = 'Odborná spätná väzba, kritika textu, odporúčania a hodnotenie kvality práce.',
}: FastbotSupervisorProps) {
  const botId = process.env.NEXT_PUBLIC_FASTBOTS_BOT_ID || DEFAULT_BOT_ID;
  const fastbotUrl = `https://app.fastbots.ai/embed/${botId}`;

  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);
  const [generatedText, setGeneratedText] = useState('');
  const [strictness, setStrictness] = useState('Prísna ako vedúci práce');
  const [copied, setCopied] = useState(false);
  const [loadedInfo, setLoadedInfo] = useState('');
  const [textWasCleaned, setTextWasCleaned] = useState(false);

  useEffect(() => {
    loadDataFromLocalStorage();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(
      STORAGE_KEYS.latestGeneratedText,
      cleanBrokenEncoding(generatedText),
    );
  }, [generatedText]);

  const loadDataFromLocalStorage = () => {
    if (typeof window === 'undefined') return;

    let profile: SavedProfile | null = null;

    const rawActiveProfile = localStorage.getItem(STORAGE_KEYS.activeProfile);
    const rawProfile = localStorage.getItem(STORAGE_KEYS.profile);
    const rawProfiles = localStorage.getItem(STORAGE_KEYS.profiles);

    profile =
      normalizeProfile(safeJsonParse<any>(rawActiveProfile)) ||
      normalizeProfile(safeJsonParse<any>(rawProfile));

    if (!profile && rawProfiles) {
      const parsedProfiles = safeJsonParse<any[]>(rawProfiles);

      if (Array.isArray(parsedProfiles) && parsedProfiles.length > 0) {
        profile = normalizeProfile(parsedProfiles[0]);
      }
    }

    const storedText =
      localStorage.getItem(STORAGE_KEYS.latestGeneratedText) ||
      localStorage.getItem(STORAGE_KEYS.generatedWorkText) ||
      localStorage.getItem(STORAGE_KEYS.lastAiOutput) ||
      localStorage.getItem(STORAGE_KEYS.lastChatOutput) ||
      localStorage.getItem(STORAGE_KEYS.canvasText) ||
      '';

    const cleanedText = removeBadAiHeadings(storedText);

    setActiveProfile(profile);
    setGeneratedText(cleanedText);
    setTextWasCleaned(cleanedText !== storedText);

    const profileText = profile?.title
      ? `Načítaný profil: ${profile.title}`
      : 'Profil práce sa nenašiel.';

    const generatedTextInfo = cleanedText
      ? `Načítaný text: ${cleanedText.length} znakov`
      : 'Vygenerovaný AI text sa nenašiel.';

    setLoadedInfo(`${profileText} ${generatedTextInfo}`);
  };

  const keywords = useMemo(() => {
    if (activeProfile?.keywords && activeProfile.keywords.length > 0) {
      return activeProfile.keywords;
    }

    if (activeProfile?.keywordsList && activeProfile.keywordsList.length > 0) {
      return activeProfile.keywordsList;
    }

    return [];
  }, [activeProfile]);

  const supervisorPrompt = useMemo(() => {
    return buildSupervisorPrompt({
      activeProfile,
      generatedText,
      keywords,
      strictness,
    });
  }, [activeProfile, generatedText, keywords, strictness]);

  const cleanCurrentText = () => {
    const cleaned = removeBadAiHeadings(generatedText);
    setGeneratedText(cleaned);
    setTextWasCleaned(true);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.latestGeneratedText, cleaned);
      localStorage.setItem(STORAGE_KEYS.generatedWorkText, cleaned);
      localStorage.setItem(STORAGE_KEYS.lastAiOutput, cleaned);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setCopied(false);
    }
  };

  const copyPrompt = async () => {
    await copyToClipboard(supervisorPrompt);
  };

  const copyProfileAndTextOnly = async () => {
    const cleanedText = removeBadAiHeadings(generatedText);

    const text = `
Profil práce:
Názov: ${activeProfile?.title || 'Bez názvu'}
Typ práce: ${activeProfile?.schema?.label || activeProfile?.type || 'Nevyplnené'}
Téma / zameranie: ${activeProfile?.topic || activeProfile?.title || 'Nevyplnené'}
Odbor: ${activeProfile?.field || 'Nevyplnené'}
Cieľ práce: ${activeProfile?.goal || 'Nevyplnené'}
Výskumný problém: ${activeProfile?.problem || 'Nevyplnené'}
Metodológia: ${activeProfile?.methodology || 'Nevyplnené'}
Citovanie: ${activeProfile?.citation || 'Nevyplnené'}
Jazyk práce: ${activeProfile?.workLanguage || activeProfile?.language || 'Nevyplnené'}

Text na hodnotenie:
${cleanedText || 'Text práce zatiaľ nebol vložený.'}
`.trim();

    await copyToClipboard(text);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-[#070b18] p-5 shadow-2xl">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/30">
              <Bot className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">{title}</h2>

              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-400">
                {subtitle}
              </p>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
                Modul načíta profil práce a text práce. Následne pripraví čisté
                zadanie pre Fastbota bez chybných úvodných znakov, bez emailov
                a bez všeobecných odpovedí. Výstup má byť výhradne odborná
                spätná väzba vedúceho práce.
              </p>

              {loadedInfo && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  {loadedInfo}
                </div>
              )}

              {textWasCleaned && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Text bol automaticky očistený od poškodených znakov,
                    neviditeľných znakov alebo chybných úvodných nadpisov.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <a
              href={fastbotUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Otvoriť samostatne
              <ExternalLink className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={loadDataFromLocalStorage}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Znova načítať údaje
            </button>

            <button
              type="button"
              onClick={cleanCurrentText}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-sm font-bold text-purple-100 transition hover:bg-purple-500/20"
            >
              <Wand2 className="h-4 w-4" />
              Vyčistiť poškodené znaky
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InfoBox
            icon={GraduationCap}
            title="1. Profil práce"
            text="Hodnotenie vychádza z názvu, typu práce, cieľa, metodológie, odboru, jazyka a citačnej normy."
          />

          <InfoBox
            icon={FileIcon}
            title="2. Text práce"
            text="Do hodnotenia vstupuje kapitola, časť práce alebo posledný vygenerovaný akademický text."
          />

          <InfoBox
            icon={ShieldCheck}
            title="3. Odborná kritika"
            text="Výstup musí obsahovať konkrétne slabiny, návrhy opráv, otázky vedúceho a skóre kvality."
          />
        </div>
      </div>

      {!activeProfile && (
        <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-100">
          <h3 className="text-lg font-black">Profil práce nie je vyplnený</h3>

          <p className="mt-2 text-sm leading-6 text-yellow-50/90">
            AI vedúci bude fungovať aj bez profilu, ale kritika bude menej
            presná. Najprv odporúčam vytvoriť profil práce cez tlačidlo
            „Nová práca“.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <h3 className="text-xl font-black text-white">
              Text práce na kritiku
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Sem sa načíta posledný vygenerovaný AI text. Ak sa zobrazujú
              poškodené znaky, klikni na „Vyčistiť poškodené znaky“.
            </p>
          </div>

          <label className="block">
            <div className="mb-2 text-sm font-semibold text-slate-300">
              Vygenerovaný text / kapitola
            </div>

            <textarea
              value={generatedText}
              onChange={(event) =>
                setGeneratedText(removeBadAiHeadings(event.target.value))
              }
              rows={14}
              placeholder="Tu vlož text práce, kapitolu alebo výstup z AI, ktorý má Fastbot skritizovať..."
              className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-purple-500"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-semibold text-slate-300">
              Prísnosť hodnotenia
            </div>

            <select
              value={strictness}
              onChange={(event) => setStrictness(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none focus:border-purple-500"
            >
              <option>Mierna spätná väzba</option>
              <option>Štandardná spätná väzba</option>
              <option>Prísna ako vedúci práce</option>
              <option>Oponentská kritika</option>
              <option>Veľmi tvrdá odborná kritika pred odovzdaním</option>
            </select>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-4 text-sm font-bold text-white transition hover:opacity-90"
            >
              {copied ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Clipboard className="h-5 w-5" />
              )}
              {copied ? 'Skopírované' : 'Skopírovať celé zadanie'}
            </button>

            <button
              type="button"
              onClick={copyProfileAndTextOnly}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <Clipboard className="h-5 w-5" />
              Kopírovať iba profil + text
            </button>
          </div>
        </div>

        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <h3 className="text-xl font-black text-white">
              Zadanie pre Fastbota
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Toto zadanie obsahuje pevné pravidlá, aby Fastbot negeneroval
              emaily, hlúposti ani poškodené úvodné znaky.
            </p>
          </div>

          <textarea
            value={supervisorPrompt}
            readOnly
            rows={22}
            className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-sm leading-6 text-slate-200 outline-none"
          />
        </div>
      </div>

      <div className="rounded-[32px] border border-purple-500/30 bg-[#070b18] p-5 shadow-2xl">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-white">
              Fastbots AI vedúci
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Do chatu vlož skopírované zadanie. Fastbot musí vrátiť odbornú
              kritiku práce, nie email.
            </p>
          </div>

          <button
            type="button"
            onClick={copyPrompt}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Clipboard className="h-4 w-4" />
            )}
            {copied ? 'Zadanie je skopírované' : 'Kopírovať zadanie'}
          </button>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-purple-500/30 bg-white">
          <iframe
            title="Fastbots AI vedúci práce"
            src={fastbotUrl}
            className="h-[720px] w-full border-0"
            allow="microphone; clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </section>
  );
}

type InfoBoxIcon = React.ComponentType<{
  className?: string;
}>;

function InfoBox({
  icon: Icon,
  title,
  text,
}: {
  icon: InfoBoxIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="text-base font-black text-white">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3.75h6.2L18 8.55v11.7H7V3.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="M13 4v5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="M9.5 13h5M9.5 16h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}