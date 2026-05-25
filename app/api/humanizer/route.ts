import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OutputLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type ExtractedSources = {
  bodyText: string;
  sourceText: string;
  hasSources: boolean;
};

type HumanizerResponse = {
  ok: boolean;
  humanizedText?: string;
  output?: string;
  sourcesPreserved?: boolean;
  preservedInlineCitations?: string[];
  message: string;
  error?: string;
};

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
    .replace(/\n{4,}/g, '\n\n\n')
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

function getLanguageLabel(language: OutputLanguage): string {
  if (language === 'cs') return 'češtine';
  if (language === 'en') return 'angličtine';
  if (language === 'de') return 'nemčine';
  if (language === 'pl') return 'poľštine';
  if (language === 'hu') return 'maďarčine';

  return 'slovenčine';
}

function getMessages(language: OutputLanguage) {
  const messages: Record<
    OutputLanguage,
    {
      textRequired: string;
      success: string;
      failed: string;
    }
  > = {
    sk: {
      textRequired:
        'Vlož text, ktorý chceš upraviť. Text musí mať aspoň 20 znakov.',
      success:
        'Text bol jazykovo upravený prirodzenejším akademickým štýlom. Citácie, URL, DOI a bibliografická časť boli zachované. Výsledky externých AI detektorov sú iba orientačné a nemusia byť spoľahlivým dôkazom autorstva.',
      failed: 'Úprava textu zlyhala.',
    },
    cs: {
      textRequired:
        'Vlož text, který chceš upravit. Text musí mít alespoň 20 znaků.',
      success:
        'Text byl jazykově upraven přirozenějším akademickým stylem. Citace, URL, DOI a bibliografická část byly zachovány. Výsledky externích AI detektorů jsou pouze orientační a nemusí být spolehlivým důkazem autorství.',
      failed: 'Úprava textu selhala.',
    },
    en: {
      textRequired:
        'Please insert the text you want to edit. The text must contain at least 20 characters.',
      success:
        'The text was edited in a more natural academic style. Citations, URLs, DOIs and the bibliography section were preserved. External AI detector results are only indicative and should not be treated as reliable proof of authorship.',
      failed: 'Text editing failed.',
    },
    de: {
      textRequired:
        'Füge den Text ein, den du bearbeiten möchtest. Der Text muss mindestens 20 Zeichen enthalten.',
      success:
        'Der Text wurde in einem natürlicheren akademischen Stil überarbeitet. Zitate, URLs, DOIs und der Literaturteil wurden beibehalten. Ergebnisse externer KI-Detektoren sind nur orientierend und kein zuverlässiger Nachweis der Autorschaft.',
      failed: 'Die Textbearbeitung ist fehlgeschlagen.',
    },
    pl: {
      textRequired:
        'Wklej tekst, który chcesz poprawić. Tekst musi mieć co najmniej 20 znaków.',
      success:
        'Tekst został poprawiony w bardziej naturalnym stylu akademickim. Cytowania, adresy URL, DOI oraz część bibliograficzna zostały zachowane. Wyniki zewnętrznych detektorów AI mają charakter orientacyjny i nie stanowią wiarygodnego dowodu autorstwa.',
      failed: 'Edycja tekstu nie powiodła się.',
    },
    hu: {
      textRequired:
        'Illeszd be a szerkeszteni kívánt szöveget. A szövegnek legalább 20 karakterből kell állnia.',
      success:
        'A szöveg természetesebb akadémiai stílusban lett átdolgozva. Az idézetek, URL-ek, DOI-k és az irodalomjegyzék megmaradtak. A külső AI-detektorok eredményei csak tájékoztató jellegűek, és nem tekinthetők megbízható szerzőségi bizonyítéknak.',
      failed: 'A szöveg szerkesztése sikertelen volt.',
    },
  };

  return messages[language] || messages.sk;
}

/**
 * Nájde poslednú bibliografickú sekciu v texte.
 * Zdroje sa potom neposielajú modelu na prepisovanie, ale pripoja sa späť v pôvodnom znení.
 */
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

/**
 * Zachytí citácie v texte.
 * Slúži ako poistka, aby model nevyhodil [1], DOI, URL alebo autor-rok citácie.
 */
function extractInlineCitations(input: string): string[] {
  const text = normalizeLineEndings(input);

  const patterns: RegExp[] = [
    /\[[0-9]{1,3}\]/g,
    /\[[0-9]{1,3}\s*[-–]\s*[0-9]{1,3}\]/g,
    /\([A-ZÁČĎÉĚÍĽĹŇÓÔŔŘŠŤÚÝŽÄÖÜ][^()\n]{1,90},\s*(19|20)[0-9]{2}[a-z]?\)/g,
    /\([A-ZÁČĎÉĚÍĽĹŇÓÔŔŘŠŤÚÝŽÄÖÜ][^()\n]{1,90}\set\sal\.,\s*(19|20)[0-9]{2}[a-z]?\)/gi,
    /\((19|20)[0-9]{2}[a-z]?\)/g,
    /doi:\s*10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi,
    /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi,
    /https?:\/\/[^\s)]+/gi,
    /www\.[^\s)]+/gi,
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

/**
 * Ak model omylom odstráni niektoré citácie, funkcia ich doplní na koniec upraveného textu.
 * Je to poistka, nie náhrada kvalitného promptu.
 */
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

/**
 * Pripojí bibliografickú sekciu späť presne v pôvodnom znení.
 */
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

/**
 * Odstráni prípadné technické hlášky modelu, ak by ich model napriek promptu vrátil.
 */
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
  ];

  for (const start of forbiddenStarts) {
    if (output.toLowerCase().startsWith(start.toLowerCase())) {
      output = output.slice(start.length).trim();
    }
  }

  return normalizeWhitespace(output);
}

/**
 * Bezpečnostná poistka:
 * Nepotrebujeme, aby sa ako zdroj automaticky objavovala samotná aplikácia alebo AI detektor.
 */
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
      normalized.includes('textguard') ||
      normalized.includes('textguard.ai');

    return !(looksLikeSourceLine && containsOwnSystem);
  });

  return normalizeWhitespace(filtered.join('\n'));
}

function buildHumanizerPrompt(params: {
  languageLabel: string;
  textForHumanization: string;
  originalInlineCitations: string[];
  hasSources: boolean;
}) {
  const {
    languageLabel,
    textForHumanization,
    originalInlineCitations,
    hasSources,
  } = params;

  return `
Si profesionálny akademický editor.

Tvojou úlohou je jazykovo a štylisticky upraviť text tak, aby pôsobil prirodzenejšie, odbornejšie, plynulejšie a menej šablónovito.

Nejde o vytváranie nového obsahu. Ide iba o odbornú jazykovú úpravu existujúceho textu.

Pravidlá úpravy:
- Zachovaj pôvodný význam textu.
- Zachovaj vecnú presnosť.
- Nevymýšľaj nové fakty.
- Nevymýšľaj nových autorov.
- Nevymýšľaj nové zdroje.
- Nevymýšľaj nové DOI.
- Nevymýšľaj nové URL adresy.
- Nevymýšľaj nové číselné údaje.
- Zachovaj odborný akademický štýl.
- Uprav vetnú stavbu tam, kde text pôsobí príliš strojovo.
- Striedaj kratšie a dlhšie vety prirodzene.
- Odstráň zbytočné opakovanie rovnakých formulácií.
- Nepoužívaj prázdne frázy.
- Nepoužívaj marketingový štýl.
- Nepíš príliš všeobecné formulácie.
- Nepoužívaj nadmerne frázy ako „v dnešnej dobe“, „je dôležité poznamenať“, „v neposlednom rade“, „kľúčový aspekt“, ak nie sú významovo potrebné.
- Text má pôsobiť ako prirodzene napísaný odborný alebo študentský akademický text.
- Výstup musí byť v ${languageLabel}.
- Nepíš komentár.
- Nepíš vysvetlenie.
- Nepíš nadpis.
- Nepíš Markdown.
- Vráť iba výsledný upravený text.

Pravidlá pre citácie:
- Citácie sú chránené prvky textu.
- Citácie typu [1], [2], [3] musia zostať zachované.
- Citácie typu (Autor, rok) musia zostať zachované.
- DOI musí zostať zachované.
- URL adresa musí zostať zachovaná.
- Citácie neprepisuj.
- Citácie neskracuj.
- Citácie neodstraňuj.
- Ak je citácia v texte, ponechaj ju v texte na významovo vhodnom mieste.

Pravidlá pre zdroje:
${
  hasSources
    ? '- Bibliografická časť bola technicky oddelená a bude pripojená späť systémom. Ty upravuj iba hlavný text.'
    : '- Ak text obsahuje zmienku o zdrojoch priamo vo vetách, zachovaj ju.'
}
- Nevytváraj novú sekciu zdrojov.
- Nepridávaj vlastné zdroje.
- Neuvádzaj aplikáciu, AI nástroj ani detektor ako zdroj.

Pôvodné rozpoznané citácie:
${
  originalInlineCitations.length > 0
    ? originalInlineCitations.join('\n')
    : 'Bez rozpoznaných inline citácií.'
}

TEXT NA ÚPRAVU:
${textForHumanization}
`.trim();
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

    const languageLabel = getLanguageLabel(language);
    const messages = getMessages(language);

    if (!inputText || inputText.length < 20) {
      return NextResponse.json<HumanizerResponse>(
        {
          ok: false,
          error: 'TEXT_REQUIRED',
          message: messages.textRequired,
        },
        { status: 400 },
      );
    }

    const normalizedInput = normalizeWhitespace(inputText);

    const extracted = extractSourceSection(normalizedInput);

    const textForHumanization = extracted.bodyText || normalizedInput;
    const protectedSourceText = extracted.sourceText;

    const originalInlineCitations = extractInlineCitations(normalizedInput);

    const prompt = buildHumanizerPrompt({
      languageLabel,
      textForHumanization,
      originalInlineCitations,
      hasSources: extracted.hasSources,
    });

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.45,
      maxOutputTokens: 6000,
      prompt,
    });

    let output = cleanText(result.text);

    output = removeModelCommentary(output);

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
      message: messages.success,
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