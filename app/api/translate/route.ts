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

function getTranslationSource(
  body: TranslationRequest,
): string {
  const directInput = cleanText(body.input);

  if (directInput) {
    return directInput;
  }

  const attachmentInput =
    cleanText(body.clientExtractedText) ||
    cleanText(body.extractedText) ||
    cleanText(body.attachmentText);

  if (attachmentInput) {
    return attachmentInput;
  }

  const text = cleanText(body.text);
  const prompt = cleanText(body.prompt);

  /**
   * Frontend pri chýbajúcom texte môže do poľa text vložiť celý technický
   * prompt. Ten sa nesmie omylom prekladať ako používateľský obsah.
   */
  if (text && text !== prompt) {
    return text;
  }

  const message = cleanText(body.message);

  if (message && message !== prompt) {
    return message;
  }

  return '';
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

function buildTranslationPrompt({
  sourceText,
  from,
  to,
  style,
  profile,
}: {
  sourceText: string;
  from: LanguageCode;
  to: LanguageCode;
  style: TranslationStyle;
  profile?: SavedProfile | null;
}): string {
  return `
PREKLADOVÁ ÚLOHA

Zdrojový jazyk: ${LANGUAGE_LABELS[from]}
Cieľový jazyk: ${LANGUAGE_LABELS[to]}
Požadovaný štýl: ${STYLE_LABELS[style]}

KONTEXT PRÁCE
${buildProfileContext(profile)}

TEXT NA PREKLAD
<<<START_TEXT>>>
${sourceText}
<<<END_TEXT>>>

PRÍSNE PRAVIDLÁ
- Prelož celý obsah medzi značkami START_TEXT a END_TEXT.
- Vráť iba samotný preložený text.
- Nepridávaj nadpis „Preklad“ ani „Preložený text“.
- Nepridávaj vysvetlenie, komentár, hodnotenie, analýzu ani odporúčania.
- Zachovaj význam, členenie odsekov, číslovanie, citácie, odkazy, DOI, URL,
  názvy premenných, skratky a odborné označenia.
- Mená osôb, názvy organizácií a bibliografické údaje neupravuj, pokiaľ
  nemajú zaužívaný ekvivalent v cieľovom jazyku.
- Nevymýšľaj žiadne nové údaje.
- Nepoužívaj markdownové nadpisy ani kódové bloky.
- Začni priamo prvým slovom preloženého textu.
`.trim();
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

    const requestId =
      normalizeRequestId(
        body.requestId ||
        request.headers.get(
          'x-request-id',
        ),
      );

    const sourceText =
      getTranslationSource(body);

    if (!sourceText) {
      return noStoreJson(
        {
          ok: false,
          code:
            'TRANSLATION_TEXT_REQUIRED',
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
          code:
            'TRANSLATION_TEXT_TOO_SHORT',
          message:
            'Text na preklad je príliš krátky.',
        },
        400,
      );
    }

    const translationFrom =
      normalizeLanguage(
        body.translationFrom,
        'sk',
      );

    const translationTo =
      normalizeLanguage(
        body.translationTo ||
        body.outputLanguage ||
        body.workLanguage,
        'en',
      );

    if (
      translationFrom ===
      translationTo
    ) {
      return noStoreJson(
        {
          ok: false,
          code:
            'TRANSLATION_LANGUAGES_EQUAL',
          message:
            'Zdrojový a cieľový jazyk musia byť rozdielne.',
        },
        400,
      );
    }

    const translationStyle =
      normalizeStyle(
        body.translationStyle,
      );

    const profile =
      body.activeProfile ||
      body.profile ||
      body.profileSnapshot ||
      null;

    const entitlements =
      await requireModuleAccess(
        'translation',
      );

    await requirePromptAllowance();

    const pageQuota =
      await requireAvailablePages();

    const requestedTokenLimit =
      Math.min(
        Math.max(
          Math.ceil(
            sourceText.length / 3,
          ),
          700,
        ),
        12_000,
      );

    const maxOutputTokens =
      getOutputTokenLimitForQuota(
        pageQuota,
        requestedTokenLimit,
      );

    if (maxOutputTokens <= 0) {
      throw new PageLimitError({
        pageLimit:
          pageQuota.pageLimit,
        pagesUsed:
          pageQuota.pagesUsed,
        pagesRemaining:
          pageQuota.pagesRemaining,
        requestedPages: 1,
      });
    }

    const prompt =
      buildTranslationPrompt({
        sourceText,
        from: translationFrom,
        to: translationTo,
        style: translationStyle,
        profile,
      });

    const completion =
      await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
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
              'Dodržiavaj cieľový jazyk, odbornú terminológiu a formát pôvodného textu.',
              'V odpovedi vráť výhradne preložený text.',
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

    const translatedText =
      cleanText(
        completion.choices[0]
          ?.message?.content,
      );

    if (!translatedText) {
      return noStoreJson(
        {
          ok: false,
          code:
            'EMPTY_TRANSLATION_OUTPUT',
          message:
            'AI nevrátila preložený text.',
        },
        502,
      );
    }

    /**
     * Strany aj prompt sa odpočítajú až po úspešnom vygenerovaní.
     * requestId musí pri retry zostať rovnaký, aby stránková RPC funkcia
     * nezapočítala tú istú generáciu dvakrát.
     */
    const pageUsage =
      await consumePagesForOutput({
        text: translatedText,
        module: 'translation',
        requestId,
      });

    const promptUsage =
      await consumeSuccessfulPrompt();

    const latestEntitlements =
      await requireModuleAccess(
        'translation',
      );

    return noStoreJson({
      ok: true,

      /**
       * Frontend podporuje všetky tieto názvy. Autoritatívne pole je
       * translatedText; ostatné sú kompatibilné aliasy.
       */
      translatedText,
      translated_text:
        translatedText,
      translation:
        translatedText,
      output: translatedText,
      result: translatedText,
      text: translatedText,
      message: translatedText,

      entitlements:
        serializeEntitlements(
          latestEntitlements,
        ),

      pageUsage,
      pageQuota:
        serializePageQuota(
          pageUsage,
        ),

      promptUsage,

      meta: {
        requestId,
        model: 'gpt-4.1-mini',
        translationFrom,
        translationTo,
        translationStyle,
        sourceCharacters:
          sourceText.length,
        outputCharacters:
          translatedText.length,
        pagesConsumed:
          pageUsage.consumption
            .pagesConsumed,
        projectId:
          cleanText(
            body.projectId ||
            body.profileId ||
            profile?.id,
          ) || null,
      },
    });
  } catch (error) {
    if (
      error instanceof
      EntitlementError
    ) {
      const serialized =
        entitlementErrorResponse(error);

      return noStoreJson(
        serialized.body as
          Record<string, unknown>,
        serialized.status,
      );
    }

    if (
      error instanceof
        PageLimitError ||
      error instanceof
        PageQuotaUnavailableError
    ) {
      const serialized =
        pageQuotaErrorResponse(error);

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
