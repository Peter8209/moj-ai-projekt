import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { GLOBAL_ACADEMIC_SYSTEM_PROMPT } from '@/lib/ai-system-prompt';
import {
  EntitlementError,
  consumeSuccessfulPrompt,
  entitlementErrorResponse,
  requireModuleAccess,
  requirePromptAllowance,
  type CurrentEntitlements,
} from '@/lib/entitlements';
import {
  PageLimitError,
  PageQuotaUnavailableError,
  consumePagesForOutput,
  getOutputTokenLimitForQuota,
  pageQuotaErrorResponse,
  requireAvailablePages,
  type PageQuota,
} from '@/lib/page-quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type LanguageCode =
  | 'sk'
  | 'cs'
  | 'en'
  | 'de'
  | 'pl'
  | 'hu';

type TranslationStyle =
  | 'academic'
  | 'formal'
  | 'natural'
  | 'simple';

type SavedProfile = {
  id?: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  expertise?: string;
  workExpertise?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  methodology?: string;
  keywords?: string[];
  keywordsList?: string[];
};

type TranslationRequest = {
  requestId?: string;

  input?: string;
  text?: string;
  message?: string;
  question?: string;
  prompt?: string;
  instruction?: string;

  attachmentText?: string;
  extractedText?: string;
  clientExtractedText?: string;

  translationFrom?: string;
  translationTo?: string;
  translationStyle?: string;

  translationFromLabel?: string;
  translationToLabel?: string;
  translationStyleLabel?: string;

  language?: string;
  outputLanguage?: string;
  workLanguage?: string;
  systemLanguage?: string;
  interfaceLanguage?: string;

  profile?: SavedProfile | null;
  activeProfile?: SavedProfile | null;
  profileSnapshot?: SavedProfile | null;

  projectId?: string;
  profileId?: string;
};

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  sk: 'slovenčina',
  cs: 'čeština',
  en: 'angličtina',
  de: 'nemčina',
  pl: 'poľština',
  hu: 'maďarčina',
};

const STYLE_LABELS: Record<TranslationStyle, string> = {
  academic: 'akademický a terminologicky presný',
  formal: 'formálny a profesionálny',
  natural: 'prirodzený a plynulý',
  simple: 'jednoduchý a zrozumiteľný',
};

const TRANSLATION_MODEL =
  process.env.OPENAI_TRANSLATION_MODEL ||
  process.env.OPENAI_MODEL ||
  'gpt-4.1-mini';

const MAX_SOURCE_CHARACTERS = 750_000;
const TARGET_CHUNK_CHARACTERS = 10_000;
const MAX_CHUNK_CHARACTERS = 12_000;
const MAX_TRANSLATION_CHUNKS = 80;
const CONTINUITY_CONTEXT_CHARACTERS = 1_200;
const CHARACTERS_PER_QUOTA_PAGE = 1_800;
const MIN_CHUNK_OUTPUT_TOKENS = 1_200;
const MAX_CHUNK_OUTPUT_TOKENS = 7_000;

type TranslationChunk = {
  index: number;
  text: string;
};

type TranslationChunkResult = {
  text: string;
  completionTokens: number;
  finishReason: string | null;
};

class TranslationProcessingError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: string;

  constructor({
    status,
    code,
    message,
    detail,
  }: {
    status: number;
    code: string;
    message: string;
    detail?: string;
  }) {
    super(message);
    this.name = 'TranslationProcessingError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function normalizeLanguage(
  value: unknown,
  fallback: LanguageCode,
): LanguageCode {
  const normalized = cleanText(value)
    .toLowerCase();

  if (normalized === 'cz') {
    return 'cs';
  }

  if (
    normalized === 'sk' ||
    normalized === 'cs' ||
    normalized === 'en' ||
    normalized === 'de' ||
    normalized === 'pl' ||
    normalized === 'hu'
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeStyle(
  value: unknown,
): TranslationStyle {
  const normalized = cleanText(value)
    .toLowerCase();

  if (
    normalized === 'formal' ||
    normalized === 'natural' ||
    normalized === 'simple'
  ) {
    return normalized;
  }

  return 'academic';
}

function normalizeRequestId(
  value: unknown,
): string {
  const normalized = cleanText(value)
    .replace(/[^a-zA-Z0-9._:-]/g, '')
    .slice(0, 255);

  return normalized ||
    `translation-${crypto.randomUUID()}`;
}

function getKeywords(
  profile?: SavedProfile | null,
): string {
  const values = Array.isArray(profile?.keywords)
    ? profile?.keywords
    : Array.isArray(profile?.keywordsList)
      ? profile?.keywordsList
      : [];

  return values
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(', ');
}

function combineUniqueTextParts(values: unknown[]): string {
  const parts: string[] = [];

  for (const value of values) {
    const cleaned = cleanText(value);

    if (!cleaned) continue;

    const duplicate = parts.some(
      (part) =>
        part === cleaned ||
        part.includes(cleaned) ||
        cleaned.includes(part),
    );

    if (!duplicate) {
      parts.push(cleaned);
    }
  }

  return parts.join('\n\n');
}

function getTranslationSource(
  body: TranslationRequest,
): string {
  const attachmentInput = combineUniqueTextParts([
    body.clientExtractedText,
    body.extractedText,
    body.attachmentText,
  ]);

  const directInput = cleanText(body.input);
  const text = cleanText(body.text);
  const message = cleanText(body.message);
  const question = cleanText(body.question);
  const prompt = cleanText(body.prompt);

  const safeFallbacks = [text, message, question].filter(
    (value) => value && value !== prompt,
  );

  return combineUniqueTextParts([
    attachmentInput,
    directInput,
    ...safeFallbacks,
  ]);
}

function buildProfileContext(
  profile?: SavedProfile | null,
): string {
  if (!profile) {
    return 'Profil práce nie je zadaný.';
  }

  return [
    `Názov práce: ${cleanText(profile.title) || 'nezadané'}`,
    `Téma: ${cleanText(profile.topic) || 'nezadané'}`,
    `Typ práce: ${cleanText(profile.type) || 'nezadané'}`,
    `Úroveň: ${cleanText(profile.level) || 'nezadané'}`,
    `Odbor: ${cleanText(profile.field) || 'nezadané'}`,
    `Odbornosť: ${
      cleanText(profile.expertise) ||
      cleanText(profile.workExpertise) ||
      'nezadané'
    }`,
    `Citačný štýl: ${cleanText(profile.citation) || 'nezadané'}`,
    `Kľúčové slová: ${getKeywords(profile) || 'nezadané'}`,
  ].join('\n');
}

function tail(value: string, maxCharacters: number): string {
  const cleaned = cleanText(value);

  if (cleaned.length <= maxCharacters) {
    return cleaned;
  }

  return cleaned.slice(-maxCharacters);
}

function findLastBoundary(
  value: string,
  minimumIndex: number,
): number {
  const candidates = [
    value.lastIndexOf('\n\n'),
    value.lastIndexOf('\n'),
    value.lastIndexOf('. '),
    value.lastIndexOf('! '),
    value.lastIndexOf('? '),
    value.lastIndexOf('; '),
    value.lastIndexOf(': '),
    value.lastIndexOf(' '),
  ].filter((index) => index >= minimumIndex);

  if (candidates.length === 0) {
    return -1;
  }

  return Math.max(...candidates);
}

function splitTranslationSource(
  sourceText: string,
): TranslationChunk[] {
  const normalized = cleanText(sourceText);
  const chunks: TranslationChunk[] = [];

  let cursor = 0;

  while (cursor < normalized.length) {
    const remaining = normalized.length - cursor;

    if (remaining <= MAX_CHUNK_CHARACTERS) {
      const finalText = normalized.slice(cursor).trim();

      if (finalText) {
        chunks.push({
          index: chunks.length,
          text: finalText,
        });
      }

      break;
    }

    const idealEnd = Math.min(
      normalized.length,
      cursor + TARGET_CHUNK_CHARACTERS,
    );
    const maximumEnd = Math.min(
      normalized.length,
      cursor + MAX_CHUNK_CHARACTERS,
    );
    const minimumBoundary = Math.max(
      cursor + Math.floor(TARGET_CHUNK_CHARACTERS * 0.65),
      cursor + 1,
    );

    const window = normalized.slice(cursor, maximumEnd);
    const localMinimum = Math.max(0, minimumBoundary - cursor);
    const localIdeal = Math.max(0, idealEnd - cursor);
    const preferredWindow = window.slice(0, Math.max(localIdeal, 1));

    let localBoundary = findLastBoundary(
      preferredWindow,
      Math.min(localMinimum, preferredWindow.length - 1),
    );

    if (localBoundary < 0) {
      localBoundary = findLastBoundary(
        window,
        Math.min(localMinimum, window.length - 1),
      );
    }

    const splitAt =
      localBoundary >= 0
        ? cursor + localBoundary + 1
        : maximumEnd;

    const chunkText = normalized.slice(cursor, splitAt).trim();

    if (chunkText) {
      chunks.push({
        index: chunks.length,
        text: chunkText,
      });
    }

    cursor = Math.max(splitAt, cursor + 1);

    while (cursor < normalized.length && /\s/.test(normalized[cursor])) {
      cursor += 1;
    }

    if (chunks.length > MAX_TRANSLATION_CHUNKS) {
      throw new TranslationProcessingError({
        status: 413,
        code: 'TRANSLATION_TOO_MANY_CHUNKS',
        message: 'Dokument je príliš rozsiahly na jednu prekladovú požiadavku.',
        detail: `Maximálny počet častí je ${MAX_TRANSLATION_CHUNKS}.`,
      });
    }
  }

  return chunks;
}

function estimateSourcePages(sourceText: string): number {
  return Math.max(
    1,
    Math.ceil(sourceText.length / CHARACTERS_PER_QUOTA_PAGE),
  );
}

function getRequestedChunkTokenLimit(chunkText: string): number {
  return Math.min(
    Math.max(
      Math.ceil(chunkText.length / 2.2),
      MIN_CHUNK_OUTPUT_TOKENS,
    ),
    MAX_CHUNK_OUTPUT_TOKENS,
  );
}

function buildTranslationPrompt({
  sourceText,
  from,
  to,
  style,
  profile,
  chunkIndex,
  totalChunks,
  previousSourceContext,
  previousTranslationContext,
}: {
  sourceText: string;
  from: LanguageCode;
  to: LanguageCode;
  style: TranslationStyle;
  profile?: SavedProfile | null;
  chunkIndex: number;
  totalChunks: number;
  previousSourceContext?: string;
  previousTranslationContext?: string;
}): string {
  const continuityBlock =
    previousSourceContext || previousTranslationContext
      ? `
KONTEXT NADVÄZNOSTI – LEN PRE TERMINOLÓGIU, TENTO KONTEXT NEOPAKUJ VO VÝSTUPE
Predchádzajúci zdrojový kontext:
<<<PREVIOUS_SOURCE>>>
${previousSourceContext || 'nie je k dispozícii'}
<<<END_PREVIOUS_SOURCE>>>

Predchádzajúci preložený kontext:
<<<PREVIOUS_TRANSLATION>>>
${previousTranslationContext || 'nie je k dispozícii'}
<<<END_PREVIOUS_TRANSLATION>>>
`
      : '';

  return `
PREKLADOVÁ ÚLOHA – ČASŤ ${chunkIndex + 1} Z ${totalChunks}

Zdrojový jazyk: ${LANGUAGE_LABELS[from]}
Cieľový jazyk: ${LANGUAGE_LABELS[to]}
Požadovaný štýl: ${STYLE_LABELS[style]}

KONTEXT PRÁCE
${buildProfileContext(profile)}
${continuityBlock}
AKTUÁLNA ČASŤ TEXTU NA PREKLAD
<<<START_TEXT>>>
${sourceText}
<<<END_TEXT>>>

PRÍSNE PRAVIDLÁ
- Prelož celý obsah medzi značkami START_TEXT a END_TEXT bez vynechania viet alebo odsekov.
- Ide o časť jedného väčšieho dokumentu. Zachovaj terminológiu konzistentnú s predchádzajúcou časťou.
- Vráť iba preklad aktuálnej časti. Kontext nadväznosti neopakuj.
- Nepridávaj nadpis „Preklad“, „Preložený text“, „Časť“ ani technické poznámky.
- Nepridávaj vysvetlenie, komentár, hodnotenie, analýzu ani odporúčania.
- Zachovaj členenie odsekov, nadpisy, číslovanie, zoznamy, citácie, odkazy, DOI, URL,
  názvy premenných, skratky, tabuľkové označenia a odborné termíny.
- Mená osôb, názvy organizácií a bibliografické údaje neupravuj, pokiaľ
  nemajú zaužívaný ekvivalent v cieľovom jazyku.
- Nevymýšľaj žiadne nové údaje a nič neskracuj.
- Nepoužívaj markdownové nadpisy ani kódové bloky.
- Začni priamo prvým slovom preloženej aktuálnej časti.
`.trim();
}

async function translateChunk({
  chunk,
  totalChunks,
  from,
  to,
  style,
  profile,
  pageQuota,
  previousSourceContext,
  previousTranslationContext,
}: {
  chunk: TranslationChunk;
  totalChunks: number;
  from: LanguageCode;
  to: LanguageCode;
  style: TranslationStyle;
  profile?: SavedProfile | null;
  pageQuota: PageQuota;
  previousSourceContext?: string;
  previousTranslationContext?: string;
}): Promise<TranslationChunkResult> {
  const requestedTokenLimit = getRequestedChunkTokenLimit(chunk.text);
  const maxOutputTokens = getOutputTokenLimitForQuota(
    pageQuota,
    requestedTokenLimit,
  );

  if (maxOutputTokens <= 0) {
    throw new PageLimitError({
      pageLimit: pageQuota.pageLimit,
      pagesUsed: pageQuota.pagesUsed,
      pagesRemaining: pageQuota.pagesRemaining,
      requestedPages: 1,
    });
  }

  const prompt = buildTranslationPrompt({
    sourceText: chunk.text,
    from,
    to,
    style,
    profile,
    chunkIndex: chunk.index,
    totalChunks,
    previousSourceContext,
    previousTranslationContext,
  });

  let completion: Awaited<
    ReturnType<typeof openai.chat.completions.create>
  >;

  try {
    completion = await openai.chat.completions.create({
      model: TRANSLATION_MODEL,
      temperature: 0.1,
      max_tokens: maxOutputTokens,
      messages: [
        {
          role: 'system',
          content: [
            String(
              GLOBAL_ACADEMIC_SYSTEM_PROMPT ||
              '',
            ).trim(),
            'Si profesionálny akademický prekladateľ.',
            'Prekladaj úplne, bez skracovania, a zachovávaj terminologickú konzistenciu medzi časťami dokumentu.',
            'V odpovedi vráť výhradne preložený text aktuálnej časti.',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
  } catch (error) {
    throw new TranslationProcessingError({
      status: 502,
      code: 'TRANSLATION_CHUNK_FAILED',
      message: `Preklad časti ${chunk.index + 1} z ${totalChunks} zlyhal.`,
      detail:
        error instanceof Error
          ? error.message
          : 'OpenAI nevrátilo použiteľnú odpoveď.',
    });
  }

  const finishReason =
    completion.choices[0]
      ?.finish_reason ||
    null;

  const translatedText = cleanText(
    completion.choices[0]
      ?.message?.content,
  );

  if (!translatedText) {
    throw new TranslationProcessingError({
      status: 502,
      code: 'EMPTY_TRANSLATION_CHUNK',
      message: `AI nevrátila text pre časť ${chunk.index + 1} z ${totalChunks}.`,
    });
  }

  if (finishReason === 'length') {
    throw new TranslationProcessingError({
      status: 502,
      code: 'TRANSLATION_CHUNK_TRUNCATED',
      message: `Preklad časti ${chunk.index + 1} z ${totalChunks} bol skrátený limitom modelu.`,
      detail:
        'Znížte veľkosť jednej časti alebo zvýšte povolený výstupný tokenový limit modelu.',
    });
  }

  return {
    text: translatedText,
    completionTokens:
      completion.usage
        ?.completion_tokens ||
      Math.ceil(
        translatedText.length / 4,
      ),
    finishReason,
  };
}

function serializeEntitlements(
  entitlements: CurrentEntitlements,
): Record<string, unknown> {
  return {
    userId: entitlements.userId,
    email: entitlements.email,

    planId: entitlements.planId,
    planName: entitlements.planName,
    planPriceCents:
      entitlements.planPriceCents,

    isAdmin: entitlements.isAdmin,
    isUnlimited:
      entitlements.isAdmin ||
      entitlements.hasUnlimitedAccess,
    hasUnlimitedAccess:
      entitlements.hasUnlimitedAccess,

    pageLimit: entitlements.pageLimit,
    basePageLimit:
      entitlements.basePageLimit,
    extraPageLimit:
      entitlements.extraPageLimit,
    totalPageLimit:
      entitlements.pageLimit,
    pagesUsed: entitlements.pagesUsed,
    pagesRemaining:
      entitlements.pagesRemaining,
    pageLimitReached:
      entitlements.pageLimitReached,

    promptLimit:
      entitlements.promptLimit,
    promptsUsed:
      entitlements.promptsUsed,
    promptsRemaining:
      entitlements.promptsRemaining,
    promptLimitReached:
      entitlements.promptLimitReached,

    attachmentLimit:
      entitlements.attachmentLimit,

    addonIds: entitlements.addonIds,
    addonNames: entitlements.addonNames,
    features: Array.from(
      entitlements.features,
    ),

    billingStatus:
      entitlements.billingStatus,
    activatedAt:
      entitlements.activatedAt,
    validUntil:
      entitlements.validUntil,
    updatedAt:
      entitlements.updatedAt,
  };
}

function serializePageQuota(
  quota: PageQuota,
): Record<string, unknown> {
  return {
    planId: quota.planId,
    planName: quota.planName,

    isAdmin: quota.isAdmin,
    isUnlimited: quota.isUnlimited,
    hasUnlimitedAccess:
      quota.hasUnlimitedAccess,

    basePageLimit:
      quota.basePageLimit,
    extraPageLimit:
      quota.extraPageLimit,
    pageLimit: quota.pageLimit,
    pagesUsed: quota.pagesUsed,
    pagesRemaining:
      quota.pagesRemaining,
    pageLimitReached:
      quota.pageLimitReached,

    attachmentLimit:
      quota.attachmentLimit,
    extraAttachmentLimit:
      quota.extraAttachmentLimit,

    trackingAvailable:
      quota.trackingAvailable,
  };
}

export async function POST(
  request: NextRequest,
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return noStoreJson(
        {
          ok: false,
          code: 'OPENAI_API_KEY_MISSING',
          message:
            'Na serveri chýba OPENAI_API_KEY.',
        },
        500,
      );
    }

    const body =
      (await request
        .json()
        .catch(() => null)) as
        | TranslationRequest
        | null;

    if (!body) {
      return noStoreJson(
        {
          ok: false,
          code: 'INVALID_JSON',
          message:
            'Požiadavku prekladu nebolo možné prečítať.',
        },
        400,
      );
    }

    const requestId = normalizeRequestId(
      body.requestId ||
        request.headers.get(
          'x-request-id',
        ),
    );

    const sourceText = getTranslationSource(body);

    if (!sourceText) {
      return noStoreJson(
        {
          ok: false,
          code: 'TRANSLATION_TEXT_REQUIRED',
          message:
            'Najprv vložte text alebo prílohu, ktorú chcete preložiť.',
        },
        400,
      );
    }

    if (sourceText.length < 2) {
      return noStoreJson(
        {
          ok: false,
          code: 'TRANSLATION_TEXT_TOO_SHORT',
          message:
            'Text na preklad je príliš krátky.',
        },
        400,
      );
    }

    if (sourceText.length > MAX_SOURCE_CHARACTERS) {
      return noStoreJson(
        {
          ok: false,
          code: 'TRANSLATION_SOURCE_TOO_LARGE',
          message:
            'Dokument je príliš rozsiahly na jednu prekladovú požiadavku.',
          detail:
            `Maximálny podporovaný rozsah je ${MAX_SOURCE_CHARACTERS.toLocaleString('sk-SK')} znakov.`,
          maxSourceCharacters:
            MAX_SOURCE_CHARACTERS,
          sourceCharacters:
            sourceText.length,
        },
        413,
      );
    }

    const translationFrom = normalizeLanguage(
      body.translationFrom,
      'sk',
    );

    const translationTo = normalizeLanguage(
      body.translationTo ||
        body.outputLanguage ||
        body.workLanguage,
      'en',
    );

    if (translationFrom === translationTo) {
      return noStoreJson(
        {
          ok: false,
          code: 'TRANSLATION_LANGUAGES_EQUAL',
          message:
            'Zdrojový a cieľový jazyk musia byť rozdielne.',
        },
        400,
      );
    }

    const translationStyle = normalizeStyle(
      body.translationStyle,
    );

    const profile =
      body.activeProfile ||
      body.profile ||
      body.profileSnapshot ||
      null;

    await requireModuleAccess(
      'translation',
    );

    await requirePromptAllowance();

    const pageQuota = await requireAvailablePages();
    const estimatedSourcePages = estimateSourcePages(
      sourceText,
    );

    if (
      !pageQuota.isUnlimited &&
      pageQuota.pagesRemaining !== null &&
      estimatedSourcePages > pageQuota.pagesRemaining
    ) {
      throw new PageLimitError({
        pageLimit: pageQuota.pageLimit,
        pagesUsed: pageQuota.pagesUsed,
        pagesRemaining: pageQuota.pagesRemaining,
        requestedPages: estimatedSourcePages,
      });
    }

    const chunks = splitTranslationSource(sourceText);

    if (chunks.length === 0) {
      return noStoreJson(
        {
          ok: false,
          code: 'TRANSLATION_TEXT_REQUIRED',
          message:
            'Text na preklad neobsahuje použiteľný obsah.',
        },
        400,
      );
    }

    const translatedChunks: string[] = [];
    const finishReasons: Array<string | null> = [];
    let completionTokens = 0;
    let previousSourceContext = '';
    let previousTranslationContext = '';

    for (const chunk of chunks) {
      const translatedChunk = await translateChunk({
        chunk,
        totalChunks: chunks.length,
        from: translationFrom,
        to: translationTo,
        style: translationStyle,
        profile,
        pageQuota,
        previousSourceContext,
        previousTranslationContext,
      });

      translatedChunks.push(translatedChunk.text);
      completionTokens += translatedChunk.completionTokens;
      finishReasons.push(translatedChunk.finishReason);

      previousSourceContext = tail(
        chunk.text,
        CONTINUITY_CONTEXT_CHARACTERS,
      );
      previousTranslationContext = tail(
        translatedChunk.text,
        CONTINUITY_CONTEXT_CHARACTERS,
      );
    }

    const translatedText = cleanText(
      translatedChunks.join('\n\n'),
    );

    if (!translatedText) {
      return noStoreJson(
        {
          ok: false,
          code: 'EMPTY_TRANSLATION_OUTPUT',
          message:
            'AI nevrátila preložený text.',
        },
        502,
      );
    }

    const pageUsage = await consumePagesForOutput({
      text: translatedText,
      module: 'translation',
      requestId,
    });

    const promptUsage = await consumeSuccessfulPrompt();

    const latestEntitlements = await requireModuleAccess(
      'translation',
    );

    return noStoreJson({
      ok: true,
      translatedText,
      translated_text: translatedText,
      translation: translatedText,
      output: translatedText,
      result: translatedText,
      text: translatedText,
      message: translatedText,

      entitlements: serializeEntitlements(
        latestEntitlements,
      ),

      pageUsage,
      pageQuota: serializePageQuota(
        pageUsage,
      ),

      promptUsage,

      meta: {
        requestId,
        model: TRANSLATION_MODEL,
        translationFrom,
        translationTo,
        translationStyle,
        sourceCharacters:
          sourceText.length,
        outputCharacters:
          translatedText.length,
        estimatedSourcePages,
        pagesConsumed:
          pageUsage.consumption
            .pagesConsumed,
        processingStrategy:
          chunks.length > 1
            ? 'chunked-sequential-with-continuity-context'
            : 'single-chunk',
        chunks: {
          count: chunks.length,
          completed: translatedChunks.length,
          targetCharacters:
            TARGET_CHUNK_CHARACTERS,
          maximumCharacters:
            MAX_CHUNK_CHARACTERS,
          completionTokens,
          finishReasons,
        },
        projectId:
          cleanText(
            body.projectId ||
            body.profileId ||
            profile?.id,
          ) || null,
      },
    });
  } catch (error) {
    if (error instanceof TranslationProcessingError) {
      return noStoreJson(
        {
          ok: false,
          code: error.code,
          message: error.message,
          detail: error.detail,
        },
        error.status,
      );
    }

    if (error instanceof EntitlementError) {
      const serialized = entitlementErrorResponse(error);

      return noStoreJson(
        serialized.body as Record<string, unknown>,
        serialized.status,
      );
    }

    if (
      error instanceof PageLimitError ||
      error instanceof PageQuotaUnavailableError
    ) {
      const serialized = pageQuotaErrorResponse(error);

      return noStoreJson(
        serialized.body,
        serialized.status,
      );
    }

    console.error(
      'TRANSLATION_API_ERROR:',
      error,
    );

    return noStoreJson(
      {
        ok: false,
        code: 'TRANSLATION_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Preklad sa nepodarilo vytvoriť.',
      },
      500,
    );
  }
}
