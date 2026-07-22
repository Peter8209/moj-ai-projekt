import 'server-only';

import { createHash } from 'node:crypto';

import { getCurrentEntitlements } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ATTACHMENT_USAGE_TABLE = 'zedpera_attachment_usage_log';
const DEFAULT_FILE_TYPE = 'application/octet-stream';

/**
 * Vstupný formát zostáva tolerantný kvôli kompatibilite so staršími API
 * routami. Pred zápisom sa každý prijatý súbor normalizuje na povinný
 * StableAttachmentUsageItem so stabilným ID a úplnými metadátami.
 */
export type AttachmentUsageItem = {
  id?: string | null;
  name?: string | null;
  size?: number | null;
  type?: string | null;
  uploadedAt?: string | null;
};

/**
 * Skutočný formát evidovaný systémom.
 *
 * Každá prijatá príloha má vždy:
 * - stabilné ID,
 * - názov,
 * - veľkosť,
 * - MIME typ,
 * - čas prijatia.
 */
export type StableAttachmentUsageItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

export type AttachmentUsageSnapshot = {
  /** Počet jedinečných príloh prijatých systémom. */
  attachmentsUsed: number;

  /** Počet nových jedinečných príloh pridaných týmto zápisom. */
  attachmentsAdded: number;

  /**
   * Obchodný limit príloh.
   * Je vždy identický s totalPageLimit.
   * null znamená iba skutočne neobmedzený účet, napríklad ADMIN.
   */
  attachmentLimit: number | null;

  /** attachmentLimit - attachmentsUsed; nikdy neklesne pod nulu. */
  attachmentsRemaining: number | null;

  /** true, keď používateľ vyčerpal alebo prekročil limit príloh. */
  attachmentLimitReached: boolean;

  /** Skutočne neobmedzený účet. */
  isUnlimited: boolean;

  /** Či sa podarilo načítať totalPageLimit z oprávnení. */
  limitAvailable: boolean;

  /** Čas poslednej prijatej prílohy. */
  lastUploadedAt: string | null;

  /** Či je dostupná databázová evidencia príloh. */
  trackingAvailable: boolean;
};

export type AuthenticatedAttachmentUsageSnapshot =
  AttachmentUsageSnapshot & {
    authenticated: boolean;
  };

type AttachmentLimitContext = {
  attachmentLimit: number | null;
  isUnlimited: boolean;
  limitAvailable: boolean;
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeInteger(value: unknown): number {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? Math.max(0, Math.round(numeric))
    : 0;
}

function safeNullableLimit(value: unknown): number | null {
  if (value === null) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? Math.max(0, Math.floor(numeric))
    : null;
}

function normalizeIsoDate(
  value: unknown,
  fallback = new Date().toISOString(),
): string {
  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  const timestamp = Date.parse(text);

  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : fallback;
}

function hashStableValue(value: string): string {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}

function createGeneratedAttachmentId({
  name,
  size,
  type,
  uploadedAt,
}: {
  name: string;
  size: number;
  type: string;
  uploadedAt: string | null;
}): string {
  /**
   * Veľkosť súboru nemení počet kreditov. Používa sa iba ako súčasť
   * technického odtlačku, keď starší frontend neposlal vlastné stabilné ID.
   * Jeden súbor je vždy presne jedna príloha bez ohľadu na počet bajtov.
   */
  const fingerprint = [
    name.toLocaleLowerCase('en-US'),
    String(size),
    type.toLocaleLowerCase('en-US'),
    uploadedAt || '',
  ].join('|');

  return `att_${hashStableValue(fingerprint).slice(0, 40)}`;
}

function createFallbackAttachmentId({
  requestId,
  index,
}: {
  requestId: string;
  index: number;
}): string {
  return `att_fallback_${hashStableValue(
    `${requestId}|${index}`,
  ).slice(0, 32)}`;
}

function normalizeAttachmentItem({
  item,
  index,
  receivedAt,
}: {
  item: AttachmentUsageItem;
  index: number;
  receivedAt: string;
}): StableAttachmentUsageItem {
  const name = cleanText(item?.name) || `priloha-${index + 1}`;
  const size = safeInteger(item?.size);
  const type = cleanText(item?.type) || DEFAULT_FILE_TYPE;
  const suppliedUploadedAt = cleanText(item?.uploadedAt);
  const uploadedAt = normalizeIsoDate(suppliedUploadedAt, receivedAt);
  const suppliedId = cleanText(item?.id);

  const id =
    suppliedId ||
    createGeneratedAttachmentId({
      name,
      size,
      type,
      uploadedAt: suppliedUploadedAt
        ? uploadedAt
        : null,
    });

  return {
    id,
    name,
    size,
    type,
    uploadedAt,
  };
}

function logTrackingError(label: string, error: unknown) {
  const candidate = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  } | null;

  console.error(label, {
    code: cleanText(candidate?.code),
    message: cleanText(candidate?.message),
    details: cleanText(candidate?.details),
    hint: cleanText(candidate?.hint),
  });
}

function calculateLimitFields({
  attachmentsUsed,
  limitContext,
}: {
  attachmentsUsed: number;
  limitContext: AttachmentLimitContext;
}): Pick<
  AttachmentUsageSnapshot,
  | 'attachmentLimit'
  | 'attachmentsRemaining'
  | 'attachmentLimitReached'
  | 'isUnlimited'
  | 'limitAvailable'
> {
  if (!limitContext.limitAvailable) {
    return {
      attachmentLimit: null,
      attachmentsRemaining: null,
      attachmentLimitReached: false,
      isUnlimited: false,
      limitAvailable: false,
    };
  }

  if (
    limitContext.isUnlimited ||
    limitContext.attachmentLimit === null
  ) {
    return {
      attachmentLimit: null,
      attachmentsRemaining: null,
      attachmentLimitReached: false,
      isUnlimited: true,
      limitAvailable: true,
    };
  }

  const attachmentLimit = Math.max(
    0,
    Math.floor(limitContext.attachmentLimit),
  );

  return {
    attachmentLimit,
    attachmentsRemaining: Math.max(
      attachmentLimit - attachmentsUsed,
      0,
    ),
    attachmentLimitReached:
      attachmentsUsed >= attachmentLimit,
    isUnlimited: false,
    limitAvailable: true,
  };
}

function emptySnapshot({
  trackingAvailable = false,
  limitContext = {
    attachmentLimit: null,
    isUnlimited: false,
    limitAvailable: false,
  },
}: {
  trackingAvailable?: boolean;
  limitContext?: AttachmentLimitContext;
} = {}): AttachmentUsageSnapshot {
  return {
    attachmentsUsed: 0,
    attachmentsAdded: 0,
    ...calculateLimitFields({
      attachmentsUsed: 0,
      limitContext,
    }),
    lastUploadedAt: null,
    trackingAvailable,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logTrackingError(
        'ATTACHMENT_USAGE_AUTH_ERROR:',
        error,
      );
      return null;
    }

    return user?.id || null;
  } catch (error) {
    logTrackingError(
      'ATTACHMENT_USAGE_AUTH_FATAL_ERROR:',
      error,
    );
    return null;
  }
}

async function getCurrentAttachmentLimit(): Promise<AttachmentLimitContext> {
  try {
    const entitlements =
      (await getCurrentEntitlements()) as unknown as Record<
        string,
        unknown
      >;

    const isUnlimited = Boolean(
      entitlements.isAdmin ||
        entitlements.isUnlimited ||
        entitlements.hasUnlimitedAccess,
    );

    if (isUnlimited) {
      return {
        attachmentLimit: null,
        isUnlimited: true,
        limitAvailable: true,
      };
    }

    /**
     * Jediný obchodný zdroj limitu príloh je totalPageLimit.
     * Starý databázový attachment_limit sa tu zámerne nepoužíva.
     * pageLimit je iba kompatibilný názov pre staršiu verziu rovnakého
     * vypočítaného celkového limitu strán.
     */
    const rawTotalPageLimit =
      entitlements.totalPageLimit ??
      entitlements.pageLimit;

    const totalPageLimit = safeNullableLimit(
      rawTotalPageLimit,
    );

    if (totalPageLimit === null) {
      console.error(
        'ATTACHMENT_USAGE_LIMIT_UNAVAILABLE:',
        'Oprávnenia neobsahujú číselný totalPageLimit.',
      );

      return {
        attachmentLimit: null,
        isUnlimited: false,
        limitAvailable: false,
      };
    }

    return {
      attachmentLimit: totalPageLimit,
      isUnlimited: false,
      limitAvailable: true,
    };
  } catch (error) {
    logTrackingError(
      'ATTACHMENT_USAGE_LIMIT_FATAL_ERROR:',
      error,
    );

    return {
      attachmentLimit: null,
      isUnlimited: false,
      limitAvailable: false,
    };
  }
}

async function getUsageForUser(
  userId: string,
  limitContext: AttachmentLimitContext,
): Promise<AttachmentUsageSnapshot> {
  try {
    const admin = createAdminClient();

    /**
     * Každý riadok reprezentuje jednu jedinečnú prílohu. Jedinečnosť je
     * zabezpečená attachment_key a upsert konfliktom
     * user_id,attachment_key.
     */
    const countResult = await admin
      .from(ATTACHMENT_USAGE_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countResult.error) {
      logTrackingError(
        'ATTACHMENT_USAGE_COUNT_ERROR:',
        countResult.error,
      );

      return emptySnapshot({
        trackingAvailable: false,
        limitContext,
      });
    }

    const latestResult = await admin
      .from(ATTACHMENT_USAGE_TABLE)
      .select('client_uploaded_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestResult.error) {
      logTrackingError(
        'ATTACHMENT_USAGE_LATEST_ERROR:',
        latestResult.error,
      );
    }

    const attachmentsUsed = safeInteger(
      countResult.count,
    );

    return {
      attachmentsUsed,
      attachmentsAdded: 0,
      ...calculateLimitFields({
        attachmentsUsed,
        limitContext,
      }),
      lastUploadedAt:
        cleanText(
          latestResult.data?.client_uploaded_at,
        ) ||
        cleanText(latestResult.data?.created_at) ||
        null,
      trackingAvailable: true,
    };
  } catch (error) {
    logTrackingError(
      'ATTACHMENT_USAGE_READ_FATAL_ERROR:',
      error,
    );

    return emptySnapshot({
      trackingAvailable: false,
      limitContext,
    });
  }
}

export async function getCurrentUserAttachmentUsage(): Promise<AuthenticatedAttachmentUsageSnapshot> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      ...emptySnapshot(),
      authenticated: false,
    };
  }

  const limitContext =
    await getCurrentAttachmentLimit();

  try {
    return {
      ...(await getUsageForUser(
        userId,
        limitContext,
      )),
      authenticated: true,
    };
  } catch (error) {
    logTrackingError(
      'ATTACHMENT_USAGE_GET_FATAL_ERROR:',
      error,
    );

    return {
      ...emptySnapshot({
        trackingAvailable: false,
        limitContext,
      }),
      authenticated: true,
    };
  }
}

export async function recordCurrentUserAttachmentUsage({
  requestId,
  projectId,
  module,
  items,
  fallbackCount,
}: {
  requestId: string;
  projectId?: string | null;
  module?: string | null;
  items: AttachmentUsageItem[];
  fallbackCount?: number;
}): Promise<AuthenticatedAttachmentUsageSnapshot> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      ...emptySnapshot(),
      authenticated: false,
    };
  }

  const limitContext =
    await getCurrentAttachmentLimit();

  try {
    const receivedAt = new Date().toISOString();
    const suppliedRequestId = cleanText(requestId);
    const safeItems = Array.isArray(items)
      ? items
      : [];

    /**
     * Map používa stabilné ID súboru. Rovnaký súbor s rovnakým ID sa preto
     * započíta iba raz aj pri opakovanom odoslaní formulára alebo API retry.
     */
    const uniqueItems = new Map<
      string,
      StableAttachmentUsageItem
    >();

    safeItems.forEach((item, index) => {
      const normalized = normalizeAttachmentItem({
        item,
        index,
        receivedAt,
      });

      if (!uniqueItems.has(normalized.id)) {
        uniqueItems.set(normalized.id, normalized);
      }
    });

    const expectedCount = Math.max(
      uniqueItems.size,
      safeInteger(fallbackCount),
    );

    /**
     * fallbackCount sa používa iba vtedy, keď server prijal viac súborov,
     * než koľko kompletných metadát dostal od frontendu. Každý taký súbor
     * dostane deterministické ID viazané na requestId a poradie.
     */
    for (
      let index = uniqueItems.size;
      index < expectedCount;
      index += 1
    ) {
      const fallbackRequestId =
        suppliedRequestId ||
        `request-${hashStableValue(
          `${userId}|${receivedAt}`,
        ).slice(0, 24)}`;

      const id = createFallbackAttachmentId({
        requestId: fallbackRequestId,
        index,
      });

      if (!uniqueItems.has(id)) {
        uniqueItems.set(id, {
          id,
          name: `priloha-${index + 1}`,
          size: 0,
          type: DEFAULT_FILE_TYPE,
          uploadedAt: receivedAt,
        });
      }
    }

    if (uniqueItems.size === 0) {
      return {
        ...(await getUsageForUser(
          userId,
          limitContext,
        )),
        authenticated: true,
      };
    }

    const effectiveRequestId =
      suppliedRequestId ||
      `request-${hashStableValue(
        [
          userId,
          ...Array.from(uniqueItems.keys()).sort(),
        ].join('|'),
      ).slice(0, 32)}`;

    const admin = createAdminClient();
    const before = await getUsageForUser(
      userId,
      limitContext,
    );

    const rows = Array.from(
      uniqueItems.values(),
    ).map((item) => ({
      user_id: userId,
      request_id: effectiveRequestId,

      /**
       * attachment_key je stabilné ID prílohy. Konflikt na
       * user_id,attachment_key zabráni dvojitému započítaniu.
       */
      attachment_key: item.id,
      file_name: item.name,
      file_size: item.size,
      file_type: item.type,
      project_id: cleanText(projectId) || null,
      module: cleanText(module) || 'chat',
      client_uploaded_at: item.uploadedAt,
    }));

    const insertResult = await admin
      .from(ATTACHMENT_USAGE_TABLE)
      .upsert(rows, {
        onConflict: 'user_id,attachment_key',
        ignoreDuplicates: true,
      });

    if (insertResult.error) {
      logTrackingError(
        'ATTACHMENT_USAGE_UPSERT_ERROR:',
        insertResult.error,
      );

      return {
        ...before,
        authenticated: true,
        trackingAvailable: false,
      };
    }

    const after = await getUsageForUser(
      userId,
      limitContext,
    );

    return {
      ...after,
      attachmentsAdded: Math.max(
        after.attachmentsUsed -
          before.attachmentsUsed,
        0,
      ),
      authenticated: true,
    };
  } catch (error) {
    logTrackingError(
      'ATTACHMENT_USAGE_RECORD_FATAL_ERROR:',
      error,
    );

    return {
      ...emptySnapshot({
        trackingAvailable: false,
        limitContext,
      }),
      authenticated: true,
    };
  }
}

/**
 * Zámerne neexistuje funkcia na odpočítanie alebo vymazanie spotreby.
 * Odstránenie prílohy z formulára kredit nevracia, pretože systém už súbor
 * prijal a zaevidoval.
 */
