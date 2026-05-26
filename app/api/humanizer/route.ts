import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OutputLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type HumanizerMode =
  | 'light'
  | 'academic'
  | 'natural'
  | 'formal'
  | 'clarity'
  | 'shorten'
  | 'expand';

type ExtractedSources = {
  bodyText: string;
  sourceText: string;
  hasSources: boolean;
};

type ProtectedTokenKind =
  | 'citation'
  | 'doi'
  | 'url'
  | 'isbn'
  | 'issn'
  | 'email'
  | 'number'
  | 'source-line';

type ProtectedToken = {
  token: string;
  value: string;
  kind: ProtectedTokenKind;
};

type HumanizerResponse = {
  ok: boolean;
  humanizedText?: string;
  output?: string;
  sourcesPreserved?: boolean;
  preservedInlineCitations?: string[];
  protectedItems?: number;
  mode?: HumanizerMode;
  language?: OutputLanguage;
  message: string;
  warning?: string;
  error?: string;
};

const MAX_INPUT_LENGTH = 60_000;
const MIN_INPUT_LENGTH = 20;

function cleanText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeLineEndings(value: string): string {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function normalizeWhitespace(value: string): string {
  return normalizeLineEndings(value)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{5,}/g, '\n\n\n')
    .trim();
}

function getOutputLanguage(value: unknown): OutputLanguage {
  const language = String(value || 'sk').toLowerCase().trim();

  if (language === 'cz') return 'cs';
  if (language === 'sk') return 'sk';
  if (language === 'cs') return 'cs';
  if (language === 'en') return 'en';
  if (language === 'de') return 'de';
  if (language === 'pl') return 'pl';
  if (language === 'hu') return 'hu';

  return 'sk';
}

function getHumanizerMode(value: unknown): HumanizerMode {
  const mode = String(value || 'academic').toLowerCase().trim();

  if (mode === 'light') return 'light';
  if (mode === 'academic') return 'academic';
  if (mode === 'natural') return 'natural';
  if (mode === 'formal') return 'formal';
  if (mode === 'clarity') return 'clarity';
  if (mode === 'shorten') return 'shorten';
  if (mode === 'expand') return 'expand';

  return 'academic';
}

function getLanguageLabel(language: OutputLanguage): string {
  if (language === 'cs') return 'češtine';
  if (language === 'en') return 'angličtine';
  if (language === 'de') return 'nemčine';
  if (language === 'pl') return 'poľštine';
  if (language === 'hu') return 'maďarčine';

  return 'slovenčine';
}

function getModeLabel(mode: HumanizerMode): string {
  const labels: Record<HumanizerMode, string> = {
    light: 'jemná jazyková úprava s minimálnym zásahom do textu',
    academic: 'akademická štylistická úprava odborného textu',
    natural: 'prirodzenejšia a plynulejšia formulácia textu',
    formal: 'formálnejší odborný štýl',
    clarity: 'zvýšenie zrozumiteľnosti, presnosti a plynulosti textu',
    shorten: 'skrátenie textu bez straty významu',
    expand: 'opatrné rozšírenie formulácií bez pridávania nových faktov',
  };

  return labels[mode] || labels.academic;
}

function getTemperature(mode: HumanizerMode): number {
  if (mode === 'light') return 0.25;
  if (mode === 'shorten') return 0.3;
  if (mode === 'formal') return 0.35;
  if (mode === 'academic') return 0.45;
  if (mode === 'clarity') return 0.45;
  if (mode === 'expand') return 0.5;
  if (mode === 'natural') return 0.55;

  return 0.45;
}

function getMessages(language: OutputLanguage) {
  const messages: Record<
    OutputLanguage,
    {
      textRequired: string;
      textTooLong: string;
      success: string;
      failed: string;
      detectorWarning: string;
    }
  > = {
    sk: {
      textRequired:
        'Vlož text, ktorý chceš jazykovo upraviť. Text musí mať aspoň 20 znakov.',
      textTooLong:
        'Text je príliš dlhý. Skráť ho alebo ho rozdeľ na viac častí.',
      success:
        'Text bol profesionálne jazykovo a štylisticky upravený. Citácie, URL, DOI a bibliografická časť boli zachované.',
      failed: 'Úprava textu zlyhala.',
      detectorWarning:
        'Výsledky externých AI detektorov sú iba orientačné a nemusia byť spoľahlivým dôkazom autorstva textu.',
    },
    cs: {
      textRequired:
        'Vlož text, který chceš jazykově upravit. Text musí mít alespoň 20 znaků.',
      textTooLong:
        'Text je příliš dlouhý. Zkrať ho nebo ho rozděl na více částí.',
      success:
        'Text byl profesionálně jazykově a stylisticky upraven. Citace, URL, DOI a bibliografická část byly zachovány.',
      failed: 'Úprava textu selhala.',
      detectorWarning:
        'Výsledky externích AI detektorů jsou pouze orientační a nemusí být spolehlivým důkazem autorství textu.',
    },
    en: {
      textRequired:
        'Please insert the text you want to edit. The text must contain at least 20 characters.',
      textTooLong:
        'The text is too long. Please shorten it or split it into multiple parts.',
      success:
        'The text was professionally edited for language, style and readability. Citations, URLs, DOIs and the bibliography section were preserved.',
      failed: 'Text editing failed.',
      detectorWarning:
        'External AI detector results are only indicative and should not be treated as reliable proof of authorship.',
    },
    de: {
      textRequired:
        'Füge den Text ein, den du sprachlich überarbeiten möchtest. Der Text muss mindestens 20 Zeichen enthalten.',
      textTooLong:
        'Der Text ist zu lang. Bitte kürze ihn oder teile ihn in mehrere Abschnitte.',
      success:
        'Der Text wurde professionell sprachlich und stilistisch überarbeitet. Zitate, URLs, DOIs und der Literaturteil wurden beibehalten.',
      failed: 'Die Textbearbeitung ist fehlgeschlagen.',
      detectorWarning:
        'Die Ergebnisse externer KI-Detektoren sind nur orientierend und kein zuverlässiger Nachweis der Autorschaft.',
    },
    pl: {
      textRequired:
        'Wklej tekst, który chcesz poprawić językowo. Tekst musi mieć co najmniej 20 znaków.',
      textTooLong:
        'Tekst jest zbyt długi. Skróć go albo podziel na kilka części.',
      success:
        'Tekst został profesjonalnie poprawiony językowo i stylistycznie. Cytowania, adresy URL, DOI oraz bibliografia zostały zachowane.',
      failed: 'Edycja tekstu nie powiodła się.',
      detectorWarning:
        'Wyniki zewnętrznych detektorów AI mają charakter orientacyjny i nie stanowią wiarygodnego dowodu autorstwa.',
    },
    hu: {
      textRequired:
        'Illeszd be a nyelvileg szerkeszteni kívánt szöveget. A szövegnek legalább 20 karakterből kell állnia.',
      textTooLong:
        'A szöveg túl hosszú. Rövidítsd le, vagy oszd több részre.',
      success:
        'A szöveg professzionális nyelvi és stilisztikai szerkesztésen esett át. Az idézetek, URL-ek, DOI-k és az irodalomjegyzék megmaradtak.',
      failed: 'A szöveg szerkesztése sikertelen volt.',
      detectorWarning:
        'A külső AI-detektorok eredményei csak tájékoztató jellegűek, és nem tekinthetők megbízható szerzőségi bizonyítéknak.',
    },
  };

  return messages[language] || messages.sk;
}

function extractSourceSection(input: string): ExtractedSources {
  const text = normalizeWhitespace(input);

  const sourceHeadingRegex =
    /(^|\n)\s*(#{1,6}\s*)?((použité\s+zdroje(\s+a\s+autori)?|pouzite\s+zdroje(\s+a\s+autori)?|zoznam\s+použitej\s+literatúry|zoznam\s+pouzitej\s+literatury|zoznam\s+literatúry|zoznam\s+literatury|literatúra|literatura|bibliografia|bibliografie|zdroje|references|bibliography|works\s+cited|used\s+sources|sources|źródła|zrodla|források|irodalomjegyzék)\s*:?)\s*$/gim;

  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;

  while ((match = sourceHeadingRegex.exec(text)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch || typeof lastMatch.index !== 'number') {
    return {
      bodyText: text,
      sourceText: '',
      hasSources: false,
    };
  }

  const sourceStartIndex =
    lastMatch.index + (lastMatch[1] ? lastMatch[1].length : 0);

  const bodyText = text.slice(0, sourceStartIndex).trim();
  const sourceText = text.slice(sourceStartIndex).trim();

  if (!bodyText || !sourceText || sourceText.length < 5) {
    return {
      bodyText: text,
      sourceText: '',
      hasSources: false,
    };
  }

  return {
    bodyText,
    sourceText,
    hasSources: true,
  };
}

function extractInlineCitations(input: string): string[] {
  const text = normalizeLineEndings(input);

  const patterns: RegExp[] = [
    /\[[0-9]{1,4}\]/g,
    /\[[0-9]{1,4}\s*[-–]\s*[0-9]{1,4}\]/g,
    /\([A-ZÁÄČĎÉĚÍĽĹŇÓÔŔŘŠŤÚÝŽÄÖÜ][^()\n]{1,120},\s*(19|20)[0-9]{2}[a-z]?(,\s*s\.?\s*[0-9]+(?:[-–][0-9]+)?)?\)/g,
    /\([A-ZÁÄČĎÉĚÍĽĹŇÓÔŔŘŠŤÚÝŽÄÖÜ][^()\n]{1,120}\set\sal\.,\s*(19|20)[0-9]{2}[a-z]?(,\s*s\.?\s*[0-9]+(?:[-–][0-9]+)?)?\)/gi,
    /\((19|20)[0-9]{2}[a-z]?\)/g,
    /doi:\s*10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi,
    /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi,
    /https?:\/\/[^\s)]+/gi,
    /www\.[^\s)]+/gi,
    /\bISBN(?:-1[03])?:?\s*(?:\d[- ]*){9,17}[\dX]\b/gi,
    /\bISSN:?\s*\d{4}-\d{3}[\dX]\b/gi,
  ];

  const citations = new Set<string>();

  for (const pattern of patterns) {
    const matches = text.match(pattern);

    if (!matches) continue;

    for (const item of matches) {
      const citation = item.trim();

      if (citation.length > 0) {
        citations.add(citation);
      }
    }
  }

  return Array.from(citations);
}

function protectCriticalTokens(input: string): {
  text: string;
  tokens: ProtectedToken[];
} {
  let text = normalizeLineEndings(input);
  const tokens: ProtectedToken[] = [];

  const protect = (pattern: RegExp, kind: ProtectedTokenKind) => {
    text = text.replace(pattern, (match) => {
      const existing = tokens.find((item) => item.value === match);

      if (existing) {
        return existing.token;
      }

      const token = `⟦ZEDPERA_PROTECTED_${tokens.length + 1}⟧`;

      tokens.push({
        token,
        value: match,
        kind,
      });

      return token;
    });
  };

  protect(/doi:\s*10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi, 'doi');
  protect(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi, 'doi');
  protect(/https?:\/\/[^\s)]+/gi, 'url');
  protect(/www\.[^\s)]+/gi, 'url');
  protect(/\bISBN(?:-1[03])?:?\s*(?:\d[- ]*){9,17}[\dX]\b/gi, 'isbn');
  protect(/\bISSN:?\s*\d{4}-\d{3}[\dX]\b/gi, 'issn');
  protect(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, 'email');

  protect(/\[[0-9]{1,4}\]/g, 'citation');
  protect(/\[[0-9]{1,4}\s*[-–]\s*[0-9]{1,4}\]/g, 'citation');

  protect(
    /\([A-ZÁÄČĎÉĚÍĽĹŇÓÔŔŘŠŤÚÝŽÄÖÜ][^()\n]{1,120},\s*(19|20)[0-9]{2}[a-z]?(,\s*s\.?\s*[0-9]+(?:[-–][0-9]+)?)?\)/g,
    'citation',
  );

  protect(
    /\([A-ZÁÄČĎÉĚÍĽĹŇÓÔŔŘŠŤÚÝŽÄÖÜ][^()\n]{1,120}\set\sal\.,\s*(19|20)[0-9]{2}[a-z]?(,\s*s\.?\s*[0-9]+(?:[-–][0-9]+)?)?\)/gi,
    'citation',
  );

  protect(/\((19|20)[0-9]{2}[a-z]?\)/g, 'citation');

  return {
    text: normalizeWhitespace(text),
    tokens,
  };
}

function restoreCriticalTokens(input: string, tokens: ProtectedToken[]): string {
  let output = normalizeLineEndings(input);

  for (const item of tokens) {
    output = output.split(item.token).join(item.value);
  }

  return normalizeWhitespace(output);
}

function getMissingTokens(input: string, tokens: ProtectedToken[]): ProtectedToken[] {
  return tokens.filter((item) => !input.includes(item.token));
}

async function repairMissingTokens(params: {
  currentOutput: string;
  protectedInput: string;
  missingTokens: ProtectedToken[];
  languageLabel: string;
  modeLabel: string;
}) {
  const {
    currentOutput,
    protectedInput,
    missingTokens,
    languageLabel,
    modeLabel,
  } = params;

  const repairPrompt = `
Si profesionálny akademický editor.

Pri predchádzajúcej jazykovej úprave boli odstránené chránené tokeny.
Oprav text tak, aby boli všetky chránené tokeny zachované.

Pravidlá:
- Zachovaj význam.
- Zachovaj odborný štýl.
- Nepridávaj nové fakty.
- Nepridávaj nové zdroje.
- Nepíš komentár.
- Nepíš nadpis.
- Nepíš Markdown.
- Vráť iba opravený text.
- Tokeny musia zostať presne v tvare, v akom sú uvedené.

Jazyk výstupu: ${languageLabel}
Režim úpravy: ${modeLabel}

Chýbajúce tokeny:
${missingTokens.map((item) => item.token).join('\n')}

Pôvodný text s tokenmi:
${protectedInput}

Aktuálny upravený text:
${currentOutput}
`.trim();

  const repair = await generateText({
    model: openai('gpt-4o-mini'),
    temperature: 0.15,
    maxOutputTokens: 6000,
    prompt: repairPrompt,
  });

  return cleanText(repair.text);
}

function restoreMissingInlineCitations(
  originalText: string,
  editedText: string,
): string {
  const originalCitations = extractInlineCitations(originalText);
  let output = normalizeWhitespace(editedText);

  if (originalCitations.length === 0) {
    return output;
  }

  const missing = originalCitations.filter((citation) => {
    return citation && !output.includes(citation);
  });

  if (missing.length === 0) {
    return output;
  }

  output = `${output}\n\n${missing.join(' ')}`;

  return normalizeWhitespace(output);
}

function ensureProtectedValuesPreserved(
  editedText: string,
  tokens: ProtectedToken[],
): string {
  let output = normalizeWhitespace(editedText);

  const missingValues = tokens
    .map((item) => item.value)
    .filter((value) => value && !output.includes(value));

  if (missingValues.length === 0) {
    return output;
  }

  output = `${output}\n\n${missingValues.join(' ')}`;

  return normalizeWhitespace(output);
}

function ensureSourceSectionPreserved(
  editedText: string,
  sourceText: string,
): string {
  const cleanEdited = normalizeWhitespace(editedText);
  const cleanSources = normalizeWhitespace(sourceText);

  if (!cleanSources) {
    return cleanEdited;
  }

  if (cleanEdited.includes(cleanSources)) {
    return cleanEdited;
  }

  const firstSourceLine = cleanSources.split('\n')[0]?.trim();

  if (firstSourceLine && cleanEdited.includes(firstSourceLine)) {
    return cleanEdited;
  }

  return normalizeWhitespace(`${cleanEdited}\n\n${cleanSources}`);
}

function removeModelCommentary(input: string): string {
  let output = normalizeLineEndings(input).trim();

  const forbiddenStarts = [
    'Tu je upravený text:',
    'Tu je humanizovaný text:',
    'Humanizovaný text:',
    'Upravený text:',
    'Výsledný text:',
    'Here is the edited text:',
    'Here is the humanized text:',
    'Edited text:',
    'Humanized text:',
    'Hier ist der überarbeitete Text:',
    'Oto upravený text:',
    'Oto poprawiony tekst:',
  ];

  for (const start of forbiddenStarts) {
    if (output.toLowerCase().startsWith(start.toLowerCase())) {
      output = output.slice(start.length).trim();
    }
  }

  return normalizeWhitespace(output);
}

function removeUnsafeSelfSourceReferences(input: string): string {
  const lines = normalizeLineEndings(input).split('\n');

  const filtered = lines.filter((line) => {
    const normalized = line.toLowerCase();

    const looksLikeSourceLine =
      normalized.includes('http') ||
      normalized.includes('www.') ||
      normalized.includes('zdroj') ||
      normalized.includes('source') ||
      normalized.includes('literatúra') ||
      normalized.includes('literatura') ||
      normalized.includes('bibliografia') ||
      normalized.includes('bibliography') ||
      normalized.includes('references');

    const containsOwnSystem =
      normalized.includes('zedpera') ||
      normalized.includes('zedpera.com') ||
      normalized.includes('zero gpt') ||
      normalized.includes('zerogpt') ||
      normalized.includes('gptzero') ||
      normalized.includes('textguard') ||
      normalized.includes('textguard.ai') ||
      normalized.includes('justdone') ||
      normalized.includes('originality.ai');

    return !(looksLikeSourceLine && containsOwnSystem);
  });

  return normalizeWhitespace(filtered.join('\n'));
}

function buildHumanizerPrompt(params: {
  languageLabel: string;
  modeLabel: string;
  textForHumanization: string;
  originalInlineCitations: string[];
  hasSources: boolean;
}) {
  const {
    languageLabel,
    modeLabel,
    textForHumanization,
    originalInlineCitations,
    hasSources,
  } = params;

  return `
Si profesionálny akademický jazykový editor.

Tvoja úloha:
Uprav dodaný text jazykovo, štylisticky a kompozične tak, aby bol prirodzenejší, plynulejší, odbornejší a čitateľnejší.

Dôležité:
Nejde o vytváranie nového obsahu.
Nejde o dopĺňanie nových faktov.
Nejde o nahrádzanie autorstva.
Ide výlučne o odbornú jazykovú a štylistickú úpravu existujúceho textu.

Režim úpravy:
${modeLabel}

Výstupný jazyk:
${languageLabel}

Základné pravidlá:
- Zachovaj pôvodný význam textu.
- Zachovaj vecnú presnosť.
- Zachovaj odborný akademický tón.
- Nevymýšľaj nové fakty.
- Nevymýšľaj nové argumenty.
- Nevymýšľaj nové autority.
- Nevymýšľaj nových autorov.
- Nevymýšľaj nové zdroje.
- Nevymýšľaj nové DOI.
- Nevymýšľaj nové URL adresy.
- Nevymýšľaj nové číselné údaje.
- Nepíš marketingovým štýlom.
- Nepíš reklamne.
- Nepíš príliš všeobecné frázy.
- Nepoužívaj prázdne formulácie bez informačnej hodnoty.
- Zachovaj odborné termíny, ak sú významovo správne.
- Ak je text akademický, zachovaj akademický charakter.
- Ak je text formálny, zachovaj formálnosť.
- Ak sú v texte odrážky, zachovaj ich význam.
- Ak sú v texte odseky, zachovaj logické členenie.
- Nepíš komentár k úprave.
- Nepíš vysvetlenie.
- Nepíš nadpis.
- Nepíš Markdown.
- Vráť iba výsledný upravený text.

Štylistické pravidlá:
- Zlepši plynulosť viet.
- Zjednoť vetnú stavbu tam, kde je text neobratný.
- Odstráň zbytočné opakovanie.
- Nahraď neobratné formulácie prirodzenejšími.
- Striedaj kratšie a dlhšie vety tam, kde to zlepší čitateľnosť.
- Zachovaj odbornú presnosť.
- Nepreháňaj expresívnosť.
- Nepoužívaj hovorový štýl, ak ide o akademický text.
- Nepoužívaj klišé ako „v dnešnej dobe“, „je dôležité poznamenať“, „v neposlednom rade“ alebo „kľúčový aspekt“, ak nie sú významovo nevyhnutné.
- Nemeň text iba mechanickou výmenou synoným.
- Zlepši prirodzený tok viet, ale neprevracaj význam.
- Pri dlhých odsekoch zachovaj súvislosť argumentácie.

Pravidlá pre chránené prvky:
- Tokeny vo formáte ⟦ZEDPERA_PROTECTED_1⟧, ⟦ZEDPERA_PROTECTED_2⟧ atď. sú chránené prvky.
- Tieto tokeny musíš zachovať presne v pôvodnom tvare.
- Tokeny neprepisuj.
- Tokeny neskracuj.
- Tokeny neodstraňuj.
- Tokeny ponechaj na významovo vhodnom mieste.
- Ak je token súčasťou citácie, ponechaj ho pri relevantnej vete.

Pravidlá pre citácie:
- Citácie typu [1], [2], [3] musia zostať zachované.
- Citácie typu (Autor, rok) musia zostať zachované.
- DOI musí zostať zachované.
- URL adresa musí zostať zachovaná.
- ISBN a ISSN musia zostať zachované.
- Citácie neprepisuj.
- Citácie neskracuj.
- Citácie neodstraňuj.
- Citácie nepresúvaj na nelogické miesto.

Pravidlá pre zdroje:
${
  hasSources
    ? '- Bibliografická časť bola systémom oddelená a bude pripojená späť v pôvodnom znení. Ty upravuj iba hlavný text.'
    : '- Ak text obsahuje zmienku o zdrojoch priamo vo vetách, zachovaj ju.'
}
- Nevytváraj novú sekciu zdrojov.
- Nepridávaj vlastné zdroje.
- Neuvádzaj aplikáciu, AI nástroj ani detektor ako zdroj.

Pôvodné rozpoznané citácie a technické prvky:
${
  originalInlineCitations.length > 0
    ? originalInlineCitations.join('\n')
    : 'Bez rozpoznaných inline citácií.'
}

TEXT NA ÚPRAVU:
${textForHumanization}
`.trim();
}

function validateInputText(inputText: string, messages: ReturnType<typeof getMessages>) {
  if (!inputText || inputText.length < MIN_INPUT_LENGTH) {
    return {
      ok: false as const,
      status: 400,
      error: 'TEXT_REQUIRED',
      message: messages.textRequired,
    };
  }

  if (inputText.length > MAX_INPUT_LENGTH) {
    return {
      ok: false as const,
      status: 413,
      error: 'TEXT_TOO_LONG',
      message: messages.textTooLong,
    };
  }

  return {
    ok: true as const,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const inputText = cleanText(body.text || body.input || body.content);

    const language = getOutputLanguage(
      body.language ||
        body.outputLanguage ||
        body.interfaceLanguage ||
        body.systemLanguage ||
        body.workLanguage,
    );

    const mode = getHumanizerMode(
      body.mode ||
        body.humanizerMode ||
        body.editingMode ||
        body.styleMode,
    );

    const languageLabel = getLanguageLabel(language);
    const modeLabel = getModeLabel(mode);
    const messages = getMessages(language);

    const validation = validateInputText(inputText, messages);

    if (!validation.ok) {
      return NextResponse.json<HumanizerResponse>(
        {
          ok: false,
          error: validation.error,
          message: validation.message,
        },
        { status: validation.status },
      );
    }

    const normalizedInput = normalizeWhitespace(inputText);

    const extracted = extractSourceSection(normalizedInput);

    const textForHumanization = extracted.bodyText || normalizedInput;
    const protectedSourceText = extracted.sourceText;

    const originalInlineCitations = extractInlineCitations(normalizedInput);

    const protectedMainText = protectCriticalTokens(textForHumanization);

    const prompt = buildHumanizerPrompt({
      languageLabel,
      modeLabel,
      textForHumanization: protectedMainText.text,
      originalInlineCitations,
      hasSources: extracted.hasSources,
    });

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: getTemperature(mode),
      maxOutputTokens: 6000,
      prompt,
    });

    let output = cleanText(result.text);

    output = removeModelCommentary(output);

    const missingTokens = getMissingTokens(output, protectedMainText.tokens);

    if (missingTokens.length > 0) {
      const repaired = await repairMissingTokens({
        currentOutput: output,
        protectedInput: protectedMainText.text,
        missingTokens,
        languageLabel,
        modeLabel,
      });

      if (repaired) {
        output = removeModelCommentary(repaired);
      }
    }

    output = restoreCriticalTokens(output, protectedMainText.tokens);

    output = ensureProtectedValuesPreserved(output, protectedMainText.tokens);

    output = restoreMissingInlineCitations(textForHumanization, output);

    if (extracted.hasSources) {
      output = ensureSourceSectionPreserved(output, protectedSourceText);
    }

    output = removeUnsafeSelfSourceReferences(output);

    output = normalizeWhitespace(output);

    return NextResponse.json<HumanizerResponse>({
      ok: true,
      humanizedText: output,
      output,
      sourcesPreserved: extracted.hasSources,
      preservedInlineCitations: originalInlineCitations,
      protectedItems: protectedMainText.tokens.length,
      mode,
      language,
      message: messages.success,
      warning: messages.detectorWarning,
    });
  } catch (error) {
    console.error('HUMANIZER_API_ERROR:', error);

    return NextResponse.json<HumanizerResponse>(
      {
        ok: false,
        error: 'HUMANIZER_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Úprava textu zlyhala. Skús to, prosím, znova.',
      },
      { status: 500 },
    );
  }
}