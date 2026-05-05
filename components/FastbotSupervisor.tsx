'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
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
  methodology?: string;
  keywords?: string[];
  keywordsList?: string[];
  savedAt?: string;
};

const DEFAULT_BOT_ID = 'cmonxnqsl0av1p81pwly2ti1x';

const STORAGE_KEYS = {
  activeProfile: 'active_profile',
  profiles: 'profiles_full',
  latestGeneratedText: 'latest_generated_work_text',
  generatedWorkText: 'generated_work_text',
  lastAiOutput: 'last_ai_output',
};

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

  useEffect(() => {
    loadDataFromLocalStorage();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(STORAGE_KEYS.latestGeneratedText, generatedText);
  }, [generatedText]);

  const loadDataFromLocalStorage = () => {
    if (typeof window === 'undefined') return;

    let profile: SavedProfile | null = null;
    let text = '';

    try {
      const rawActiveProfile = localStorage.getItem(STORAGE_KEYS.activeProfile);

      if (rawActiveProfile) {
        profile = JSON.parse(rawActiveProfile) as SavedProfile;
      }

      if (!profile) {
        const rawProfiles = localStorage.getItem(STORAGE_KEYS.profiles);

        if (rawProfiles) {
          const parsedProfiles = JSON.parse(rawProfiles);

          if (Array.isArray(parsedProfiles) && parsedProfiles.length > 0) {
            profile = parsedProfiles[0] as SavedProfile;
          }
        }
      }
    } catch {
      profile = null;
    }

    text =
      localStorage.getItem(STORAGE_KEYS.latestGeneratedText) ||
      localStorage.getItem(STORAGE_KEYS.generatedWorkText) ||
      localStorage.getItem(STORAGE_KEYS.lastAiOutput) ||
      '';

    setActiveProfile(profile);
    setGeneratedText(text);

    const profileText = profile?.title
      ? `Načítaný profil: ${profile.title}`
      : 'Profil práce sa nenašiel.';

    const generatedTextInfo = text
      ? `Načítaný text: ${text.length} znakov`
      : 'Vygenerovaný AI text sa nenašiel.';

    setLoadedInfo(`${profileText} ${generatedTextInfo}`);
  };

  const keywords = useMemo(() => {
    if (activeProfile?.keywords && activeProfile.keywords.length > 0) {
      return activeProfile.keywords;
    }

    if (
      activeProfile?.keywordsList &&
      activeProfile.keywordsList.length > 0
    ) {
      return activeProfile.keywordsList;
    }

    return [];
  }, [activeProfile]);

  const supervisorPrompt = useMemo(() => {
    const profileBlock = activeProfile
      ? `
PROFIL PRÁCE:
- Názov práce: ${activeProfile.title || 'Nevyplnené'}
- Typ práce: ${activeProfile.type || 'Nevyplnené'}
- Úroveň práce: ${activeProfile.level || 'Nevyplnené'}
- Téma: ${activeProfile.topic || 'Nevyplnené'}
- Odbor: ${activeProfile.field || 'Nevyplnené'}
- Vedúci práce: ${activeProfile.supervisor || 'Nevyplnené'}
- Citačná norma: ${activeProfile.citation || 'Nevyplnené'}
- Jazyk práce: ${
          activeProfile.workLanguage || activeProfile.language || 'Nevyplnené'
        }
- Anotácia: ${activeProfile.annotation || 'Nevyplnené'}
- Cieľ práce: ${activeProfile.goal || 'Nevyplnené'}
- Metodológia: ${activeProfile.methodology || 'Nevyplnené'}
- Kľúčové slová: ${keywords.length ? keywords.join(', ') : 'Nevyplnené'}
`
      : `
PROFIL PRÁCE:
Profil práce nie je vyplnený. Upozorni používateľa, že hodnotenie bude menej presné, pretože chýba názov, téma, cieľ, metodológia, odbor a citačná norma.
`;

    return `
Vystupuj ako AI vedúci akademickej práce.

Tvoja úloha:
Skritizuj nižšie uvedený text práce podľa profilu práce. Buď konkrétny, odborný a priamy. Nechcem všeobecné frázy. Chcem spätnú väzbu ako od reálneho vedúceho práce alebo oponenta.

PRÍSNOSŤ HODNOTENIA:
${strictness}

${profileBlock}

TEXT / KAPITOLA NA HODNOTENIE:
${generatedText || 'Text práce zatiaľ nebol vložený.'}

VÝSTUP VYPRACUJ V TEJTO ŠTRUKTÚRE:

1. CELKOVÉ HODNOTENIE
Stručne zhodnoť, či text zodpovedá zadaniu, téme a akademickej úrovni.

2. SILNÉ STRÁNKY
Napíš, čo je v texte dobré.

3. SLABÉ STRÁNKY
Napíš konkrétne, čo je zlé, slabé, nejasné alebo nedostatočné.

4. ČO V TEXTE CHÝBA
Uveď chýbajúce časti, argumenty, zdroje, vysvetlenia alebo metodické prvky.

5. ČO BY VYTKOL VEDÚCI PRÁCE
Napíš presne, aké pripomienky by mohol dať vedúci práce.

6. METODOLÓGIA
Zhodnoť, či je cieľ, metodológia, výskumný problém alebo argumentácia dostatočne spracovaná.

7. AKADEMICKÝ ŠTÝL
Zhodnoť jazyk, odbornosť, plynulosť, štylistiku a vhodnosť pre akademickú prácu.

8. CITÁCIE A ZDROJE
Zhodnoť, či text potrebuje viac citácií, lepšiu prácu so zdrojmi alebo odbornú oporu.

9. KONKRÉTNE NÁVRHY NA ZLEPŠENIE
Daj konkrétne odporúčania, čo má študent upraviť.

10. PREPÍSANÉ UKÁŽKY
Navrhni lepšie formulácie slabých viet alebo odsekov.

11. OTÁZKY AKO OD VEDÚCEHO PRÁCE
Napíš otázky, ktoré by položil vedúci práce pri konzultácii.

12. SKÓRE KVALITY 0–100
Vyhodnoť:
- Logika textu:
- Metodológia:
- Argumentácia:
- Akademický štýl:
- Práca so zdrojmi:
- Celkové skóre:

13. PRIORITA OPRÁV
Rozdeľ opravy na:
- urgentné,
- dôležité,
- odporúčané.

Dôležité pravidlá:
- Odpovedaj po slovensky.
- Buď konkrétny.
- Pri každej výčitke vysvetli, ako ju opraviť.
- Ak je text krátky, upozorni, že hodnotenie je len orientačné.
- Ak chýba metodológia, cieľ alebo zdroje, výslovne to napíš.
- Nechváľ text zbytočne, ak má zásadné nedostatky.
`.trim();
  }, [activeProfile, generatedText, keywords, strictness]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(supervisorPrompt);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setCopied(false);
    }
  };

  const copyProfileAndTextOnly = async () => {
    const profileTitle = activeProfile?.title || 'Bez názvu';
    const profileTopic = activeProfile?.topic || 'Nevyplnené';

    const text = `
Profil práce:
Názov: ${profileTitle}
Téma: ${profileTopic}
Typ práce: ${activeProfile?.type || 'Nevyplnené'}
Cieľ práce: ${activeProfile?.goal || 'Nevyplnené'}
Metodológia: ${activeProfile?.methodology || 'Nevyplnené'}
Citovanie: ${activeProfile?.citation || 'Nevyplnené'}

Text na hodnotenie:
${generatedText || 'Text práce zatiaľ nebol vložený.'}
`.trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setCopied(false);
    }
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
                Modul automaticky spojí profil práce, vygenerovaný AI text a
                hodnotiace pravidlá. Výsledkom je zadanie pre Fastbota, ktorý
                má prácu skritizovať ako vedúci práce, oponent alebo školiteľ.
              </p>

              {loadedInfo && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  {loadedInfo}
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
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InfoBox
            icon={GraduationCap}
            title="1. Profil práce"
            text="AI vedúci hodnotí podľa názvu, témy, cieľa, metodológie, citovania a jazyka práce."
          />

          <InfoBox
            icon={FileIcon}
            title="2. Text práce"
            text="Do hodnotenia vstupuje vygenerovaná kapitola alebo ručne vložený text."
          />

          <InfoBox
            icon={ShieldCheck}
            title="3. Kritika + skóre"
            text="Výstup má obsahovať slabiny, otázky vedúceho, návrhy úprav a skóre kvality."
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
              Sem sa načíta posledný vygenerovaný AI text. Ak zatiaľ nie je
              uložený, vlož sem kapitolu ručne.
            </p>
          </div>

          <label className="block">
            <div className="mb-2 text-sm font-semibold text-slate-300">
              Vygenerovaný text / kapitola
            </div>

            <textarea
              value={generatedText}
              onChange={(event) => setGeneratedText(event.target.value)}
              rows={14}
              placeholder="Tu vlož text práce, kapitolu alebo výstup z AI, ktorý má Fastbot skritizovať..."
              className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-500"
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
              Toto zadanie obsahuje celý proces spätnej väzby. Skopíruj ho a
              vlož do Fastbots chatu.
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
              Do chatu vlož skopírované zadanie. Fastbot následne vráti
              kritiku, otázky, hodnotenie a návrhy zlepšení.
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