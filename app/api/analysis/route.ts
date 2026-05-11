import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
};

type UploadedAttachment = {
  id?: string;
  name?: string;
  filename?: string;
  originalName?: string;
  type?: string;
  mimeType?: string;
  size?: number;
  extension?: string;
  url?: string;
  path?: string;
  text?: string;
  content?: string;
  extractedText?: string;
  markdown?: string;
  rawText?: string;
};

type AnalysisRequest = {
  analysisGoal?: string;
  hypotheses?: string;
  methodology?: string;
  dataDescription?: string;
  analysisType?: string;
  software?: string;
  outputStyle?: string;
  activeProfile?: SavedProfile | null;
  attachments?: UploadedAttachment[];

  mathMode?: 'mvp' | 'professional' | 'school';
  generateExamples?: boolean;
  examplesTopic?: string;
  examplesCount?: number;
  useWolframVerification?: boolean;
  usePythonStack?: boolean;
  useMathJsFrontend?: boolean;
  useGeoGebra?: boolean;
};

type NumericColumnStats = {
  column: string;
  count: number;
  missing: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  varianceSample: number | null;
  standardDeviationSample: number | null;
};

type ParsedNumericDataset = {
  headers: string[];
  rowsCount: number;
  numericColumns: Record<string, number[]>;
  stats: NumericColumnStats[];
  correlationMatrix: Record<string, Record<string, number | null>>;
};

type WolframCheckResult = {
  ok: boolean;
  query: string;
  answer?: string;
  error?: string;
};

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function normalizeAttachments(value: unknown): UploadedAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item) => item && typeof item === 'object') as UploadedAttachment[];
}

function getAttachmentText(file: UploadedAttachment) {
  return cleanText(
    file.text ||
      file.content ||
      file.extractedText ||
      file.markdown ||
      file.rawText ||
      '',
  );
}

function getAttachmentName(file: UploadedAttachment, index: number) {
  return (
    file.name ||
    file.filename ||
    file.originalName ||
    `vysledky-${index + 1}`
  );
}

function formatAttachmentsBlock(attachments: UploadedAttachment[]) {
  if (!attachments.length) {
    return 'Neboli priložené žiadne súbory.';
  }

  return attachments
    .map((file, index) => {
      const text = getAttachmentText(file);

      return `
SÚBOR ${index + 1}
Názov: ${getAttachmentName(file, index)}
Typ: ${file.type || file.mimeType || file.extension || 'nezadané'}
Veľkosť: ${file.size || 'nezadané'}
URL / cesta: ${file.url || file.path || 'nezadané'}

EXTRAHOVANÝ OBSAH:
"""
${
  text ||
  'Text zo súboru nebol dostupný. Skontroluj /api/uploads, aby pri DOCX/XLSX/PDF vracalo pole text, content alebo extractedText.'
}
"""
`;
    })
    .join('\n\n----------------------------------------\n\n');
}

function getTotalAttachmentTextLength(attachments: UploadedAttachment[]) {
  return attachments.reduce((total, file) => {
    return total + getAttachmentText(file).length;
  }, 0);
}

function getKeywords(profile?: SavedProfile | null) {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.join(', ');
  }

  return 'nezadané';
}

function detectDelimiter(line: string) {
  const delimiters = [';', ',', '\t', '|'];
  let bestDelimiter = ';';
  let bestCount = 0;

  for (const delimiter of delimiters) {
    const count = line.split(delimiter).length;

    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function parseSkNumber(value: string): number | null {
  const cleaned = String(value || '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '');

  if (!cleaned) return null;

  const number = Number(cleaned);

  if (!Number.isFinite(number)) return null;

  return number;
}

function median(values: number[]) {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function mean(values: number[]) {
  if (!values.length) return null;

  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function sampleVariance(values: number[]) {
  if (values.length < 2) return null;

  const avg = mean(values);

  if (avg === null) return null;

  const squaredDiffs = values.map((item) => Math.pow(item - avg, 2));
  const sum = squaredDiffs.reduce((acc, item) => acc + item, 0);

  return sum / (values.length - 1);
}

function sampleStandardDeviation(values: number[]) {
  const variance = sampleVariance(values);

  if (variance === null) return null;

  return Math.sqrt(variance);
}

function pearsonCorrelation(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);

  if (length < 2) return null;

  const x = a.slice(0, length);
  const y = b.slice(0, length);

  const meanX = mean(x);
  const meanY = mean(y);

  if (meanX === null || meanY === null) return null;

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let index = 0; index < length; index += 1) {
    const dx = x[index] - meanX;
    const dy = y[index] - meanY;

    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }

  const denominator = Math.sqrt(denominatorX * denominatorY);

  if (!denominator) return null;

  return numerator / denominator;
}

function roundNumber(value: number | null, decimals = 4) {
  if (value === null || !Number.isFinite(value)) return null;

  return Number(value.toFixed(decimals));
}

function parseNumericDatasetFromText(text: string): ParsedNumericDataset | null {
  const cleaned = cleanText(text);

  if (!cleaned) return null;

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const delimiter = detectDelimiter(line);
      return line.split(delimiter).length >= 2;
    });

  if (lines.length < 2) return null;

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = lines[0]
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);

  if (rawHeaders.length < 2) return null;

  const headers = rawHeaders.map((header, index) => {
    return header || `Premenná ${index + 1}`;
  });

  const numericColumns: Record<string, number[]> = {};
  const missingCount: Record<string, number> = {};

  headers.forEach((header) => {
    numericColumns[header] = [];
    missingCount[header] = 0;
  });

  const dataRows = lines.slice(1);

  dataRows.forEach((line) => {
    const cells = line.split(delimiter);

    headers.forEach((header, index) => {
      const value = parseSkNumber(cells[index] || '');

      if (value === null) {
        missingCount[header] += 1;
      } else {
        numericColumns[header].push(value);
      }
    });
  });

  const filteredNumericColumns: Record<string, number[]> = {};

  Object.entries(numericColumns).forEach(([column, values]) => {
    if (values.length >= 2) {
      filteredNumericColumns[column] = values;
    }
  });

  const numericColumnNames = Object.keys(filteredNumericColumns);

  if (numericColumnNames.length === 0) return null;

  const stats: NumericColumnStats[] = numericColumnNames.map((column) => {
    const values = filteredNumericColumns[column];

    return {
      column,
      count: values.length,
      missing: missingCount[column] || 0,
      mean: roundNumber(mean(values)),
      median: roundNumber(median(values)),
      min: roundNumber(Math.min(...values)),
      max: roundNumber(Math.max(...values)),
      varianceSample: roundNumber(sampleVariance(values)),
      standardDeviationSample: roundNumber(sampleStandardDeviation(values)),
    };
  });

  const correlationMatrix: Record<string, Record<string, number | null>> = {};

  numericColumnNames.forEach((leftColumn) => {
    correlationMatrix[leftColumn] = {};

    numericColumnNames.forEach((rightColumn) => {
      correlationMatrix[leftColumn][rightColumn] = roundNumber(
        pearsonCorrelation(
          filteredNumericColumns[leftColumn],
          filteredNumericColumns[rightColumn],
        ),
      );
    });
  });

  return {
    headers,
    rowsCount: dataRows.length,
    numericColumns: filteredNumericColumns,
    stats,
    correlationMatrix,
  };
}

function buildLocalStatisticsBlock(dataset: ParsedNumericDataset | null) {
  if (!dataset) {
    return `
LOKÁLNY ŠTATISTICKÝ VÝPOČET V API:
Nepodarilo sa spoľahlivo rozpoznať tabuľkové číselné dáta. Ak používateľ nahral Excel alebo CSV, backend /api/uploads musí vrátiť extrahovaný text v tvare tabuľky, ideálne CSV so stĺpcami.
`;
  }

  return `
LOKÁLNY ŠTATISTICKÝ VÝPOČET V API:
Bol rozpoznaný jednoduchý číselný dataset.

Počet riadkov: ${dataset.rowsCount}
Rozpoznané číselné premenné: ${Object.keys(dataset.numericColumns).join(', ')}

DESKRIPTÍVNA ŠTATISTIKA:
${dataset.stats
  .map((item) => {
    return `- ${item.column}: N=${item.count}, chýbajúce=${item.missing}, priemer=${item.mean}, medián=${item.median}, SD=${item.standardDeviationSample}, minimum=${item.min}, maximum=${item.max}`;
  })
  .join('\n')}

KORELAČNÁ MATICA PEARSON:
${Object.entries(dataset.correlationMatrix)
  .map(([rowName, row]) => {
    const values = Object.entries(row)
      .map(([columnName, value]) => `${columnName}: ${value}`)
      .join(', ');

    return `- ${rowName}: ${values}`;
  })
  .join('\n')}
`;
}

function buildMathStackBlock({
  mathMode,
  usePythonStack,
  useMathJsFrontend,
  useWolframVerification,
  useGeoGebra,
  generateExamples,
  examplesTopic,
  examplesCount,
}: {
  mathMode: string;
  usePythonStack: boolean;
  useMathJsFrontend: boolean;
  useWolframVerification: boolean;
  useGeoGebra: boolean;
  generateExamples: boolean;
  examplesTopic: string;
  examplesCount: number;
}) {
  return `
MATEMATICKO-ŠTATISTICKÝ STACK PLATFORMY:

Zvolený režim: ${mathMode}

AI VRSTVA:
- OpenAI API vytvorí zadanie, vysvetlenie, interpretáciu, akademický text a spätnú väzbu.
- AI nesmie predstierať výpočty, ak ich nevie overiť z dát.

ŠTATISTIKA:
- Odporúčaný profesionálny backend: Python + NumPy + SciPy.
- Použitie: normálne rozdelenie, regresie, ANOVA, hypotézy, korelácie, random datasety, testovanie normality, intervaly spoľahlivosti.
- Ak je dostupný Python/FastAPI/Django backend, odporuč konkrétne výpočty a štruktúru endpointov.
- V tomto Next.js API sa robí len jednoduchý MVP fallback: deskriptívna štatistika a Pearsonova korelácia z číselnej tabuľky, ak sa dá rozpoznať.

MATEMATIKA:
- Profesionálne overenie výsledkov: Wolfram API.
- Použitie: kontrola rovníc, symbolická matematika, derivácie, integrály, algebra, presné výpočty.
- Wolfram overenie je zapnuté: ${useWolframVerification ? 'áno' : 'nie'}.

FRONTEND:
- MathJS: výpočty, rovnice, grafy, matice, algebra vo webovej aplikácii.
- MathJS frontend je odporúčaný: ${useMathJsFrontend ? 'áno' : 'nie'}.
- KaTeX: pekné zobrazenie vzorcov.
- GeoGebra API: interaktívne grafy, geometria, algebra tools, embed do webu.
- GeoGebra integrácia je odporúčaná: ${useGeoGebra ? 'áno' : 'nie'}.

PDF / TESTY:
- LaTeX: profesionálna sadzba matematických príkladov a riešení.
- Puppeteer: export HTML/LaTeX výstupov do PDF.
- Vhodné pre generovanie pracovných listov, testov a vzorových riešení.

GENEROVANIE PRÍKLADOV:
- Požadované generovanie príkladov: ${generateExamples ? 'áno' : 'nie'}.
- Téma príkladov: ${examplesTopic || 'nezadané'}.
- Počet príkladov: ${examplesCount || 0}.

IDEÁLNY MVP:
- OpenAI API
- Python backend s NumPy/SciPy
- MathJS frontend
- KaTeX na vzorce
- Puppeteer na PDF

NAJPRESNEJŠÍ REŽIM:
- OpenAI + Wolfram API + Python/NumPy/SciPy

REŽIM PRE ŠKOLY:
- OpenAI + Python/NumPy/SciPy + GeoGebra API + KaTeX + PDF export
`;
}

function buildPrompt({
  analysisGoal,
  hypotheses,
  methodology,
  dataDescription,
  analysisType,
  software,
  outputStyle,
  activeProfile,
  attachmentsBlock,
  localStatisticsBlock,
  mathStackBlock,
}: {
  analysisGoal: string;
  hypotheses: string;
  methodology: string;
  dataDescription: string;
  analysisType: string;
  software: string;
  outputStyle: string;
  activeProfile?: SavedProfile | null;
  attachmentsBlock: string;
  localStatisticsBlock: string;
  mathStackBlock: string;
}) {
  return `
Si odborník na štatistickú analýzu dát, metodológiu výskumu, matematiku, akademické písanie a návrh výpočtových modulov pre edukačnú platformu.

Tvojou úlohou je:
1. spracovať výsledky zo štatistického softvéru,
2. vybrať vhodné výpočty podľa cieľa práce,
3. pripraviť interpretáciu do akademickej práce,
4. odporučiť, ktoré výpočty má robiť Python/NumPy/SciPy, ktoré MathJS, ktoré Wolfram a ktoré GeoGebra,
5. ak používateľ chce príklady alebo testy, navrhnúť generovanie matematických príkladov, datasetov, grafov a riešení.

JAZYK ODPOVEDE:
Slovenčina.

PROFIL PRÁCE:
- Názov práce: ${activeProfile?.title || 'nezadané'}
- Téma: ${activeProfile?.topic || 'nezadané'}
- Typ práce: ${activeProfile?.type || 'akademická práca'}
- Odbor: ${activeProfile?.field || 'nezadané'}
- Cieľ práce z profilu: ${activeProfile?.goal || 'nezadané'}
- Hypotézy z profilu: ${activeProfile?.hypotheses || 'nezadané'}
- Výskumné otázky z profilu: ${activeProfile?.researchQuestions || 'nezadané'}
- Metodológia z profilu: ${activeProfile?.methodology || 'nezadané'}
- Kľúčové slová: ${getKeywords(activeProfile)}

NASTAVENIE ANALÝZY:
- Softvér / zdroj výsledkov: ${software}
- Typ analýzy: ${analysisType}
- Typ výstupu: ${outputStyle}

CIEĽ PRÁCE / CIEĽ ANALYTICKEJ ČASTI:
"""
${analysisGoal || activeProfile?.goal || 'nezadané'}
"""

HYPOTÉZY / VÝSKUMNÉ OTÁZKY:
"""
${hypotheses || activeProfile?.hypotheses || activeProfile?.researchQuestions || 'nezadané'}
"""

METODIKA / OPIS PREMENNÝCH:
"""
${methodology || activeProfile?.methodology || 'nezadané'}
"""

DOPLNKOVÝ OPIS DÁT:
"""
${dataDescription || 'nezadané'}
"""

PRILOŽENÉ VÝSLEDKY:
${attachmentsBlock}

${localStatisticsBlock}

${mathStackBlock}

DÔLEŽITÉ METODICKÉ POKYNY:
- Nevyberaj všetky výpočty automaticky.
- Vyber iba výpočty, ktoré sú vhodné podľa cieľa práce, hypotéz a typu premenných.
- Pri demografických kategóriách použi frekvenčnú analýzu.
- Pri veku alebo iných číselných premenných použi primerané deskriptívne ukazovatele: priemer, medián, smerodajnú odchýlku, minimum a maximum.
- Pri dotazníkových položkách neprepisuj mechanicky všetky položky, ak nie sú podstatné.
- Pri dotazníkoch odporúčaj používať najmä celkové skóre a subškály.
- Pri normalite vysvetli, čo znamená Shapiro-Wilk a p-hodnota.
- Pri ordinálnych škálach buď opatrný s priemerom a odporúčaj medián/frekvencie, ak je to vhodnejšie.
- Rozlišuj Percent a Valid Percent. Ak sú v dátach veľké počty chýbajúcich hodnôt, upozorni, že interpretovať treba Valid Percent.
- Ak je cieľom opis výskumného súboru, zameraj sa na frekvencie a percentá.
- Ak je cieľom opis dotazníkov, zameraj sa na škálové skóre, priemer, SD, prípadne medián.
- Ak sú hypotézy korelačné, odporuč vhodný korelačný test podľa normality.
- Ak sú hypotézy rozdielové, odporuč vhodný test podľa počtu skupín, typu premennej a normality.
- Ak je závislá premenná spojitá a prediktorov je viac, odporuč regresiu.
- Ak sú porovnávané viac ako dve skupiny a premenná je približne normálna, odporuč ANOVA.
- Ak normalita nie je splnená alebo ide o ordinálne dáta, odporuč neparametrické alternatívy.
- Ak nie je možné niečo rozhodnúť bez pôvodných dát, jasne to uveď.
- Výpočty neoznačuj ako definitívne, ak nie sú overené Pythonom, SciPy alebo Wolframom.
- Ak sú k dispozícii lokálne vypočítané hodnoty z API, môžeš ich použiť, ale uveď, že ide o automatický orientačný výpočet.

PRAVIDLÁ PRE NÁVRH TECHNICKÉHO RIEŠENIA:
- NumPy a SciPy odporúčaj na backendové štatistické výpočty.
- MathJS odporúčaj na frontendové výpočty, rovnice, matice, algebru a jednoduché grafy.
- Wolfram API odporúčaj na presné matematické overenie.
- GeoGebra API odporúčaj na interaktívne školské grafy, geometriu a algebra tools.
- KaTeX odporúčaj na zobrazovanie vzorcov.
- LaTeX + Puppeteer odporúčaj na generovanie PDF testov a pracovných listov.
- Pri MVP odporuč najlacnejší stack: OpenAI API + Python backend + MathJS frontend.
- Pri najpresnejšom režime odporuč OpenAI + Wolfram.
- Pre školy odporuč GeoGebra integráciu.

Vráť odpoveď presne v tomto formáte:

=== VÝBER VÝPOČTOV DO PRÁCE ===
Napíš, ktoré výpočty majú ísť do analytickej časti a ktoré nie.

=== OPIS VÝSKUMNÉHO SÚBORU ===
Priprav text vhodný do práce. Použi frekvencie, validné percentá a vek, ak sú dostupné.

=== OPIS DOTAZNÍKOV / ŠKÁL ===
Priprav text k deskriptívnej štatistike dotazníkov, celkových skóre a subškál.

=== NORMALITA A VOĽBA TESTOV ===
Vysvetli normalitu a odporuč, či voliť parametrické alebo neparametrické testy.

=== ODPORÚČANÉ TESTY PODĽA HYPOTÉZ ===
Ku každej hypotéze alebo výskumnej otázke odporuč vhodný test.

=== TABUĽKY VHODNÉ DO PRÁCE ===
Navrhni, aké tabuľky majú byť v práci.

=== TEXT DO ANALYTICKEJ ČASTI ===
Napíš súvislý akademický text, ktorý možno vložiť do záverečnej práce.

=== MATEMATICKO-ŠTATISTICKÝ STACK PRE PLATFORMU ===
Navrhni technické riešenie pre OpenAI, NumPy, SciPy, MathJS, Wolfram, GeoGebra, KaTeX, LaTeX a Puppeteer.

=== GENEROVANIE PRÍKLADOV A DATASETOV ===
Ak používateľ chce príklady, navrhni zadania, datasety, riešenia a spôsob overenia výsledkov.

=== ČO NEUVÁDZAŤ DO PRÁCE ===
Vypíš výsledky, ktoré sú nadbytočné alebo metodicky nevhodné.

=== KONTROLNÝ CHECKLIST ===
Vypíš, čo ešte treba skontrolovať pred finálnym spracovaním analytickej časti.
`;
}

function extractSection(text: string, section: string) {
  const marker = `=== ${section} ===`;
  const start = text.indexOf(marker);

  if (start === -1) return '';

  const rest = text.slice(start + marker.length);
  const next = rest.search(/\n=== .+? ===/);

  if (next === -1) return rest.trim();

  return rest.slice(0, next).trim();
}

function buildCombinedInputText({
  dataDescription,
  attachments,
}: {
  dataDescription: string;
  attachments: UploadedAttachment[];
}) {
  const attachmentTexts = attachments
    .map((file) => getAttachmentText(file))
    .filter(Boolean)
    .join('\n\n');

  return [dataDescription, attachmentTexts].filter(Boolean).join('\n\n');
}

async function verifyWithWolfram(query: string): Promise<WolframCheckResult> {
  const appId = process.env.WOLFRAM_APP_ID;

  if (!appId) {
    return {
      ok: false,
      query,
      error:
        'WOLFRAM_APP_ID nie je nastavené. Wolfram overenie bolo preskočené.',
    };
  }

  if (!query.trim()) {
    return {
      ok: false,
      query,
      error: 'Prázdny Wolfram dotaz.',
    };
  }

  try {
    const url = new URL('https://api.wolframalpha.com/v1/result');
    url.searchParams.set('appid', appId);
    url.searchParams.set('i', query);

    const res = await fetch(url.toString(), {
      method: 'GET',
    });

    const answer = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        query,
        error: answer || `Wolfram API chyba ${res.status}`,
      };
    }

    return {
      ok: true,
      query,
      answer,
    };
  } catch (error) {
    return {
      ok: false,
      query,
      error:
        error instanceof Error
          ? error.message
          : 'Nepodarilo sa kontaktovať Wolfram API.',
    };
  }
}

function buildWolframQueryFromDataset(dataset: ParsedNumericDataset | null) {
  if (!dataset || dataset.stats.length === 0) return '';

  const first = dataset.stats[0];

  if (!first || first.mean === null || first.standardDeviationSample === null) {
    return '';
  }

  return `mean ${first.mean}, standard deviation ${first.standardDeviationSample}, normal distribution`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalysisRequest;

    const analysisGoal = cleanText(body.analysisGoal);
    const hypotheses = cleanText(body.hypotheses);
    const methodology = cleanText(body.methodology);
    const dataDescription = cleanText(body.dataDescription);

    const analysisType =
      cleanText(body.analysisType) || 'Výber výpočtov pre analytickú časť';

    const software = cleanText(body.software) || 'JASP / Excel / CSV / Python';

    const outputStyle =
      cleanText(body.outputStyle) || 'Text do záverečnej práce';

    const activeProfile = body.activeProfile || null;

    const attachments = normalizeAttachments(body.attachments);
    const attachmentsBlock = formatAttachmentsBlock(attachments);
    const extractedAttachmentTextLength =
      getTotalAttachmentTextLength(attachments);

    const mathMode = cleanText(body.mathMode) || 'mvp';

    const generateExamples = Boolean(body.generateExamples);
    const examplesTopic = cleanText(body.examplesTopic);
    const examplesCount = Math.min(
      20,
      Math.max(0, Number(body.examplesCount || 0)),
    );

    const useWolframVerification = Boolean(body.useWolframVerification);
    const usePythonStack = body.usePythonStack !== false;
    const useMathJsFrontend = body.useMathJsFrontend !== false;
    const useGeoGebra = Boolean(body.useGeoGebra);

    const hasAnyInput =
      dataDescription.length >= 30 ||
      extractedAttachmentTextLength >= 50 ||
      generateExamples;

    if (!hasAnyInput) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýbajú dáta na analýzu. Nahraj súbor s výsledkami, vlož opis dát aspoň v rozsahu 30 znakov alebo zapni generovanie príkladov.',
        },
        { status: 400 },
      );
    }

    if (!analysisGoal && !activeProfile?.goal && !generateExamples) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Chýba cieľ práce. Bez cieľa práce nie je možné správne vybrať výpočty do analytickej časti.',
        },
        { status: 400 },
      );
    }

    const combinedInputText = buildCombinedInputText({
      dataDescription,
      attachments,
    });

    const parsedDataset = parseNumericDatasetFromText(combinedInputText);
    const localStatisticsBlock = buildLocalStatisticsBlock(parsedDataset);

    const mathStackBlock = buildMathStackBlock({
      mathMode,
      usePythonStack,
      useMathJsFrontend,
      useWolframVerification,
      useGeoGebra,
      generateExamples,
      examplesTopic,
      examplesCount,
    });

    const wolframQuery = buildWolframQueryFromDataset(parsedDataset);

    const wolframVerification =
      useWolframVerification && wolframQuery
        ? await verifyWithWolfram(wolframQuery)
        : null;

    const prompt = buildPrompt({
      analysisGoal,
      hypotheses,
      methodology,
      dataDescription,
      analysisType,
      software,
      outputStyle,
      activeProfile,
      attachmentsBlock,
      localStatisticsBlock:
        localStatisticsBlock +
        (wolframVerification
          ? `

WOLFRAM OVERENIE:
Dotaz: ${wolframVerification.query}
Stav: ${wolframVerification.ok ? 'úspešné' : 'neúspešné'}
Výsledok / chyba:
${wolframVerification.answer || wolframVerification.error || 'bez výsledku'}
`
          : ''),
      mathStackBlock,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Si metodológ, štatistik, matematik a akademický konzultant. Pomáhaš vyberať správne štatistické výpočty, píšeš interpretácie výsledkov do záverečných prác a navrhuješ technický matematicko-štatistický stack pre edukačnú platformu.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '';

    if (!raw.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'AI nevrátila výsledok analýzy.',
        },
        { status: 500 },
      );
    }

    const selectedCalculations = [
      extractSection(raw, 'VÝBER VÝPOČTOV DO PRÁCE'),
      extractSection(raw, 'ODPORÚČANÉ TESTY PODĽA HYPOTÉZ'),
      extractSection(raw, 'TABUĽKY VHODNÉ DO PRÁCE'),
    ]
      .filter(Boolean)
      .join('\n\n');

    const interpretation = [
      extractSection(raw, 'OPIS VÝSKUMNÉHO SÚBORU'),
      extractSection(raw, 'OPIS DOTAZNÍKOV / ŠKÁL'),
      extractSection(raw, 'NORMALITA A VOĽBA TESTOV'),
    ]
      .filter(Boolean)
      .join('\n\n');

    const platformStack =
      extractSection(raw, 'MATEMATICKO-ŠTATISTICKÝ STACK PRE PLATFORMU') ||
      mathStackBlock;

    const generatedExamples =
      extractSection(raw, 'GENEROVANIE PRÍKLADOV A DATASETOV') || '';

    const result =
      extractSection(raw, 'TEXT DO ANALYTICKEJ ČASTI') || raw;

    return NextResponse.json({
      ok: true,
      result,
      selectedCalculations,
      interpretation,
      platformStack,
      generatedExamples,
      fullResult: raw,
      localStatistics: parsedDataset
        ? {
            headers: parsedDataset.headers,
            rowsCount: parsedDataset.rowsCount,
            stats: parsedDataset.stats,
            correlationMatrix: parsedDataset.correlationMatrix,
          }
        : null,
      wolframVerification,
      meta: {
        software,
        analysisType,
        outputStyle,
        mathMode,
        usePythonStack,
        useMathJsFrontend,
        useWolframVerification,
        useGeoGebra,
        generateExamples,
        examplesTopic,
        examplesCount,
        attachmentsCount: attachments.length,
        extractedAttachmentTextLength,
      },
    });
  } catch (error) {
    console.error('ANALYSIS_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vykonať analýzu dát.',
      },
      { status: 500 },
    );
  }
}