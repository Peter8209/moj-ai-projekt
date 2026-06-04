import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import pptxgen from 'pptxgenjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const ShapeType = {
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  line: 'line',
} as const;

type PptxGen = InstanceType<typeof pptxgen>;
type PptxSlide = ReturnType<PptxGen['addSlide']>;

type DefenseSlide = {
  title: string;
  layout?:
    | 'cover'
    | 'agenda'
    | 'section'
    | 'bullets'
    | 'split'
    | 'quote'
    | 'chart'
    | 'table'
    | 'closing';
  bullets: string[];
  speakerNotes?: string;
  visualSuggestion?: string;
  estimatedMinutes?: number;
};

type NormalizedWork = {
  title: string;
  defenseType: string;
  profileText: string;
  sourceText: string;
  slides: DefenseSlide[];
};

type GeneratedPptxFile = {
  fileName: string;
  title: string;
  buffer: Buffer;
  slidesCount: number;
};

type DefensePptxRequestBody = {
  title?: unknown;
  workTitle?: unknown;
  defenseType?: unknown;
  type?: unknown;
  theme?: unknown;

  profile?: unknown;
  activeProfile?: unknown;
  savedProfile?: unknown;
  workProfile?: unknown;

  slides?: unknown;
  text?: unknown;
  content?: unknown;
  summary?: unknown;
  sourceText?: unknown;
  extractedWorkText?: unknown;
  clientExtractedText?: unknown;
  attachmentText?: unknown;
  workText?: unknown;

  works?: unknown;
  selectedWorks?: unknown;
  projects?: unknown;

  aiGenerate?: unknown;
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const MAX_SOURCE_CHARS_FOR_AI = 65_000;
const MAX_RENDERED_SLIDES = 30;
const TARGET_MINUTES = 40;

const THEME = {
  bg: 'FFFFFF',
  bg2: 'F8FAFC',
  card: 'FFFFFF',
  card2: 'F1F5F9',
  text: '111827',
  title: '020617',
  muted: '334155',
  accent: '4F46E5',
  accent2: '0F766E',
  border: 'CBD5E1',
  soft: 'EEF2FF',
  headerText: 'FFFFFF',
};

function cleanText(value: unknown): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanInline(value: unknown): string {
  return cleanText(value).replace(/\s+/g, ' ').trim();
}

function truncateText(text: string, maxChars: number): string {
  const clean = cleanText(text);

  if (clean.length <= maxChars) return clean;

  const start = clean.slice(0, Math.floor(maxChars * 0.45));
  const middleStart = Math.max(
    0,
    Math.floor(clean.length / 2) - Math.floor(maxChars * 0.15),
  );
  const middle = clean.slice(
    middleStart,
    middleStart + Math.floor(maxChars * 0.25),
  );
  const end = clean.slice(clean.length - Math.floor(maxChars * 0.3));

  return `${start}\n\n[... skrátený stred dokumentu ...]\n\n${middle}\n\n[... pokračovanie ...]\n\n${end}`;
}

function safeFileName(value: string): string {
  const safe = cleanInline(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return safe || 'obhajoba-prace';
}

function tryParseJson(value: string): unknown {
  const raw = cleanText(value);

  const withoutFence = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const first = withoutFence.indexOf('{');
    const last = withoutFence.lastIndexOf('}');

    if (first >= 0 && last > first) {
      return JSON.parse(withoutFence.slice(first, last + 1));
    }

    throw new Error('AI nevrátila platný JSON pre prezentáciu.');
  }
}

function stringifyProfile(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') return cleanText(value);

  if (typeof value !== 'object') return cleanText(value);

  const profile = value as Record<string, unknown>;

  const fields = [
    ['Názov práce', profile.title || profile.workTitle || profile.topic],
    ['Typ práce', profile.type || profile.workType || profile.schema],
    ['Odbor', profile.field || profile.studyField || profile.department],
    ['Jazyk práce', profile.language || profile.workLanguage],
    ['Cieľ práce', profile.goal || profile.objective],
    ['Anotácia', profile.annotation || profile.abstract],
    ['Výskumný problém', profile.problem || profile.researchProblem],
    ['Výskumné otázky', profile.researchQuestions],
    ['Hypotézy', profile.hypotheses],
    ['Metodológia', profile.methodology || profile.methods],
    ['Praktická časť', profile.practicalPart],
    ['Prínos práce', profile.contribution || profile.scientificContribution],
    ['Kľúčové slová', profile.keywords],
    ['Norma citovania', profile.citationStyle],
  ];

  return fields
    .map(([label, rawValue]) => {
      const text = cleanInline(rawValue);

      if (!text) return '';

      return `${label}: ${text}`;
    })
    .filter(Boolean)
    .join('\n');
}

function getBodySourceText(body: Record<string, unknown>): string {
  return cleanText(
    body.sourceText ||
      body.extractedWorkText ||
      body.clientExtractedText ||
      body.attachmentText ||
      body.workText ||
      body.text ||
      body.content ||
      body.summary ||
      '',
  );
}

function normalizeInputSlide(value: unknown, index: number): DefenseSlide | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;

  const title = cleanInline(raw.title || `Snímka ${index + 1}`);
  const bullets = Array.isArray(raw.bullets)
    ? raw.bullets.map(cleanInline).filter(Boolean).slice(0, 6)
    : [];

  if (!title && !bullets.length) return null;

  return {
    title: title || `Snímka ${index + 1}`,
    layout: cleanInline(raw.layout) as DefenseSlide['layout'],
    bullets,
    speakerNotes: cleanText(raw.speakerNotes),
    visualSuggestion: cleanInline(raw.visualSuggestion),
    estimatedMinutes: Number(raw.estimatedMinutes || 0) || undefined,
  };
}

function normalizeSlides(rawSlides: unknown): DefenseSlide[] {
  if (!Array.isArray(rawSlides)) return [];

  return rawSlides
    .map((slide, index) => normalizeInputSlide(slide, index))
    .filter((slide): slide is DefenseSlide => Boolean(slide))
    .slice(0, MAX_RENDERED_SLIDES);
}

function normalizeWorks(body: DefensePptxRequestBody): NormalizedWork[] {
  const rawWorks = Array.isArray(body.works)
    ? body.works
    : Array.isArray(body.selectedWorks)
      ? body.selectedWorks
      : Array.isArray(body.projects)
        ? body.projects
        : [];

  if (!rawWorks.length) {
    const rawBody = body as Record<string, unknown>;
    const title = cleanInline(
      body.title || body.workTitle || 'Obhajoba záverečnej práce',
    );

    const defenseType = cleanInline(
      body.defenseType || body.type || 'Obhajoba záverečnej práce',
    );

    const profileText = stringifyProfile(
      body.profile || body.activeProfile || body.savedProfile || body.workProfile,
    );

    const sourceText = getBodySourceText(rawBody);

    return [
      {
        title,
        defenseType,
        profileText,
        sourceText,
        slides: normalizeSlides(body.slides),
      },
    ];
  }

  return rawWorks.map((work, index) => {
    const raw = work && typeof work === 'object' ? (work as Record<string, unknown>) : {};

    const title = cleanInline(
      raw.title ||
        raw.workTitle ||
        raw.topic ||
        raw.name ||
        `Obhajoba práce ${index + 1}`,
    );

    const defenseType = cleanInline(
      raw.defenseType ||
        raw.type ||
        body.defenseType ||
        'Obhajoba záverečnej práce',
    );

    const profileText = stringifyProfile(
      raw.profile ||
        raw.activeProfile ||
        raw.savedProfile ||
        raw.workProfile ||
        body.profile ||
        body.activeProfile,
    );

    const sourceText = getBodySourceText({
      ...raw,
      fallbackText: body.text,
    });

    return {
      title,
      defenseType,
      profileText,
      sourceText,
      slides: normalizeSlides(raw.slides),
    };
  });
}

function buildAiPrompt(work: NormalizedWork) {
  const profileText = work.profileText || 'Profil práce nebol vyplnený.';
  const sourceText = truncateText(work.sourceText, MAX_SOURCE_CHARS_FOR_AI);

  return `
Si expert na akademické obhajoby, školiteľ a tvorca profesionálnych PowerPoint prezentácií.

Tvojou úlohou je vytvoriť kompletnú prezentáciu na obhajobu záverečnej práce na približne 40 minút.

DÔLEŽITÉ PRAVIDLÁ:
- Každá snímka musí priamo súvisieť s profilom práce a vloženým dokumentom.
- Nepíš všeobecné univerzálne texty, ak sa dá vychádzať z dokumentu.
- Ak v dokumente nájdeš cieľ, metodiku, výskumné otázky, hypotézy, výsledky alebo záver, použi ich.
- Prezentácia má byť profesionálna, akademická a vhodná pred komisiu.
- Každý slide musí mať speakerNotes, teda čo má študent hovoriť.
- Celkový rozsah prezentácie má byť približne 40 minút.
- Vytvor 20 až 24 obsahových snímok.
- Neuvádzaj nič, čo nie je podporené profilom alebo dokumentom. Ak údaj chýba, formuluj opatrne.
- Každý slide má obsahovať 3 až 5 kvalitných bodov.
- Texty majú byť konkrétne, nie prázdne frázy.
- Výstup musí byť striktne JSON.

PROFIL PRÁCE:
${profileText}

NÁZOV PREZENTÁCIE:
${work.title}

TYP OBHAJOBY:
${work.defenseType}

TEXT PRÁCE / NÁHRATÝ DOKUMENT:
${sourceText || 'Dokument nebol dostupný. Vychádzaj z profilu práce.'}

Vráť iba JSON v tomto tvare:
{
  "slides": [
    {
      "title": "Názov snímky",
      "layout": "section | bullets | split | quote | closing",
      "estimatedMinutes": 2,
      "bullets": [
        "Konkrétny bod priamo z práce alebo profilu",
        "Konkrétny bod priamo z práce alebo profilu",
        "Konkrétny bod priamo z práce alebo profilu"
      ],
      "speakerNotes": "Detailný hovorený text pre študenta na 1 až 2 minúty. Musí vysvetľovať obsah snímky.",
      "visualSuggestion": "Odporúčanie na graf, tabuľku, schému alebo vizuál."
    }
  ]
}

Odporúčaná štruktúra:
1. Názov a predstavenie práce
2. Kontext a význam témy
3. Dôvod výberu témy
4. Cieľ práce
5. Výskumný problém
6. Výskumné otázky / hypotézy
7. Teoretický rámec
8. Kľúčové pojmy
9. Metodológia
10. Dáta / výskumná vzorka / materiál
11. Postup spracovania
12. Praktická alebo analytická časť
13. Hlavné výsledky 1
14. Hlavné výsledky 2
15. Interpretácia výsledkov
16. Porovnanie s teóriou
17. Prínos práce
18. Limity práce
19. Odporúčania
20. Záver
21. Možné otázky komisie
22. Záverečné poďakovanie
`.trim();
}

async function generateSlidesWithAi(work: NormalizedWork): Promise<DefenseSlide[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return buildFallbackSlides(work);
  }

  const openai = new OpenAI({
    apiKey,
  });

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.35,
    max_tokens: 9000,
    response_format: {
      type: 'json_object',
    },
    messages: [
      {
        role: 'system',
        content:
          'Si akademický expert na tvorbu obhajob. Vždy vraciaš iba validný JSON.',
      },
      {
        role: 'user',
        content: buildAiPrompt(work),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || '';
  const parsed = tryParseJson(content);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI nevrátila objekt so snímkami.');
  }

  const rawSlides = (parsed as Record<string, unknown>).slides;

  const slides = normalizeSlides(rawSlides);

  if (!slides.length) {
    throw new Error('AI nevygenerovala žiadne použiteľné snímky.');
  }

  return slides.slice(0, MAX_RENDERED_SLIDES);
}

function pickSentences(text: string, patterns: RegExp[], max = 4): string[] {
  const sentences = cleanText(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(cleanInline)
    .filter((sentence) => sentence.length >= 35);

  const found = sentences.filter((sentence) =>
    patterns.some((pattern) => pattern.test(sentence)),
  );

  return found.slice(0, max);
}

function fallbackBullets(found: string[], fallback: string[]) {
  return (found.length ? found : fallback)
    .map((item) => (item.length > 180 ? `${item.slice(0, 177)}…` : item))
    .slice(0, 5);
}

function buildFallbackSlides(work: NormalizedWork): DefenseSlide[] {
  const text = `${work.profileText}\n\n${work.sourceText}`;

  const objective = fallbackBullets(
    pickSentences(text, [/cieľ/i, /cieľom/i, /zamer/i, /predmetom/i], 5),
    [
      `Práca sa zameriava na tému: ${work.title}.`,
      'Hlavným cieľom je odborne spracovať riešený problém.',
      'Prezentácia vychádza z dostupného profilu práce a nahratého dokumentu.',
    ],
  );

  const methodology = fallbackBullets(
    pickSentences(text, [/metod/i, /postup/i, /analýz/i, /výskum/i], 5),
    [
      'Metodologický postup je potrebné predstaviť vo vzťahu k cieľu práce.',
      'Použité metódy majú ukázať, ako boli spracované údaje alebo odborné zdroje.',
      'Postup práce prepája teoretickú a praktickú časť.',
    ],
  );

  const results = fallbackBullets(
    pickSentences(text, [/výsled/i, /zisten/i, /potvrd/i, /ukáz/i], 5),
    [
      'Výsledky je potrebné predstaviť priamo vo vzťahu k cieľu práce.',
      'Najdôležitejšie zistenia tvoria základ pre interpretáciu a odporúčania.',
      'Pri obhajobe je vhodné zdôrazniť hlavný prínos výsledkov.',
    ],
  );

  return [
    {
      title: work.title,
      layout: 'section',
      estimatedMinutes: 2,
      bullets: [
        work.defenseType,
        'Predstavenie témy, cieľa a štruktúry obhajoby.',
        'Prezentácia je pripravená z profilu práce a dostupného dokumentu.',
      ],
      speakerNotes:
        'Na úvod predstavte názov práce, typ práce a stručne vysvetlite, prečo je téma dôležitá.',
      visualSuggestion: 'Titulný slide s názvom práce a menom autora.',
    },
    {
      title: 'Význam a aktuálnosť témy',
      layout: 'bullets',
      estimatedMinutes: 2,
      bullets: fallbackBullets(
        pickSentences(text, [/význam/i, /aktuál/i, /dôležit/i, /problém/i], 5),
        [
          'Téma má odborný alebo praktický význam v danej oblasti.',
          'Práca reaguje na konkrétny problém formulovaný v profile alebo dokumente.',
          'Aktuálnosť témy je potrebné vysvetliť vo vzťahu k odboru.',
        ],
      ),
      speakerNotes:
        'Vysvetlite komisii, prečo bolo potrebné sa témou zaoberať a aký problém práca rieši.',
      visualSuggestion: 'Schéma kontextu problému alebo mapa pojmov.',
    },
    {
      title: 'Cieľ práce',
      layout: 'quote',
      estimatedMinutes: 2,
      bullets: objective,
      speakerNotes:
        'Cieľ práce povedzte jasne a priamo. Následne vysvetlite, ako je cieľ prepojený s metodikou a výsledkami.',
      visualSuggestion: 'Veľká karta s hlavným cieľom práce.',
    },
    {
      title: 'Výskumný problém a otázky',
      layout: 'split',
      estimatedMinutes: 2,
      bullets: fallbackBullets(
        pickSentences(text, [/výskumn/i, /otázk/i, /hypotéz/i, /problém/i], 5),
        [
          'Výskumný problém vychádza z cieľa práce.',
          'Výskumné otázky alebo hypotézy určujú smer praktickej alebo analytickej časti.',
          'Pri obhajobe je dôležité ukázať ich prepojenie s výsledkami.',
        ],
      ),
      speakerNotes:
        'Predstavte, čo presne práca skúmala alebo overovala. Ak boli použité hypotézy, vysvetlite ich význam.',
      visualSuggestion: 'Dvojstĺpcové rozloženie: otázky a hypotézy.',
    },
    {
      title: 'Teoretické východiská',
      layout: 'bullets',
      estimatedMinutes: 3,
      bullets: fallbackBullets(
        pickSentences(text, [/teoret/i, /literat/i, /autor/i, /koncept/i], 5),
        [
          'Teoretická časť vytvára odborný základ pre riešenú problematiku.',
          'Kľúčové pojmy je potrebné vysvetliť stručne a vecne.',
          'Teória musí byť prepojená s praktickou alebo analytickou časťou.',
        ],
      ),
      speakerNotes:
        'Nevymenúvajte celú teóriu. Vyberte iba tie pojmy a autorov, ktoré priamo podporujú cieľ práce.',
      visualSuggestion: 'Schéma hlavných pojmov.',
    },
    {
      title: 'Metodológia práce',
      layout: 'split',
      estimatedMinutes: 3,
      bullets: methodology,
      speakerNotes:
        'Vysvetlite, aké metódy boli použité, prečo boli vhodné a ako pomohli splniť cieľ práce.',
      visualSuggestion: 'Procesná schéma metodického postupu.',
    },
    {
      title: 'Praktická alebo analytická časť',
      layout: 'bullets',
      estimatedMinutes: 3,
      bullets: fallbackBullets(
        pickSentences(text, [/praktick/i, /analytick/i, /dáta/i, /vzork/i], 5),
        [
          'Praktická časť ukazuje vlastné spracovanie témy.',
          'Je potrebné predstaviť zdroj dát, postup a spôsob vyhodnotenia.',
          'Táto časť prepája teóriu s konkrétnymi zisteniami.',
        ],
      ),
      speakerNotes:
        'Stručne popíšte, čo bolo predmetom praktickej časti a ako ste postupovali.',
      visualSuggestion: 'Prehľadová karta: dáta, vzorka, postup.',
    },
    {
      title: 'Hlavné výsledky práce',
      layout: 'bullets',
      estimatedMinutes: 4,
      bullets: results,
      speakerNotes:
        'Pri výsledkoch hovorte konkrétne. Vyberte najdôležitejšie zistenia a vysvetlite ich význam.',
      visualSuggestion: 'Graf alebo tabuľka hlavných výsledkov.',
    },
    {
      title: 'Interpretácia výsledkov',
      layout: 'split',
      estimatedMinutes: 3,
      bullets: [
        'Výsledky je potrebné interpretovať vo vzťahu k cieľu práce.',
        'Diskusia ukazuje, čo zistenia znamenajú pre riešený problém.',
        'Interpretácia prepája výsledky s teoretickými východiskami.',
      ],
      speakerNotes:
        'Neopakujte len výsledky. Vysvetlite, čo znamenajú a ako podporujú záver práce.',
      visualSuggestion: 'Porovnanie: výsledok verzus význam.',
    },
    {
      title: 'Prínos práce',
      layout: 'quote',
      estimatedMinutes: 2,
      bullets: fallbackBullets(
        pickSentences(text, [/prínos/i, /odporúč/i, /využiť/i, /aplik/i], 5),
        [
          'Prínos práce spočíva v odbornom spracovaní riešenej problematiky.',
          'Výsledky môžu byť využité v praxi alebo ako podklad pre ďalší výskum.',
          'Vlastný prínos autora je potrebné pomenovať konkrétne.',
        ],
      ),
      speakerNotes:
        'Zdôraznite, čo práca priniesla a komu môžu byť výsledky užitočné.',
      visualSuggestion: 'Dve karty: prínos pre prax a prínos pre odbor.',
    },
    {
      title: 'Limity práce',
      layout: 'bullets',
      estimatedMinutes: 2,
      bullets: [
        'Každá práca má obmedzenia, ktoré je vhodné pomenovať vecne.',
        'Limity môžu súvisieť s rozsahom, dátami, metódou alebo dostupnosťou zdrojov.',
        'Pomenovanie limitov ukazuje odbornú zrelosť autora.',
      ],
      speakerNotes:
        'Limity neprezentujte ako slabinu, ale ako realistické vymedzenie práce.',
      visualSuggestion: 'Tri karty limitov.',
    },
    {
      title: 'Odporúčania a ďalší výskum',
      layout: 'bullets',
      estimatedMinutes: 2,
      bullets: [
        'Na základe výsledkov možno formulovať odporúčania.',
        'Tému je možné ďalej rozvíjať v širšej vzorke alebo inom kontexte.',
        'Odporúčania majú vychádzať z výsledkov, nie zo všeobecných tvrdení.',
      ],
      speakerNotes:
        'Ukážte, ako sa dá na prácu nadviazať a ako môžu byť výsledky využité.',
      visualSuggestion: 'Roadmapa ďalšieho výskumu.',
    },
    {
      title: 'Možné otázky komisie',
      layout: 'bullets',
      estimatedMinutes: 3,
      bullets: [
        'Prečo ste si vybrali túto tému?',
        'Ako cieľ práce súvisí s použitou metodológiou?',
        'Aké boli hlavné výsledky práce?',
        'Aký je hlavný prínos práce?',
        'Ako by bolo možné vo výskume pokračovať?',
      ],
      speakerNotes:
        'Na otázky odpovedajte stručne a vecne. Najprv povedzte odpoveď, potom krátke zdôvodnenie.',
      visualSuggestion: 'Slide otázky a odpovede.',
    },
    {
      title: 'Záver obhajoby',
      layout: 'closing',
      estimatedMinutes: 2,
      bullets: [
        'Práca splnila stanovený cieľ v rozsahu dostupných dát a metodiky.',
        'Výsledky poskytujú podklad pre odborné zhodnotenie témy.',
        'Ďakujem za pozornosť a som pripravený/pripravená odpovedať na otázky.',
      ],
      speakerNotes:
        'Záver povedzte sebavedomo, krátko a profesionálne. Nepredlžujte ho zbytočne.',
      visualSuggestion: 'Čistý záverečný slide s poďakovaním.',
    },
  ];
}

function prepareSlidesFor40Minutes(slides: DefenseSlide[]): DefenseSlide[] {
  const cleanSlides = slides
    .map((slide, index) => ({
      title: cleanInline(slide.title || `Snímka ${index + 1}`),
      layout: slide.layout || 'bullets',
      bullets: Array.isArray(slide.bullets)
        ? slide.bullets.map(cleanInline).filter(Boolean).slice(0, 5)
        : [],
      speakerNotes: cleanText(slide.speakerNotes),
      visualSuggestion: cleanInline(slide.visualSuggestion),
      estimatedMinutes: Number(slide.estimatedMinutes || 2) || 2,
    }))
    .filter((slide) => slide.title && slide.bullets.length);

  if (cleanSlides.length >= 18) {
    return cleanSlides.slice(0, MAX_RENDERED_SLIDES);
  }

  return cleanSlides;
}

function addBackground(slide: PptxSlide) {
  slide.background = { color: THEME.bg };

  slide.addShape(ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: THEME.bg },
    line: { color: THEME.bg },
  });

  slide.addShape(ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: 0.34,
    fill: { color: THEME.accent },
    line: { color: THEME.accent },
  });

  slide.addShape(ShapeType.rect, {
    x: 0,
    y: 0.34,
    w: SLIDE_W,
    h: 0.05,
    fill: { color: THEME.accent2 },
    line: { color: THEME.accent2 },
  });

  slide.addShape(ShapeType.line, {
    x: 0.65,
    y: 6.95,
    w: 12,
    h: 0,
    line: { color: THEME.border, width: 1 },
  });
}

function addHeader(slide: PptxSlide, eyebrow: string, title: string) {
  const safeTitle =
    title.length > 92 ? `${title.slice(0, 89).trim()}…` : title;

  slide.addText(eyebrow.toUpperCase(), {
    x: 0.65,
    y: 0.55,
    w: 5.8,
    h: 0.25,
    fontFace: 'Arial',
    fontSize: 8.5,
    bold: true,
    color: THEME.accent,
    margin: 0,
  });

  slide.addText(safeTitle, {
    x: 0.65,
    y: 0.86,
    w: 11.95,
    h: 0.86,
    fontFace: 'Arial',
    fontSize: safeTitle.length > 74 ? 21 : safeTitle.length > 54 ? 24 : 27,
    bold: true,
    color: THEME.title,
    fit: 'shrink',
    margin: 0,
    breakLine: false,
    valign: 'middle',
  });
}

function addFooter(slide: PptxSlide, slideNumber: number, workTitle: string) {
  slide.addText(String(slideNumber).padStart(2, '0'), {
    x: 0.65,
    y: 7.08,
    w: 0.75,
    h: 0.18,
    fontFace: 'Arial',
    fontSize: 8,
    bold: true,
    color: THEME.muted,
    margin: 0,
  });

  slide.addText(workTitle, {
    x: 1.35,
    y: 7.06,
    w: 9.6,
    h: 0.22,
    fontFace: 'Arial',
    fontSize: 8,
    color: THEME.muted,
    fit: 'shrink',
    margin: 0,
  });

  slide.addText('ZEDPERA', {
    x: 11.45,
    y: 7.05,
    w: 1.25,
    h: 0.22,
    fontFace: 'Arial',
    fontSize: 8,
    bold: true,
    color: THEME.accent,
    margin: 0,
    align: 'right',
  });
}

function addSpeakerNotes(slide: PptxSlide, notes?: string) {
  const clean = cleanText(notes);

  if (!clean) return;

  try {
    slide.addNotes(clean);
  } catch {
    // Poznámky nesmú zhodiť export.
  }
}

function addCoverSlide(
  pptxDoc: PptxGen,
  title: string,
  defenseType: string,
) {
  const slide = pptxDoc.addSlide();

  addBackground(slide);

  slide.addText('ZEDPERA', {
    x: 0.78,
    y: 0.08,
    w: 1.45,
    h: 0.18,
    fontFace: 'Arial',
    fontSize: 8,
    bold: true,
    color: THEME.headerText,
    margin: 0,
  });

  slide.addText(defenseType.toUpperCase(), {
    x: 0.82,
    y: 1.35,
    w: 9.8,
    h: 0.32,
    fontFace: 'Arial',
    fontSize: 11,
    bold: true,
    color: THEME.accent2,
    margin: 0,
  });

  slide.addText(title, {
    x: 0.8,
    y: 1.95,
    w: 11.85,
    h: 2.05,
    fontFace: 'Arial',
    fontSize: title.length > 95 ? 28 : 36,
    bold: true,
    color: THEME.title,
    fit: 'shrink',
    margin: 0,
    breakLine: false,
  });

  slide.addShape(ShapeType.rect, {
    x: 0.82,
    y: 4.34,
    w: 4.4,
    h: 0.05,
    fill: { color: THEME.accent },
    line: { color: THEME.accent },
  });

  slide.addText('Prezentácia na obhajobu záverečnej práce', {
    x: 0.82,
    y: 4.65,
    w: 10.8,
    h: 0.32,
    fontFace: 'Arial',
    fontSize: 16,
    bold: true,
    color: THEME.text,
    margin: 0,
  });

  slide.addText('AI spracovanie podľa profilu práce a nahratého dokumentu · 40 minút', {
    x: 0.82,
    y: 6.55,
    w: 11.5,
    h: 0.28,
    fontFace: 'Arial',
    fontSize: 10,
    color: THEME.muted,
    margin: 0,
  });
}

function addAgendaSlide(pptxDoc: PptxGen, slides: DefenseSlide[], workTitle: string) {
  const slide = pptxDoc.addSlide();

  addBackground(slide);
  addHeader(slide, 'Obsah prezentácie', 'Agenda obhajoby');

  const agenda = slides.map((item) => item.title).slice(0, 10);
  const left = agenda.slice(0, 5);
  const right = agenda.slice(5, 10);

  [left, right].forEach((items, columnIndex) => {
    const x = columnIndex === 0 ? 0.9 : 6.85;

    items.forEach((item, index) => {
      const globalIndex = columnIndex === 0 ? index + 1 : index + 6;
      const y = 1.95 + index * 0.76;

      slide.addShape(ShapeType.roundRect, {
        x,
        y,
        w: 0.5,
        h: 0.5,
        rectRadius: 0.04,
        fill: {
          color: globalIndex % 2 === 0 ? THEME.accent2 : THEME.accent,
        },
        line: {
          color: globalIndex % 2 === 0 ? THEME.accent2 : THEME.accent,
        },
      } as any);

      slide.addText(String(globalIndex), {
        x,
        y: y + 0.13,
        w: 0.5,
        h: 0.15,
        fontFace: 'Arial',
        fontSize: 8,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        margin: 0,
      });

      slide.addText(item, {
        x: x + 0.72,
        y: y + 0.07,
        w: 4.85,
        h: 0.36,
        fontFace: 'Arial',
        fontSize: 13.5,
        bold: true,
        color: THEME.text,
        fit: 'shrink',
        margin: 0,
      });
    });
  });

  addFooter(slide, 1, workTitle);
}

function addBulletSlide(
  pptxDoc: PptxGen,
  slideData: DefenseSlide,
  slideNumber: number,
  workTitle: string,
) {
  const slide = pptxDoc.addSlide();

  addBackground(slide);
  addHeader(slide, `Snímka ${slideNumber}`, slideData.title);

  const bullets = slideData.bullets.slice(0, 5);
  const fontSize =
    bullets.join(' ').length > 520 ? 13.5 : bullets.length >= 5 ? 14.5 : 16;

  const cardHeight = bullets.length >= 5 ? 0.74 : bullets.length === 4 ? 0.88 : 1.05;
  const gap = bullets.length >= 5 ? 0.11 : 0.16;

  bullets.forEach((bullet, index) => {
    const y = 1.86 + index * (cardHeight + gap);

    slide.addShape(ShapeType.roundRect, {
      x: 0.85,
      y,
      w: 11.75,
      h: cardHeight,
      rectRadius: 0.06,
      fill: { color: index % 2 === 0 ? THEME.card : THEME.card2 },
      line: { color: THEME.border, transparency: 0, width: 1 },
    } as any);

    slide.addShape(ShapeType.rect, {
      x: 0.85,
      y,
      w: 0.11,
      h: cardHeight,
      fill: { color: index % 2 === 0 ? THEME.accent : THEME.accent2 },
      line: { color: index % 2 === 0 ? THEME.accent : THEME.accent2 },
    });

    slide.addText(bullet, {
      x: 1.18,
      y: y + 0.11,
      w: 10.92,
      h: cardHeight - 0.2,
      fontFace: 'Arial',
      fontSize,
      color: THEME.text,
      fit: 'shrink',
      valign: 'middle',
      margin: 0.01,
      breakLine: false,
    });
  });

  if (slideData.visualSuggestion) {
    const suggestion =
      slideData.visualSuggestion.length > 135
        ? `${slideData.visualSuggestion.slice(0, 132).trim()}…`
        : slideData.visualSuggestion;

    slide.addShape(ShapeType.roundRect, {
      x: 0.85,
      y: 6.34,
      w: 11.75,
      h: 0.32,
      rectRadius: 0.04,
      fill: { color: THEME.soft },
      line: { color: THEME.border, transparency: 0 },
    } as any);

    slide.addText(`Vizuál: ${suggestion}`, {
      x: 1.05,
      y: 6.41,
      w: 11.35,
      h: 0.16,
      fontFace: 'Arial',
      fontSize: 7.4,
      italic: true,
      color: THEME.muted,
      fit: 'shrink',
      margin: 0,
    });
  }

  addSpeakerNotes(slide, slideData.speakerNotes);
  addFooter(slide, slideNumber, workTitle);
}

function addClosingSlide(
  pptxDoc: PptxGen,
  title: string,
  slideNumber: number,
) {
  const slide = pptxDoc.addSlide();

  addBackground(slide);

  slide.addText('Ďakujem za pozornosť', {
    x: 1.0,
    y: 2.18,
    w: 11.3,
    h: 0.8,
    fontFace: 'Arial',
    fontSize: 39,
    bold: true,
    color: THEME.title,
    align: 'center',
    margin: 0,
  });

  slide.addText('Priestor na otázky komisie', {
    x: 1.0,
    y: 3.25,
    w: 11.3,
    h: 0.35,
    fontFace: 'Arial',
    fontSize: 17,
    bold: true,
    color: THEME.text,
    align: 'center',
    margin: 0,
  });

  slide.addShape(ShapeType.rect, {
    x: 4.55,
    y: 4.15,
    w: 4.2,
    h: 0.05,
    fill: { color: THEME.accent },
    line: { color: THEME.accent },
  });

  addFooter(slide, slideNumber, title);
}

async function buildPresentation(work: NormalizedWork): Promise<GeneratedPptxFile> {
  const shouldAiGenerate = true;

  let slides = work.slides;

  if (shouldAiGenerate) {
    try {
      slides = await generateSlidesWithAi(work);
    } catch (error) {
      console.error('AI_SLIDE_GENERATION_ERROR:', error);
      slides = work.slides.length ? work.slides : buildFallbackSlides(work);
    }
  }

  slides = prepareSlidesFor40Minutes(slides);

  if (!slides.length) {
    slides = buildFallbackSlides(work);
  }

  const pptxDoc = new pptxgen();

  pptxDoc.layout = 'LAYOUT_WIDE';
  pptxDoc.author = 'ZEDPERA';
  pptxDoc.company = 'ZEDPERA';
  pptxDoc.subject = work.defenseType;
  pptxDoc.title = work.title;

  (pptxDoc as any).lang = 'sk-SK';

  pptxDoc.theme = {
    headFontFace: 'Arial',
    bodyFontFace: 'Arial',
    lang: 'sk-SK',
  } as any;

  addCoverSlide(pptxDoc, work.title, work.defenseType);
  addAgendaSlide(pptxDoc, slides, work.title);

  slides.slice(0, MAX_RENDERED_SLIDES).forEach((slide, index) => {
    addBulletSlide(pptxDoc, slide, index + 2, work.title);
  });

  addClosingSlide(pptxDoc, work.title, slides.length + 2);

  const output = await (pptxDoc as any).write({
    outputType: 'nodebuffer',
  });

  const buffer = Buffer.isBuffer(output)
    ? output
    : output instanceof ArrayBuffer
      ? Buffer.from(output)
      : ArrayBuffer.isView(output)
        ? Buffer.from(output.buffer, output.byteOffset, output.byteLength)
        : Buffer.from(String(output || ''), 'binary');

  if (!buffer.length) {
    throw new Error(`PPTX export vrátil prázdny súbor pre prácu: ${work.title}`);
  }

  return {
    fileName: `${safeFileName(work.title)}.pptx`,
    title: work.title,
    buffer,
    slidesCount: slides.length + 3,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DefensePptxRequestBody;
    const works = normalizeWorks(body);

    if (!works.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba práca, profil alebo text dokumentu na export.',
        },
        { status: 400 },
      );
    }

    const files: GeneratedPptxFile[] = [];

    for (const work of works) {
      files.push(await buildPresentation(work));
    }

    if (files.length === 1) {
      const file = files[0];

      return new NextResponse(new Uint8Array(file.buffer), {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${file.fileName}"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      mode: 'batch',
      count: files.length,
      files: files.map((file) => ({
        fileName: file.fileName,
        title: file.title,
        slidesCount: file.slidesCount,
        mimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        base64: file.buffer.toString('base64'),
      })),
    });
  } catch (error) {
    console.error('PPTX_EXPORT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa exportovať PowerPoint.',
      },
      { status: 500 },
    );
  }
}