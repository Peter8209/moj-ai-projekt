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

type EmailType =
  | 'supervisor'
  | 'teacher'
  | 'consultation'
  | 'deadline'
  | 'request'
  | 'apology'
  | 'business'
  | 'other';

type EmailTone =
  | 'professional'
  | 'formal'
  | 'friendly'
  | 'polite'
  | 'urgent'
  | 'short';

type SavedProfile = {
  id?: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  expertise?: string;
  workExpertise?: string;
  specializationLevel?: string;
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
  keywords?: string[];
  keywordsList?: string[];
};

type EmailRequest = {
  requestId?: string;

  input?: string;
  text?: string;
  message?: string;
  question?: string;
  prompt?: string;
  instruction?: string;
  secondaryInput?: string;

  emailType?: string;
  emailTone?: string;
  emailTypeLabel?: string;
  emailToneLabel?: string;

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

  moduleSettings?: {
    emailType?: string;
    emailTone?: string;
  };
};

const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  supervisor: 'email vedúcemu práce alebo školiteľovi',
  teacher: 'email vyučujúcemu',
  consultation: 'žiadosť o konzultáciu',
  deadline: 'email k termínu alebo odovzdaniu práce',
  request: 'formálna žiadosť',
  apology: 'profesionálne ospravedlnenie',
  business: 'obchodný email',
  other: 'iný profesionálny email',
};

const EMAIL_TONE_LABELS: Record<EmailTone, string> = {
  professional: 'profesionálny a reprezentatívny',
  formal: 'formálny a úradný',
  friendly: 'priateľský, ale stále slušný',
  polite: 'zdvorilý a rešpektujúci',
  urgent: 'dôrazný a urgentný, bez nevhodného nátlaku',
  short: 'krátky, vecný a bez zbytočností',
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

function normalizeRequestId(
  value: unknown,
): string {
  const normalized = cleanText(value)
    .replace(/[^a-zA-Z0-9._:-]/g, '')
    .slice(0, 255);

  return normalized ||
    `emails-${crypto.randomUUID()}`;
}

function normalizeEmailType(
  value: unknown,
): EmailType {
  const normalized = cleanText(value)
    .toLowerCase();

  if (
    normalized === 'teacher' ||
    normalized === 'consultation' ||
    normalized === 'deadline' ||
    normalized === 'request' ||
    normalized === 'apology' ||
    normalized === 'business' ||
    normalized === 'other'
  ) {
    return normalized;
  }

  return 'supervisor';
}

function normalizeEmailTone(
  value: unknown,
): EmailTone {
  const normalized = cleanText(value)
    .toLowerCase();

  if (
    normalized === 'formal' ||
    normalized === 'friendly' ||
    normalized === 'polite' ||
    normalized === 'urgent' ||
    normalized === 'short'
  ) {
    return normalized;
  }

  return 'professional';
}

function normalizeOutputLanguage(
  value: unknown,
): string {
  const normalized = cleanText(value)
    .toLowerCase();

  const aliases: Record<string, string> = {
    sk: 'slovenčina',
    slovak: 'slovenčina',
    slovencina: 'slovenčina',
    slovenčina: 'slovenčina',

    cs: 'čeština',
    cz: 'čeština',
    czech: 'čeština',
    cestina: 'čeština',
    čeština: 'čeština',

    en: 'angličtina',
    english: 'angličtina',
    anglictina: 'angličtina',
    angličtina: 'angličtina',

    de: 'nemčina',
    german: 'nemčina',
    nemcina: 'nemčina',
    nemčina: 'nemčina',

    pl: 'poľština',
    polish: 'poľština',
    polstina: 'poľština',
    poľština: 'poľština',

    hu: 'maďarčina',
    hungarian: 'maďarčina',
    madarcina: 'maďarčina',
    maďarčina: 'maďarčina',
  };

  return aliases[normalized] ||
    cleanText(value) ||
    'slovenčina';
}

function getEmailAssignment(
  body: EmailRequest,
): string {
  const directInput = cleanText(body.input);

  if (directInput) {
    return directInput;
  }

  const secondaryInput =
    cleanText(body.secondaryInput);

  if (secondaryInput) {
    return secondaryInput;
  }

  const prompt = cleanText(body.prompt);

  for (const candidate of [
    body.message,
    body.question,
    body.text,
    body.instruction,
  ]) {
    const value = cleanText(candidate);

    if (value && value !== prompt) {
      return value;
    }
  }

  /**
   * Posledný fallback je prompt vytvorený frontendovým modulom.
   * Použije sa iba vtedy, keď používateľ neposlal samostatné input pole.
   */
  return prompt;
}

function getKeywords(
  profile?: SavedProfile | null,
): string {
  const values = Array.isArray(profile?.keywords)
    ? profile.keywords
    : Array.isArray(profile?.keywordsList)
      ? profile.keywordsList
      : [];

  return values
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(', ');
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
    `Vedúci/školiteľ: ${cleanText(profile.supervisor) || 'nezadané'}`,
    `Cieľ práce: ${cleanText(profile.goal) || 'nezadané'}`,
    `Metodológia: ${cleanText(profile.methodology) || 'nezadané'}`,
    `Kľúčové slová: ${getKeywords(profile) || 'nezadané'}`,
  ].join('\n');
}

function buildEmailPrompt({
  assignment,
  emailType,
  emailTone,
  outputLanguage,
  profile,
}: {
  assignment: string;
  emailType: EmailType;
  emailTone: EmailTone;
  outputLanguage: string;
  profile?: SavedProfile | null;
}): string {
  return `
ÚLOHA
Vytvor hotový profesionálny email podľa zadania používateľa.

JAZYK EMAILU
${outputLanguage}

TYP EMAILU
${EMAIL_TYPE_LABELS[emailType]}

TÓN EMAILU
${EMAIL_TONE_LABELS[emailTone]}

KONTEXT AKTÍVNEJ PRÁCE
${buildProfileContext(profile)}

ZADANIE POUŽÍVATEĽA
<<<START_ASSIGNMENT>>>
${assignment}
<<<END_ASSIGNMENT>>>

PRÍSNE PRAVIDLÁ
- Vráť iba hotový email.
- Výstup musí byť v jazyku: ${outputLanguage}.
- Nepridávaj analýzu, vysvetlenie postupu, skóre ani odporúčania.
- Nepíš úvod typu „Tu je návrh emailu“.
- Nevymýšľaj mená, termíny, čísla, prílohy ani fakty, ktoré používateľ nezadal.
- Ak chýba konkrétny údaj, použi prirodzenú neutrálnu formuláciu alebo
  vhodnú hranatú zástupnú hodnotu, napríklad [meno], [termín], [názov práce].
- Nepíš, že bol priložený súbor. Emailový modul prílohy nepoužíva.
- Zachovaj profesionálnu, zdvorilú a prakticky použiteľnú komunikáciu.
- Nepoužívaj markdownové nadpisy, hviezdičky ani kódové bloky.

POVINNÝ FORMÁT
Predmet: stručný a konkrétny predmet

Text emailu:
oslovenie

jadro emailu v primeraných odsekoch

záver a pozdrav
`.trim();
}

function normalizeGeneratedEmail(
  value: unknown,
): string {
  const cleaned = cleanText(value)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(
      /^\s*(?:Tu je|Nižšie je)\s+(?:návrh\s+)?(?:profesionálneho\s+)?emailu\s*[:\-–—]*\s*/i,
      '',
    )
    .trim();

  return cleaned;
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
        | EmailRequest
        | null;

    if (!body) {
      return noStoreJson(
        {
          ok: false,
          code: 'INVALID_JSON',
          message:
            'Požiadavku emailového modulu nebolo možné prečítať.',
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

    const assignment =
      getEmailAssignment(body);

    if (!assignment) {
      return noStoreJson(
        {
          ok: false,
          code: 'EMAIL_ASSIGNMENT_REQUIRED',
          message:
            'Najprv napíšte, komu má byť email určený a čo má obsahovať.',
        },
        400,
      );
    }

    if (assignment.length < 3) {
      return noStoreJson(
        {
          ok: false,
          code: 'EMAIL_ASSIGNMENT_TOO_SHORT',
          message:
            'Zadanie pre email je príliš krátke.',
        },
        400,
      );
    }

    const emailType =
      normalizeEmailType(
        body.emailType ||
        body.moduleSettings?.emailType,
      );

    const emailTone =
      normalizeEmailTone(
        body.emailTone ||
        body.moduleSettings?.emailTone,
      );

    const profile =
      body.activeProfile ||
      body.profile ||
      body.profileSnapshot ||
      null;

    const outputLanguage =
      normalizeOutputLanguage(
        body.outputLanguage ||
        body.workLanguage ||
        body.language ||
        profile?.workLanguage ||
        profile?.language ||
        body.systemLanguage,
      );

    const entitlements =
      await requireModuleAccess(
        'emails',
      );

    await requirePromptAllowance();

    const pageQuota =
      await requireAvailablePages();

    const requestedTokenLimit = 1_600;

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
      buildEmailPrompt({
        assignment,
        emailType,
        emailTone,
        outputLanguage,
        profile,
      });

    const completion =
      await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        temperature:
          emailTone === 'formal' ||
          emailTone === 'professional'
            ? 0.25
            : 0.35,
        max_tokens: maxOutputTokens,
        messages: [
          {
            role: 'system',
            content: [
              String(
                GLOBAL_ACADEMIC_SYSTEM_PROMPT ||
                '',
              ).trim(),
              'Si profesionálny autor akademickej, administratívnej a obchodnej emailovej komunikácie.',
              'Vytváraš iba hotový email bez vysvetľovania postupu.',
              'Emailový modul nepoužíva prílohy a nesmie tvrdiť, že niečo prikladá.',
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

    const generatedEmail =
      normalizeGeneratedEmail(
        completion.choices[0]
          ?.message?.content,
      );

    if (!generatedEmail) {
      return noStoreJson(
        {
          ok: false,
          code: 'EMPTY_EMAIL_OUTPUT',
          message:
            'AI nevrátila vygenerovaný email.',
        },
        502,
      );
    }

    const pageUsage =
      await consumePagesForOutput({
        text: generatedEmail,
        module: 'emails',
        requestId,
      });

    const promptUsage =
      await consumeSuccessfulPrompt();

    const latestEntitlements =
      await requireModuleAccess(
        'emails',
      );

    return noStoreJson({
      ok: true,

      /**
       * emailText je autoritatívne pole.
       * Ostatné názvy sú kompatibilné aliasy pre staršie frontendy.
       */
      emailText: generatedEmail,
      email_text: generatedEmail,
      generatedEmail,
      generated_email:
        generatedEmail,
      email: generatedEmail,

      output: generatedEmail,
      result: generatedEmail,
      text: generatedEmail,
      message: generatedEmail,
      content: generatedEmail,

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
        emailType,
        emailTone,
        outputLanguage,
        inputCharacters:
          assignment.length,
        outputCharacters:
          generatedEmail.length,
        pagesConsumed:
          pageUsage.consumption
            .pagesConsumed,
        projectId:
          cleanText(
            body.projectId ||
            body.profileId ||
            profile?.id,
          ) || null,
        attachmentsAccepted: 0,
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
      'EMAIL_WRITE_API_ERROR:',
      error,
    );

    return noStoreJson(
      {
        ok: false,
        code: 'EMAIL_GENERATION_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Email sa nepodarilo vygenerovať.',
      },
      500,
    );
  }
}
