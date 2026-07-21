import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ATTACHMENT_USAGE_TABLE = 'zedpera_attachment_usage_log';

export type AttachmentUsageItem = {
  id?: string | null;
  name?: string | null;
  size?: number | null;
  type?: string | null;
  uploadedAt?: string | null;
};

export type AttachmentUsageSnapshot = {
  attachmentsUsed: number;
  attachmentsAdded: number;
  lastUploadedAt: string | null;
  trackingAvailable: boolean;
};

export type AuthenticatedAttachmentUsageSnapshot =
  AttachmentUsageSnapshot & {
    authenticated: boolean;
  };

function emptySnapshot(
  trackingAvailable = false,
): AttachmentUsageSnapshot {
  return {
    attachmentsUsed: 0,
    attachmentsAdded: 0,
    lastUploadedAt: null,
    trackingAvailable,
  };
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeInteger(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.round(numeric))
    : 0;
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

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logTrackingError('ATTACHMENT_USAGE_AUTH_ERROR:', error);
      return null;
    }

    return user?.id || null;
  } catch (error) {
    logTrackingError('ATTACHMENT_USAGE_AUTH_FATAL_ERROR:', error);
    return null;
  }
}

async function getUsageForUser(
  userId: string,
): Promise<AttachmentUsageSnapshot> {
  try {
    const admin = createAdminClient();

    const countResult = await admin
      .from(ATTACHMENT_USAGE_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countResult.error) {
      logTrackingError(
        'ATTACHMENT_USAGE_COUNT_ERROR:',
        countResult.error,
      );
      return emptySnapshot(false);
    }

    const latestResult = await admin
      .from(ATTACHMENT_USAGE_TABLE)
      .select('created_at')
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

    return {
      attachmentsUsed: countResult.count || 0,
      attachmentsAdded: 0,
      lastUploadedAt:
        cleanText(latestResult.data?.created_at) || null,
      trackingAvailable: true,
    };
  } catch (error) {
    logTrackingError('ATTACHMENT_USAGE_READ_FATAL_ERROR:', error);
    return emptySnapshot(false);
  }
}

export async function getCurrentUserAttachmentUsage(): Promise<AuthenticatedAttachmentUsageSnapshot> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      ...emptySnapshot(false),
      authenticated: false,
    };
  }

  try {
    return {
      ...(await getUsageForUser(userId)),
      authenticated: true,
    };
  } catch (error) {
    logTrackingError('ATTACHMENT_USAGE_GET_FATAL_ERROR:', error);
    return {
      ...emptySnapshot(false),
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
      ...emptySnapshot(false),
      authenticated: false,
    };
  }

  try {
    const safeRequestId = cleanText(requestId);
    const safeItems = Array.isArray(items) ? items : [];
    const uniqueItems = new Map<string, AttachmentUsageItem>();

    safeItems.forEach((item, index) => {
      const name = cleanText(item?.name) || `priloha-${index + 1}`;
      const size = safeInteger(item?.size);
      const suppliedId = cleanText(item?.id);
      const attachmentKey =
        suppliedId ||
        `${safeRequestId || 'request'}|${name}|${size}|${index}`;

      if (!uniqueItems.has(attachmentKey)) {
        uniqueItems.set(attachmentKey, {
          id: suppliedId || null,
          name,
          size,
          type: cleanText(item?.type) || null,
          uploadedAt: cleanText(item?.uploadedAt) || null,
        });
      }
    });

    const expectedCount = Math.max(
      uniqueItems.size,
      safeInteger(fallbackCount),
    );

    for (let index = uniqueItems.size; index < expectedCount; index += 1) {
      uniqueItems.set(
        `${safeRequestId || 'request'}|fallback-${index}`,
        {
          id: null,
          name: `priloha-${index + 1}`,
          size: 0,
          type: null,
          uploadedAt: null,
        },
      );
    }

    if (!safeRequestId || uniqueItems.size === 0) {
      return {
        ...(await getUsageForUser(userId)),
        authenticated: true,
      };
    }

    const admin = createAdminClient();
    const before = await getUsageForUser(userId);

    const rows = Array.from(uniqueItems.entries()).map(
      ([attachmentKey, item], index) => ({
        user_id: userId,
        request_id: safeRequestId,
        attachment_key: attachmentKey,
        file_name:
          cleanText(item.name) || `priloha-${index + 1}`,
        file_size: safeInteger(item.size),
        file_type: cleanText(item.type) || null,
        project_id: cleanText(projectId) || null,
        module: cleanText(module) || 'chat',
        client_uploaded_at:
          cleanText(item.uploadedAt) || null,
      }),
    );

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

    const after = await getUsageForUser(userId);

    return {
      ...after,
      attachmentsAdded: Math.max(
        after.attachmentsUsed - before.attachmentsUsed,
        0,
      ),
      authenticated: true,
    };
  } catch (error) {
    logTrackingError('ATTACHMENT_USAGE_RECORD_FATAL_ERROR:', error);

    return {
      ...emptySnapshot(false),
      authenticated: true,
    };
  }
}
